import { useEffect, useMemo, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel"
import { getAdminCategories } from "../../../services/api/adminCategoryService"
import {
  createAdminFamily,
  deleteAdminFamily,
  getAdminFamilies,
  getAdminFamily,
  updateAdminFamily,
  updateAdminFamilyStatus,
} from "../../../services/api/adminFamilyService"
import { notifyError, notifySuccess } from "../../../utils/toast"
import AdminTranslationsFields from "../../components/AdminTranslationsFields/AdminTranslationsFields"
import useAdminLocalization from "../../hooks/useAdminLocalization"
import {
  compactTranslations,
  normalizeTranslations,
  setTranslationValue,
} from "../../utils/adminTranslations"
import "./FamiliesPage.css"

const INITIAL_FORM = {
  id: null,
  category_id: "",
  name: "",
  slug: "",
  is_active: true,
  translations: {},
  products_count: 0,
  category: null,
}

function FamiliesPage() {
  const [families, setFamilies] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState("create")
  const [panelLoading, setPanelLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [filters, setFilters] = useState({
    search: "",
    category_id: "",
    is_active: "",
    sort_by: "name_asc",
    page: 1,
    per_page: 15,
  })
  const { activeLocales } = useAdminLocalization()
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
    from: 0,
    to: 0,
  })

  const canSubmit = useMemo(() => {
    return Boolean(form.category_id) && form.name.trim().length > 0
  }, [form.category_id, form.name])

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchFamilies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.per_page, filters.category_id, filters.is_active, filters.sort_by])

  async function fetchCategories() {
    try {
      setCategoriesLoading(true)
      const response = await getAdminCategories({
        is_active: true,
        per_page: 100,
        sort_by: "name_asc",
      })

      setCategories(normalizeCategories(response))
    } catch (error) {
      console.error("Error al cargar categorías:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar las categorías.")
    } finally {
      setCategoriesLoading(false)
    }
  }

  async function fetchFamilies(customSearch = null) {
    try {
      setLoading(true)
      const searchValue = customSearch !== null ? customSearch : filters.search
      const params = {
        page: filters.page,
        per_page: filters.per_page,
        sort_by: filters.sort_by,
      }

      if (searchValue.trim()) params.search = searchValue.trim()
      if (filters.category_id) params.category_id = filters.category_id
      if (filters.is_active !== "") params.is_active = filters.is_active

      const response = await getAdminFamilies(params)
      const items = Array.isArray(response?.data) ? response.data.map(normalizeFamily) : []
      const meta = response?.meta || {}

      setFamilies(items)
      setPagination({
        current_page: Number(meta.current_page || 1),
        last_page: Number(meta.last_page || 1),
        per_page: Number(meta.per_page || filters.per_page),
        total: Number(meta.total || items.length),
        from: Number(meta.from || (items.length ? 1 : 0)),
        to: Number(meta.to || items.length),
      })
    } catch (error) {
      console.error("Error al cargar familias:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar las familias.")
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange(event) {
    const { name, value } = event.target

    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: name === "page" ? Number(value) : 1,
    }))
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    setFilters((prev) => ({ ...prev, page: 1 }))
    fetchFamilies(filters.search)
  }

  function handleClearFilters() {
    const nextFilters = {
      search: "",
      category_id: "",
      is_active: "",
      sort_by: "name_asc",
      page: 1,
      per_page: filters.per_page,
    }

    setFilters(nextFilters)
    fetchFamilies("")
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > pagination.last_page) return
    setFilters((prev) => ({ ...prev, page: nextPage }))
  }

  function openCreatePanel() {
    setPanelMode("create")
    setForm(INITIAL_FORM)
    setPanelOpen(true)
  }

  async function openEditPanel(familyId) {
    try {
      setPanelMode("edit")
      setPanelOpen(true)
      setPanelLoading(true)
      const response = await getAdminFamily(familyId)
      const family = normalizeFamily(response?.data || response)

      setForm({
        ...INITIAL_FORM,
        ...family,
        category_id: family.category_id || "",
      })
    } catch (error) {
      console.error("Error al cargar familia:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar la familia.")
      setPanelOpen(false)
    } finally {
      setPanelLoading(false)
    }
  }

  function closePanel() {
    if (saving) return
    setPanelOpen(false)
    setForm(INITIAL_FORM)
  }

  function handleFormChange(event) {
    const { name, value, checked, type } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  function handleTranslationChange(field, locale, value) {
    setForm((prev) => ({
      ...prev,
      translations: setTranslationValue(prev.translations, field, locale, value),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!canSubmit) {
      notifyError("Selecciona una categoría y escribe el nombre de la familia.")
      return
    }

    try {
      setSaving(true)
      const payload = buildFamilyPayload(form)
      const response = panelMode === "create"
        ? await createAdminFamily(payload)
        : await updateAdminFamily(form.id, payload)

      notifySuccess(response?.message || (panelMode === "create" ? "Familia creada." : "Familia actualizada."))
      setPanelOpen(false)
      setForm(INITIAL_FORM)
      fetchFamilies()
    } catch (error) {
      console.error("Error al guardar familia:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar la familia.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(family, nextStatus) {
    try {
      setActionLoadingId(family.id)
      await updateAdminFamilyStatus(family.id, nextStatus)
      setFamilies((prev) =>
        prev.map((item) => item.id === family.id ? { ...item, is_active: nextStatus } : item)
      )
      notifySuccess("Estado actualizado.")
    } catch (error) {
      console.error("Error al actualizar estado:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el estado.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleDelete(family) {
    if (!window.confirm(`¿Desactivar la familia "${family.name}"?`)) return

    try {
      setActionLoadingId(family.id)
      await deleteAdminFamily(family.id)
      setFamilies((prev) =>
        prev.map((item) => item.id === family.id ? { ...item, is_active: false } : item)
      )
      notifySuccess("Familia desactivada.")
    } catch (error) {
      console.error("Error al desactivar familia:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible desactivar la familia.")
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <>
      <AdminCard
        title="Familias"
        subtitle="Administra familias del catálogo vinculadas a una categoría."
        right={
          <button type="button" className="btn btn-primary" onClick={openCreatePanel}>
            <i className="bi bi-plus-lg" aria-hidden="true" />{" "}
            Nueva familia
          </button>
        }
      >
        <div className="families-page">
          <form className="families-page__filters" onSubmit={handleSearchSubmit}>
            <label>
              <span>Buscar</span>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Nombre o slug..."
              />
            </label>

            <label>
              <span>Categoría</span>
              <select name="category_id" value={filters.category_id} onChange={handleFilterChange}>
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Estado</span>
              <select name="is_active" value={filters.is_active} onChange={handleFilterChange}>
                <option value="">Todos</option>
                <option value="true">Activas</option>
                <option value="false">Inactivas</option>
              </select>
            </label>

            <label>
              <span>Orden</span>
              <select name="sort_by" value={filters.sort_by} onChange={handleFilterChange}>
                <option value="name_asc">Nombre A-Z</option>
                <option value="name_desc">Nombre Z-A</option>
                <option value="latest">Más recientes</option>
                <option value="oldest">Más antiguas</option>
              </select>
            </label>

            <label>
              <span>Mostrar</span>
              <select name="per_page" value={filters.per_page} onChange={handleFilterChange}>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </label>

            <div className="families-page__filter-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Buscar
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={handleClearFilters}>
                Limpiar
              </button>
            </div>
          </form>

          <div className="families-page__summary">
            {loading ? (
              <span>Cargando familias...</span>
            ) : (
              <span>
                Mostrando <strong>{pagination.from || 0}</strong> - <strong>{pagination.to || 0}</strong> de{" "}
                <strong>{pagination.total}</strong> familias
              </span>
            )}
          </div>

          <div className="families-table">
            <div className="families-table__head">
              <span>Familia</span>
              <span>Categoría</span>
              <span>Productos</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>

            <div className="families-table__body">
              {loading ? (
                <div className="families-table__empty">Cargando información...</div>
              ) : families.length ? (
                families.map((family) => (
                  <div
                    className="families-table__row"
                    key={family.id}
                    onClick={() => openEditPanel(family.id)}
                  >
                    <strong>
                      {family.name}
                      <small>{family.slug || "-"}</small>
                    </strong>
                    <span>{family.category?.name || "-"}</span>
                    <span>{formatNumber(family.products_count)}</span>
                    <span className={`families-status ${family.is_active ? "is-active" : "is-inactive"}`}>
                      {family.is_active ? "Activa" : "Inactiva"}
                    </span>
                    <span className="families-table__actions" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className={`families-icon-action ${family.is_active ? "is-warning" : "is-success"}`}
                        onClick={() => handleStatusChange(family, !family.is_active)}
                        disabled={actionLoadingId === family.id}
                        title={family.is_active ? "Desactivar" : "Activar"}
                        aria-label={family.is_active ? "Desactivar familia" : "Activar familia"}
                      >
                        <i className={`bi ${family.is_active ? "bi-toggle-on" : "bi-toggle-off"}`} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="families-icon-action is-danger"
                        onClick={() => handleDelete(family)}
                        disabled={actionLoadingId === family.id}
                        title="Desactivar"
                        aria-label="Desactivar familia"
                      >
                        <i className="bi bi-trash3" aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                ))
              ) : (
                <div className="families-table__empty">No se encontraron familias.</div>
              )}
            </div>
          </div>

          {pagination.last_page > 1 ? (
            <div className="families-page__pagination">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={pagination.current_page <= 1 || loading}
              >
                Anterior
              </button>
              <span>Página {pagination.current_page} de {pagination.last_page}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={pagination.current_page >= pagination.last_page || loading}
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </div>
      </AdminCard>

      <AdminSidePanel
        isOpen={panelOpen}
        title={panelMode === "create" ? "Nueva familia" : "Detalle de familia"}
        subtitle="Una familia siempre debe pertenecer a una categoría."
        onClose={closePanel}
        closeDisabled={saving}
        footer={
          <div className="families-panel__footer">
            <button type="button" className="btn btn-outline-secondary" onClick={closePanel} disabled={saving}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving || panelLoading || !canSubmit}>
              {saving ? "Guardando..." : "Guardar familia"}
            </button>
          </div>
        }
      >
        {panelLoading ? (
          <div className="families-panel__loading">Cargando familia...</div>
        ) : (
          <form className="families-panel" onSubmit={handleSubmit}>
            <section className="families-panel__grid">
              <label className="families-panel__full">
                <span>Categoría *</span>
                <select name="category_id" value={form.category_id} onChange={handleFormChange} disabled={categoriesLoading}>
                  <option value="">{categoriesLoading ? "Cargando categorías..." : "Selecciona una categoría"}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Nombre *</span>
                <input name="name" value={form.name} onChange={handleFormChange} placeholder="Playeras" />
              </label>
              <label>
                <span>Slug</span>
                <input name="slug" value={form.slug} onChange={handleFormChange} placeholder="se-genera-si-lo-dejas-vacio" />
              </label>
              <label className="families-panel__switch">
                <input type="checkbox" name="is_active" checked={Boolean(form.is_active)} onChange={handleFormChange} />
                <span>Familia activa</span>
              </label>
            </section>

            <AdminTranslationsFields
              locales={activeLocales}
              translations={form.translations}
              fields={[
                {
                  name: "name",
                  label: "Nombre",
                  placeholder: "Nombre traducido de la familia",
                },
              ]}
              onChange={handleTranslationChange}
            />

            {panelMode === "edit" ? (
              <section className="families-panel__meta">
                <div>
                  <span>Productos relacionados</span>
                  <strong>{formatNumber(form.products_count)}</strong>
                </div>
                <div>
                  <span>Categoría actual</span>
                  <strong>{form.category?.name || "-"}</strong>
                </div>
              </section>
            ) : null}
          </form>
        )}
      </AdminSidePanel>
    </>
  )
}

function buildFamilyPayload(form) {
  return {
    category_id: Number(form.category_id),
    name: form.name.trim(),
    slug: form.slug.trim() || null,
    is_active: Boolean(form.is_active),
    translations: compactTranslations(form.translations),
  }
}

function normalizeCategories(response) {
  const data = response?.data?.data || response?.data || response || []
  return Array.isArray(data)
    ? data.map((category) => ({
        id: Number(category.id),
        name: category.name || `Categoría #${category.id}`,
      }))
    : []
}

function normalizeFamily(family) {
  return {
    ...family,
    id: Number(family.id),
    category_id: family.category_id ? Number(family.category_id) : "",
    name: family.name || "",
    slug: family.slug || "",
    is_active: Boolean(family.is_active),
    translations: normalizeTranslations(family.translations),
    products_count: Number(family.products_count || 0),
    category: family.category || null,
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-MX").format(Number(value || 0))
}

export default FamiliesPage
