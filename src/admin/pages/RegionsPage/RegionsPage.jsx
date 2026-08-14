import { useEffect, useMemo, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel"
import AdminTranslationsFields from "../../components/AdminTranslationsFields/AdminTranslationsFields"
import useAdminLocalization from "../../hooks/useAdminLocalization"
import {
  appendTranslationsToFormData,
  normalizeTranslations,
  setTranslationValue,
} from "../../utils/adminTranslations"
import { getAdminProducts } from "../../../services/api/adminProductService"
import {
  createAdminRegion,
  deleteAdminRegion,
  getAdminRegion,
  getAdminRegions,
  syncAdminRegionProducts,
  updateAdminRegion,
  updateAdminRegionStatus,
} from "../../../services/api/adminRegionService"
import { normalizeMediaUrl } from "../../../utils/mediaUrl"
import { notifyError, notifySuccess } from "../../../utils/toast"
import "./RegionsPage.css"

const BANNER_TYPES = ["image/jpeg", "image/png", "image/webp"]
const BANNER_MAX_SIZE = 5 * 1024 * 1024

const INITIAL_FORM = {
  id: null,
  name: "",
  slug: "",
  description: "",
  banner: null,
  banner_url: "",
  banner_path: "",
  banner_alt: "",
  remove_banner: false,
  sort_order: "",
  is_active: true,
  product_ids: [],
  products: [],
  products_count: 0,
  translations: {},
}

function RegionsPage() {
  const [regions, setRegions] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState("create")
  const [panelLoading, setPanelLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [bannerPreview, setBannerPreview] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [filters, setFilters] = useState({
    search: "",
    is_active: "",
    sort_by: "sort_order",
    page: 1,
    per_page: 15,
  })
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
    from: 0,
    to: 0,
  })
  const { activeLocales } = useAdminLocalization()

  const canSubmit = useMemo(() => form.name.trim().length > 0, [form.name])
  const selectedProductIds = useMemo(() => new Set(form.product_ids.map(Number)), [form.product_ids])
  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase()
    if (!term) return products

    return products.filter((product) =>
      [product.name, product.sku, product.brand]
        .join(" ")
        .toLowerCase()
        .includes(term)
    )
  }, [productSearch, products])

  useEffect(() => {
    fetchRegions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.per_page, filters.is_active, filters.sort_by])

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (!form.banner) {
      setBannerPreview("")
      return undefined
    }

    const previewUrl = URL.createObjectURL(form.banner)
    setBannerPreview(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [form.banner])

  async function fetchRegions(customSearch = null) {
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

      const response = await getAdminRegions(params)
      const items = normalizeCollection(response).map(normalizeRegion)
      const meta = response?.meta || response?.data?.meta || {}

      setRegions(items)
      setPagination({
        current_page: Number(meta.current_page || 1),
        last_page: Number(meta.last_page || 1),
        per_page: Number(meta.per_page || filters.per_page),
        total: Number(meta.total || items.length),
        from: Number(meta.from || (items.length ? 1 : 0)),
        to: Number(meta.to || items.length),
      })
    } catch (error) {
      console.error("Error al cargar regiones:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar las regiones.")
    } finally {
      setLoading(false)
    }
  }

  async function fetchProducts() {
    try {
      setProductsLoading(true)
      const response = await getAdminProducts({
        without_pagination: true,
        per_page: 200,
        sort_by: "name_asc",
      })
      setProducts(normalizeCollection(response).map(normalizeProductOption))
    } catch (error) {
      console.error("Error al cargar productos para regiones:", error?.response?.data || error)
      setProducts([])
    } finally {
      setProductsLoading(false)
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
    fetchRegions(filters.search)
  }

  function handleClearFilters() {
    const nextFilters = {
      search: "",
      is_active: "",
      sort_by: "sort_order",
      page: 1,
      per_page: filters.per_page,
    }

    setFilters(nextFilters)
    fetchRegions("")
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > pagination.last_page) return
    setFilters((prev) => ({ ...prev, page: nextPage }))
  }

  function openCreatePanel() {
    setPanelMode("create")
    setProductSearch("")
    setForm(INITIAL_FORM)
    setPanelOpen(true)
  }

  async function openEditPanel(regionId) {
    try {
      setPanelMode("edit")
      setPanelOpen(true)
      setPanelLoading(true)
      setProductSearch("")
      const response = await getAdminRegion(regionId)
      const region = normalizeRegion(response?.data || response)

      setForm({
        ...INITIAL_FORM,
        ...region,
        banner: null,
        remove_banner: false,
        product_ids: getRegionProductIds(region),
      })
    } catch (error) {
      console.error("Error al cargar región:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar la región.")
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
        setForm((prev) => ({ ...prev, banner: null }))
        return
      }

      if (!BANNER_TYPES.includes(file.type)) {
        event.target.value = ""
        notifyError("El banner debe ser JPG, PNG o WEBP.")
        return
      }

      if (file.size > BANNER_MAX_SIZE) {
        event.target.value = ""
        notifyError("El banner no debe superar 5 MB.")
        return
      }

      setForm((prev) => ({
        ...prev,
        banner: file,
        remove_banner: false,
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  function handleRemoveBannerChange(event) {
    const checked = event.target.checked

    setForm((prev) => ({
      ...prev,
      remove_banner: checked,
      banner: checked ? null : prev.banner,
    }))
  }

  function handleTranslationChange(field, locale, value) {
    setForm((prev) => ({
      ...prev,
      translations: setTranslationValue(prev.translations, field, locale, value),
    }))
  }

  function toggleProduct(productId) {
    setForm((prev) => {
      const id = Number(productId)
      const exists = prev.product_ids.map(Number).includes(id)

      return {
        ...prev,
        product_ids: exists
          ? prev.product_ids.filter((item) => Number(item) !== id)
          : [...prev.product_ids, id],
      }
    })
  }

  function clearProducts() {
    setForm((prev) => ({ ...prev, product_ids: [] }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!canSubmit) {
      notifyError("El nombre de la región es requerido.")
      return
    }

    try {
      setSaving(true)
      const payload = buildRegionPayload(form, panelMode)
      const response = panelMode === "create"
        ? await createAdminRegion(payload)
        : await updateAdminRegion(form.id, payload)

      if (panelMode === "edit") {
        await syncAdminRegionProducts(form.id, form.product_ids)
      }

      notifySuccess(response?.message || (panelMode === "create" ? "Región creada." : "Región actualizada."))
      setPanelOpen(false)
      setForm(INITIAL_FORM)
      fetchRegions()
    } catch (error) {
      console.error("Error al guardar región:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar la región.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(region, nextStatus) {
    try {
      setActionLoadingId(region.id)
      await updateAdminRegionStatus(region.id, nextStatus)
      setRegions((prev) =>
        prev.map((item) => item.id === region.id ? { ...item, is_active: nextStatus } : item)
      )
      notifySuccess("Estado actualizado.")
    } catch (error) {
      console.error("Error al actualizar región:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el estado.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleDelete(region) {
    if (!window.confirm(`¿Eliminar la región "${region.name}"?`)) return

    try {
      setActionLoadingId(region.id)
      await deleteAdminRegion(region.id)
      setRegions((prev) => prev.filter((item) => item.id !== region.id))
      notifySuccess("Región eliminada.")
    } catch (error) {
      console.error("Error al eliminar región:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar la región.")
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <>
      <AdminCard
        title="Regiones"
        subtitle="Administra landings regionales con banner, contenido y productos asociados."
        right={
          <button type="button" className="btn btn-primary" onClick={openCreatePanel}>
            <i className="bi bi-plus-lg" aria-hidden="true" />{" "}
            Nueva región
          </button>
        }
      >
        <div className="regions-page">
          <form className="regions-page__filters" onSubmit={handleSearchSubmit}>
            <label>
              <span>Buscar</span>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Nombre, descripción o slug..."
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
                <option value="sort_order">Orden manual</option>
                <option value="name_asc">Nombre A-Z</option>
                <option value="name_desc">Nombre Z-A</option>
                <option value="latest">Más recientes</option>
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

            <div className="regions-page__filter-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Buscar
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={handleClearFilters}>
                Limpiar
              </button>
            </div>
          </form>

          <div className="regions-page__summary">
            {loading ? (
              <span>Cargando regiones...</span>
            ) : (
              <span>
                Mostrando <strong>{pagination.from || 0}</strong> - <strong>{pagination.to || 0}</strong> de{" "}
                <strong>{pagination.total}</strong> regiones
              </span>
            )}
          </div>

          <div className="regions-table">
            <div className="regions-table__head">
              <span>Banner</span>
              <span>Región</span>
              <span>Productos</span>
              <span>Orden</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>

            <div className="regions-table__body">
              {loading ? (
                <div className="regions-table__empty">Cargando información...</div>
              ) : regions.length ? (
                regions.map((region) => (
                  <div className="regions-table__row" key={region.id} onClick={() => openEditPanel(region.id)}>
                    <span className="regions-table__image">
                      {region.banner_url ? <img src={region.banner_url} alt={region.banner_alt || region.name} /> : <i className="bi bi-image" aria-hidden="true" />}
                    </span>
                    <strong>
                      {region.name}
                      <small>{region.slug || "-"}</small>
                    </strong>
                    <span>{formatNumber(region.products_count)}</span>
                    <span>{region.sort_order ?? "-"}</span>
                    <span className={`regions-status ${region.is_active ? "is-active" : "is-inactive"}`}>
                      {region.is_active ? "Activa" : "Inactiva"}
                    </span>
                    <span className="regions-table__actions" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className={`regions-icon-action ${region.is_active ? "is-warning" : "is-success"}`}
                        onClick={() => handleStatusChange(region, !region.is_active)}
                        disabled={actionLoadingId === region.id}
                        title={region.is_active ? "Desactivar" : "Activar"}
                        aria-label={region.is_active ? "Desactivar región" : "Activar región"}
                      >
                        <i className={`bi ${region.is_active ? "bi-toggle-on" : "bi-toggle-off"}`} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="regions-icon-action is-danger"
                        onClick={() => handleDelete(region)}
                        disabled={actionLoadingId === region.id}
                        title="Eliminar"
                        aria-label="Eliminar región"
                      >
                        <i className="bi bi-trash3" aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                ))
              ) : (
                <div className="regions-table__empty">No se encontraron regiones.</div>
              )}
            </div>
          </div>

          {pagination.last_page > 1 ? (
            <div className="regions-page__pagination">
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
        title={panelMode === "create" ? "Nueva región" : "Detalle de región"}
        subtitle="Configura contenido, banner, traducciones y productos asociados."
        onClose={closePanel}
        closeDisabled={saving}
        width="lg"
        footer={
          <div className="regions-panel__footer">
            <button type="button" className="btn btn-outline-secondary" onClick={closePanel} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" form="region-form" className="btn btn-primary" disabled={saving || panelLoading || !canSubmit}>
              {saving ? "Guardando..." : "Guardar región"}
            </button>
          </div>
        }
      >
        {panelLoading ? (
          <div className="regions-panel__loading">Cargando región...</div>
        ) : (
          <form id="region-form" className="regions-panel" onSubmit={handleSubmit}>
            <section className="regions-panel__grid">
              <label>
                <span>Nombre *</span>
                <input name="name" value={form.name} onChange={handleFormChange} />
              </label>
              <label>
                <span>Slug</span>
                <input name="slug" value={form.slug} onChange={handleFormChange} placeholder="se-genera-si-lo-dejas-vacio" />
              </label>
              <label>
                <span>Orden</span>
                <input type="number" name="sort_order" value={form.sort_order} onChange={handleFormChange} placeholder="1" />
              </label>
              <label className="regions-panel__switch">
                <input type="checkbox" name="is_active" checked={Boolean(form.is_active)} onChange={handleFormChange} />
                <span>Región activa</span>
              </label>
            </section>

            <label className="regions-panel__field">
              <span>Descripción</span>
              <textarea name="description" value={form.description} onChange={handleFormChange} rows="4" />
            </label>

            <section className="regions-panel__image-block">
              <div className="regions-panel__preview">
                {getRegionPreviewImage(form, bannerPreview) ? (
                  <img src={getRegionPreviewImage(form, bannerPreview)} alt={form.banner_alt || form.name || "Región"} />
                ) : (
                  <i className="bi bi-image" aria-hidden="true" />
                )}
              </div>
              <div className="regions-panel__image-controls">
                <label>
                  <span>Banner</span>
                  <input type="file" name="banner" accept="image/jpeg,image/png,image/webp" onChange={handleFormChange} />
                </label>
                <label>
                  <span>Texto alternativo</span>
                  <input name="banner_alt" value={form.banner_alt} onChange={handleFormChange} placeholder="Banner región norte" />
                </label>
                {panelMode === "edit" && form.banner_url ? (
                  <label className="regions-panel__remove-image">
                    <input type="checkbox" checked={Boolean(form.remove_banner)} onChange={handleRemoveBannerChange} />
                    <span>Quitar banner actual</span>
                  </label>
                ) : null}
              </div>
            </section>

            <AdminTranslationsFields
              locales={activeLocales}
              translations={form.translations}
              fields={[
                { name: "name", label: "Nombre", placeholder: "Nombre traducido" },
                {
                  name: "description",
                  label: "Descripción",
                  type: "textarea",
                  placeholder: "Descripción traducida",
                },
                { name: "banner_alt", label: "Texto alternativo del banner", placeholder: "Alt traducido" },
              ]}
              onChange={handleTranslationChange}
            />

            <section className="regions-panel__products">
              <div className="regions-panel__products-head">
                <div>
                  <h4>Productos asociados</h4>
                  <span>{form.product_ids.length} seleccionado(s)</span>
                </div>
                {form.product_ids.length ? (
                  <button type="button" onClick={clearProducts}>
                    Limpiar
                  </button>
                ) : null}
              </div>

              <input
                className="regions-panel__product-search"
                type="text"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Buscar producto por nombre, SKU o marca..."
              />

              <div className="regions-panel__product-list">
                {productsLoading ? (
                  <div className="regions-panel__products-empty">Cargando productos...</div>
                ) : filteredProducts.length ? (
                  filteredProducts.map((product) => (
                    <label className="regions-panel__product-option" key={product.id}>
                      <input
                        type="checkbox"
                        checked={selectedProductIds.has(product.id)}
                        onChange={() => toggleProduct(product.id)}
                      />
                      <span>
                        <strong>{product.name}</strong>
                        <small>{[product.sku, product.brand].filter(Boolean).join(" · ") || "Sin SKU"}</small>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="regions-panel__products-empty">No hay productos para mostrar.</div>
                )}
              </div>
            </section>
          </form>
        )}
      </AdminSidePanel>
    </>
  )
}

function buildRegionPayload(form, mode) {
  const hasBanner = form.banner instanceof File
  const payload = new FormData()

  payload.append("name", form.name.trim())
  if (form.slug.trim()) payload.append("slug", form.slug.trim())
  payload.append("description", form.description.trim())
  payload.append("banner_alt", form.banner_alt.trim())
  payload.append("is_active", form.is_active ? "1" : "0")
  if (form.sort_order !== "") payload.append("sort_order", String(form.sort_order))
  if (hasBanner) payload.append("banner", form.banner)
  if (mode === "edit" && form.remove_banner) payload.append("remove_banner", "1")
  form.product_ids.forEach((id) => payload.append("product_ids[]", String(id)))
  appendTranslationsToFormData(payload, form.translations)

  return payload
}

function normalizeCollection(response) {
  const payload = response?.data ?? response

  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.regions)) return payload.regions
  if (Array.isArray(payload?.products)) return payload.products

  return []
}

function normalizeRegion(item = {}) {
  return {
    id: Number(item.id || 0),
    name: item.name || "Región sin nombre",
    slug: item.slug || "",
    description: item.description || "",
    banner_path: item.banner_path || "",
    banner_url: normalizeMediaUrl(item.banner_url || item.banner_path),
    banner_alt: item.banner_alt || "",
    sort_order: item.sort_order ?? "",
    is_active: Boolean(item.is_active),
    products_count: Number(item.products_count ?? item.products?.length ?? 0),
    products: Array.isArray(item.products) ? item.products : [],
    product_ids: Array.isArray(item.product_ids) ? item.product_ids : [],
    translations: normalizeTranslations(item.translations),
  }
}

function normalizeProductOption(item = {}) {
  return {
    id: Number(item.id || 0),
    name: item.name || `Producto #${item.id}`,
    sku: item.sku || "",
    brand: item.brand || "",
  }
}

function getRegionProductIds(region = {}) {
  if (Array.isArray(region.product_ids) && region.product_ids.length) {
    return region.product_ids.map(Number).filter(Boolean)
  }

  if (Array.isArray(region.products)) {
    return region.products.map((product) => Number(product.id)).filter(Boolean)
  }

  return []
}

function getRegionPreviewImage(form, bannerPreview) {
  if (form.remove_banner) return ""
  if (form.banner) return bannerPreview
  return form.banner_url || ""
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-MX").format(Number(value || 0))
}

export default RegionsPage
