import { useEffect, useMemo, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel"
import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  getAdminCategory,
  updateAdminCategory,
  updateAdminCategoryStatus,
} from "../../../services/api/adminCategoryService"
import { notifyError, notifySuccess } from "../../../utils/toast"
import { normalizeMediaUrl } from "../../../utils/mediaUrl"
import AdminTranslationsFields from "../../components/AdminTranslationsFields/AdminTranslationsFields"
import useAdminLocalization from "../../hooks/useAdminLocalization"
import {
  appendTranslationsToFormData,
  compactTranslations,
  normalizeTranslations,
  setTranslationValue,
} from "../../utils/adminTranslations"
import "./CategoriesPage.css"

const CATEGORY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const CATEGORY_IMAGE_MAX_SIZE = 4 * 1024 * 1024

const INITIAL_FORM = {
  id: null,
  name: "",
  slug: "",
  code: "",
  image: null,
  image_url: "",
  image_path: "",
  remove_image: false,
  is_active: true,
  translations: {},
  products_count: 0,
  families_count: 0,
  families: [],
}

function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState("create")
  const [panelLoading, setPanelLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [imagePreview, setImagePreview] = useState("")
  const [filters, setFilters] = useState({
    search: "",
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

  const canSubmit = useMemo(() => form.name.trim().length > 0, [form.name])

  useEffect(() => {
    if (!form.image) {
      setImagePreview("")
      return undefined
    }

    const previewUrl = URL.createObjectURL(form.image)
    setImagePreview(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [form.image])

  useEffect(() => {
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.per_page, filters.is_active, filters.sort_by])

  async function fetchCategories(customSearch = null) {
    try {
      setLoading(true)
      const searchValue = customSearch !== null ? customSearch : filters.search
      const params = {
        page: filters.page,
        per_page: filters.per_page,
        sort_by: filters.sort_by,
      }

      if (searchValue.trim()) params.search = searchValue.trim()
      if (filters.is_active !== "") params.is_active = filters.is_active

      const response = await getAdminCategories(params)
      const items = Array.isArray(response?.data) ? response.data.map(normalizeCategory) : []
      const meta = response?.meta || {}

      setCategories(items)
      setPagination({
        current_page: Number(meta.current_page || 1),
        last_page: Number(meta.last_page || 1),
        per_page: Number(meta.per_page || filters.per_page),
        total: Number(meta.total || items.length),
        from: Number(meta.from || (items.length ? 1 : 0)),
        to: Number(meta.to || items.length),
      })
    } catch (error) {
      console.error("Error al cargar categorías:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar las categorías.")
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
    fetchCategories(filters.search)
  }

  function handleClearFilters() {
    const nextFilters = {
      search: "",
      is_active: "",
      sort_by: "name_asc",
      page: 1,
      per_page: filters.per_page,
    }

    setFilters(nextFilters)
    fetchCategories("")
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

  async function openEditPanel(categoryId) {
    try {
      setPanelMode("edit")
      setPanelOpen(true)
      setPanelLoading(true)
      const response = await getAdminCategory(categoryId)
      const category = normalizeCategory(response?.data || response)

      setForm({
        ...INITIAL_FORM,
        ...category,
        image: null,
        remove_image: false,
        families: Array.isArray(category.families) ? category.families : [],
      })
    } catch (error) {
      console.error("Error al cargar categoría:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar la categoría.")
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
    const { name, value, checked, files, type } = event.target

    if (type === "file") {
      const file = files?.[0] || null

      if (!file) {
        setForm((prev) => ({ ...prev, image: null }))
        return
      }

      if (!CATEGORY_IMAGE_TYPES.includes(file.type)) {
        notifyError("La imagen debe ser JPG, PNG o WEBP.")
        return
      }

      if (file.size > CATEGORY_IMAGE_MAX_SIZE) {
        notifyError("La imagen no debe superar 4 MB.")
        return
      }

      setForm((prev) => ({
        ...prev,
        image: file,
        remove_image: false,
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  function handleRemoveImageChange(event) {
    const checked = event.target.checked

    setForm((prev) => ({
      ...prev,
      remove_image: checked,
      image: checked ? null : prev.image,
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
      notifyError("El nombre de la categoría es requerido.")
      return
    }

    try {
      setSaving(true)
      const payload = buildCategoryPayload(form, panelMode)
      const response = panelMode === "create"
        ? await createAdminCategory(payload)
        : await updateAdminCategory(form.id, payload)

      notifySuccess(response?.message || (panelMode === "create" ? "Categoría creada." : "Categoría actualizada."))
      setPanelOpen(false)
      setForm(INITIAL_FORM)
      fetchCategories()
    } catch (error) {
      console.error("Error al guardar categoría:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar la categoría.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(category, nextStatus) {
    try {
      setActionLoadingId(category.id)
      await updateAdminCategoryStatus(category.id, nextStatus)
      setCategories((prev) =>
        prev.map((item) => item.id === category.id ? { ...item, is_active: nextStatus } : item)
      )
      notifySuccess("Estado actualizado.")
    } catch (error) {
      console.error("Error al actualizar estado:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el estado.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleDelete(category) {
    if (!window.confirm(`¿Desactivar la categoría "${category.name}"?`)) return

    try {
      setActionLoadingId(category.id)
      await deleteAdminCategory(category.id)
      setCategories((prev) =>
        prev.map((item) => item.id === category.id ? { ...item, is_active: false } : item)
      )
      notifySuccess("Categoría desactivada.")
    } catch (error) {
      console.error("Error al desactivar categoría:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible desactivar la categoría.")
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <>
      <AdminCard
        title="Categorías"
        subtitle="Administra categorías del catálogo, imagen y estado comercial."
        right={
          <button type="button" className="btn btn-primary" onClick={openCreatePanel}>
            <i className="bi bi-plus-lg" aria-hidden="true" />{" "}
            Nueva categoría
          </button>
        }
      >
        <div className="categories-page">
          <form className="categories-page__filters" onSubmit={handleSearchSubmit}>
            <label>
              <span>Buscar</span>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Nombre, código o slug..."
              />
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

            <div className="categories-page__filter-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Buscar
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={handleClearFilters}>
                Limpiar
              </button>
            </div>
          </form>

          <div className="categories-page__summary">
            {loading ? (
              <span>Cargando categorías...</span>
            ) : (
              <span>
                Mostrando <strong>{pagination.from || 0}</strong> - <strong>{pagination.to || 0}</strong> de{" "}
                <strong>{pagination.total}</strong> categorías
              </span>
            )}
          </div>

          <div className="categories-table">
            <div className="categories-table__head">
              <span>Imagen</span>
              <span>Categoría</span>
              <span>Código</span>
              <span>Productos</span>
              <span>Familias</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>

            <div className="categories-table__body">
              {loading ? (
                <div className="categories-table__empty">Cargando información...</div>
              ) : categories.length ? (
                categories.map((category) => (
                  <div
                    className="categories-table__row"
                    key={category.id}
                    onClick={() => openEditPanel(category.id)}
                  >
                    <span className="categories-table__image">
                      {category.image_url ? <img src={category.image_url} alt={category.name} /> : <i className="bi bi-image" aria-hidden="true" />}
                    </span>
                    <strong>
                      {category.name}
                      <small>{category.slug || "-"}</small>
                    </strong>
                    <span>{category.code || "-"}</span>
                    <span>{formatNumber(category.products_count)}</span>
                    <span>{formatNumber(category.families_count)}</span>
                    <span className={`categories-status ${category.is_active ? "is-active" : "is-inactive"}`}>
                      {category.is_active ? "Activa" : "Inactiva"}
                    </span>
                    <span className="categories-table__actions" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className={`categories-icon-action ${category.is_active ? "is-warning" : "is-success"}`}
                        onClick={() => handleStatusChange(category, !category.is_active)}
                        disabled={actionLoadingId === category.id}
                        title={category.is_active ? "Desactivar" : "Activar"}
                        aria-label={category.is_active ? "Desactivar categoría" : "Activar categoría"}
                      >
                        <i className={`bi ${category.is_active ? "bi-toggle-on" : "bi-toggle-off"}`} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="categories-icon-action is-danger"
                        onClick={() => handleDelete(category)}
                        disabled={actionLoadingId === category.id}
                        title="Desactivar"
                        aria-label="Desactivar categoría"
                      >
                        <i className="bi bi-trash3" aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                ))
              ) : (
                <div className="categories-table__empty">No se encontraron categorías.</div>
              )}
            </div>
          </div>

          {pagination.last_page > 1 ? (
            <div className="categories-page__pagination">
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
        title={panelMode === "create" ? "Nueva categoría" : "Detalle de categoría"}
        subtitle="Configura nombre, código, imagen y estado."
        onClose={closePanel}
        closeDisabled={saving}
        width="lg"
        footer={
          <div className="categories-panel__footer">
            <button type="button" className="btn btn-outline-secondary" onClick={closePanel} disabled={saving}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving || panelLoading || !canSubmit}>
              {saving ? "Guardando..." : "Guardar categoría"}
            </button>
          </div>
        }
      >
        {panelLoading ? (
          <div className="categories-panel__loading">Cargando categoría...</div>
        ) : (
          <form className="categories-panel" onSubmit={handleSubmit}>
            <section className="categories-panel__grid">
              <label>
                <span>Nombre *</span>
                <input name="name" value={form.name} onChange={handleFormChange} />
              </label>
              <label>
                <span>Slug</span>
                <input name="slug" value={form.slug} onChange={handleFormChange} placeholder="se-genera-si-lo-dejas-vacio" />
              </label>
              <label>
                <span>Código</span>
                <input name="code" value={form.code} onChange={handleFormChange} placeholder="ROPA" />
              </label>
              <label className="categories-panel__switch">
                <input type="checkbox" name="is_active" checked={Boolean(form.is_active)} onChange={handleFormChange} />
                <span>Categoría activa</span>
              </label>
            </section>

            <section className="categories-panel__image-block">
              <div className="categories-panel__preview">
                {getCategoryPreviewImage(form, imagePreview) ? (
                  <img src={getCategoryPreviewImage(form, imagePreview)} alt={form.name || "Categoría"} />
                ) : (
                  <i className="bi bi-image" aria-hidden="true" />
                )}
              </div>
              <div className="categories-panel__image-controls">
                <label>
                  <span>Imagen</span>
                  <input type="file" name="image" accept="image/jpeg,image/png,image/webp" onChange={handleFormChange} />
                </label>
                {panelMode === "edit" && form.image_url ? (
                  <label className="categories-panel__remove-image">
                    <input type="checkbox" checked={Boolean(form.remove_image)} onChange={handleRemoveImageChange} />
                    <span>Quitar imagen actual</span>
                  </label>
                ) : null}
              </div>
            </section>

            <AdminTranslationsFields
              locales={activeLocales}
              translations={form.translations}
              fields={[
                {
                  name: "name",
                  label: "Nombre",
                  placeholder: "Nombre traducido de la categoría",
                },
              ]}
              onChange={handleTranslationChange}
            />

            {panelMode === "edit" ? (
              <section className="categories-panel__families">
                <div>
                  <h4>Familias relacionadas</h4>
                  <span>{formatNumber(form.families_count || form.families.length)} familia(s)</span>
                </div>
                {form.families.length ? (
                  <div className="categories-panel__family-list">
                    {form.families.map((family) => (
                      <span key={family.id} className={family.is_active ? "is-active" : "is-inactive"}>
                        {family.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>No hay familias relacionadas.</p>
                )}
              </section>
            ) : null}
          </form>
        )}
      </AdminSidePanel>
    </>
  )
}

function buildCategoryPayload(form, mode) {
  const hasImage = Boolean(form.image)

  if (mode === "create" || hasImage) {
    const payload = new FormData()
    payload.append("name", form.name.trim())
    if (form.slug.trim()) payload.append("slug", form.slug.trim())
    if (form.code.trim()) payload.append("code", form.code.trim())
    payload.append("is_active", form.is_active ? "1" : "0")
    if (form.image) payload.append("image", form.image)
    appendTranslationsToFormData(payload, form.translations)

    return payload
  }

  return {
    name: form.name.trim(),
    slug: form.slug.trim() || null,
    code: form.code.trim() || null,
    is_active: Boolean(form.is_active),
    translations: compactTranslations(form.translations),
    ...(form.remove_image ? { remove_image: true } : {}),
  }
}

function normalizeCategory(item = {}) {
  return {
    id: item.id ?? null,
    grupo_linea_id: item.grupo_linea_id ?? null,
    code: item.code || "",
    name: item.name || "Categoría sin nombre",
    slug: item.slug || "",
    image_path: item.image_path || "",
    image_url: normalizeMediaUrl(item.image_url || item.image_path),
    is_active: Boolean(item.is_active),
    translations: normalizeTranslations(item.translations),
    products_count: Number(item.products_count ?? 0),
    families_count: Number(item.families_count ?? item.families?.length ?? 0),
    families: Array.isArray(item.families) ? item.families : [],
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }
}

function getCategoryPreviewImage(form, imagePreview) {
  if (form.remove_image) return ""
  if (form.image) return imagePreview
  return form.image_url || ""
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-MX").format(Number(value || 0))
}

export default CategoriesPage
