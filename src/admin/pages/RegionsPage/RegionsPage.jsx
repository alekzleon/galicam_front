import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
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
  approveAdminRegionProfileChangeRequest,
  cancelAdminRegionProfileChangeRequest,
  createAdminRegionStripeConnectOnboardingLink,
  createAdminRegion,
  createAdminRegionProfileChangeRequest,
  deleteAdminRegion,
  getAdminRegionStripeConnect,
  getAdminRegionProfileChangeRequests,
  getAdminRegion,
  getAdminRegions,
  rejectAdminRegionProfileChangeRequest,
  syncAdminRegionStripeConnect,
  syncAdminRegionProducts,
  updateAdminRegion,
  updateAdminRegionStatus,
} from "../../../services/api/adminRegionService"
import { useAuth } from "../../../context/AuthContext"
import { normalizeMediaUrl } from "../../../utils/mediaUrl"
import { notifyError, notifySuccess } from "../../../utils/toast"
import "./RegionsPage.css"

const BANNER_TYPES = ["image/jpeg", "image/png", "image/webp"]
const BANNER_MAX_SIZE = 5 * 1024 * 1024
const REGIONAL_ADMIN_ROLE = "centro_regional_admin"

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
  request_notes: "",
  sort_order: "",
  is_active: true,
  product_ids: [],
  regional_products_config: {},
  products: [],
  products_count: 0,
  translations: {},
}

function RegionsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [regions, setRegions] = useState([])
  const [products, setProducts] = useState([])
  const [profileRequests, setProfileRequests] = useState([])
  const [profileRequestsLoading, setProfileRequestsLoading] = useState(false)
  const [stripeConnect, setStripeConnect] = useState(null)
  const [stripeConnectLoading, setStripeConnectLoading] = useState(false)
  const [stripeConnectActionLoading, setStripeConnectActionLoading] = useState(false)
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

  const isRegionalAdmin = String(user?.role?.name || "").toLowerCase() === REGIONAL_ADMIN_ROLE
  const canReviewProfileRequests = !isRegionalAdmin
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
    fetchProfileRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegionalAdmin, user?.region_id])

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

  async function fetchProfileRequests() {
    try {
      setProfileRequestsLoading(true)
      const params = canReviewProfileRequests
        ? { status: "pending" }
        : { region_id: user?.region_id || "", per_page: 20 }
      const response = await getAdminRegionProfileChangeRequests(params)
      setProfileRequests(normalizeCollection(response).map(normalizeProfileRequest))
    } catch (error) {
      console.error("Error al cargar solicitudes de perfil regional:", error?.response?.data || error)
      setProfileRequests([])
    } finally {
      setProfileRequestsLoading(false)
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
    navigate(`/admin/catalog/regions/${regionId}`)
    return

    try {
      setPanelMode("edit")
      setPanelOpen(true)
      setPanelLoading(true)
      setStripeConnect(null)
      setProductSearch("")
      const response = await getAdminRegion(regionId)
      const region = normalizeRegion(response?.data || response)

      setForm({
        ...INITIAL_FORM,
        ...region,
        banner: null,
        remove_banner: false,
        product_ids: getRegionProductIds(region),
        regional_products_config: getRegionProductConfigs(region),
      })
      fetchStripeConnect(region.id || regionId)
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
    setStripeConnect(null)
    setForm(INITIAL_FORM)
  }

  async function fetchStripeConnect(regionId) {
    if (!regionId) return

    try {
      setStripeConnectLoading(true)
      const response = await getAdminRegionStripeConnect(regionId)
      setStripeConnect(normalizeStripeConnect(response?.data || response))
    } catch (error) {
      console.error("Error al cargar Stripe Connect:", error?.response?.data || error)
      setStripeConnect(null)
    } finally {
      setStripeConnectLoading(false)
    }
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
      const nextConfig = { ...prev.regional_products_config }

      if (exists) {
        delete nextConfig[id]
      } else {
        nextConfig[id] = createDefaultRegionProductConfig(id, prev.product_ids.length + 1)
      }

      return {
        ...prev,
        product_ids: exists
          ? prev.product_ids.filter((item) => Number(item) !== id)
          : [...prev.product_ids, id],
        regional_products_config: nextConfig,
      }
    })
  }

  function clearProducts() {
    setForm((prev) => ({ ...prev, product_ids: [], regional_products_config: {} }))
  }

  function handleRegionalProductConfigChange(productId, field, value) {
    const id = Number(productId)

    setForm((prev) => ({
      ...prev,
      regional_products_config: {
        ...prev.regional_products_config,
        [id]: {
          ...createDefaultRegionProductConfig(
            id,
            Math.max(1, prev.product_ids.findIndex((item) => Number(item) === id) + 1)
          ),
          ...(prev.regional_products_config[id] || {}),
          [field]: value,
        },
      },
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!canSubmit) {
      notifyError("El nombre de la región es requerido.")
      return
    }

    try {
      setSaving(true)

      if (isRegionalAdmin && panelMode === "edit") {
        const response = await createAdminRegionProfileChangeRequest(
          form.id,
          buildRegionProfileChangePayload(form)
        )

        notifySuccess(response?.message || "Solicitud enviada para revisión.")
        setPanelOpen(false)
        setForm(INITIAL_FORM)
        fetchProfileRequests()
        return
      }

      const payload = buildRegionPayload(form, panelMode)
      const response = panelMode === "create"
        ? await createAdminRegion(payload)
        : await updateAdminRegion(form.id, payload)

      if (panelMode === "edit") {
        await syncAdminRegionProducts(form.id, buildRegionProductsPayload(form))
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

  async function handleApproveProfileRequest(request) {
    const reviewNotes = window.prompt(`Notas de aprobación para ${request.region_name || "la región"}:`, "Aprobado")
    if (reviewNotes === null) return

    try {
      setActionLoadingId(`profile-request-${request.id}`)
      const response = await approveAdminRegionProfileChangeRequest(request.id, {
        review_notes: reviewNotes,
      })
      notifySuccess(response?.message || "Solicitud aprobada.")
      fetchProfileRequests()
      fetchRegions()
    } catch (error) {
      console.error("Error al aprobar solicitud:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible aprobar la solicitud.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleRejectProfileRequest(request) {
    const reviewNotes = window.prompt(`Motivo de rechazo para ${request.region_name || "la región"}:`, "")
    if (reviewNotes === null) return

    try {
      setActionLoadingId(`profile-request-${request.id}`)
      const response = await rejectAdminRegionProfileChangeRequest(request.id, {
        review_notes: reviewNotes,
      })
      notifySuccess(response?.message || "Solicitud rechazada.")
      fetchProfileRequests()
    } catch (error) {
      console.error("Error al rechazar solicitud:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible rechazar la solicitud.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleCancelProfileRequest(request) {
    if (!window.confirm("¿Cancelar esta solicitud pendiente?")) return

    try {
      setActionLoadingId(`profile-request-${request.id}`)
      const response = await cancelAdminRegionProfileChangeRequest(request.id)
      notifySuccess(response?.message || "Solicitud cancelada.")
      fetchProfileRequests()
    } catch (error) {
      console.error("Error al cancelar solicitud:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cancelar la solicitud.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleStartStripeOnboarding() {
    if (!form.id) return

    try {
      setStripeConnectActionLoading(true)
      const response = await createAdminRegionStripeConnectOnboardingLink(form.id)
      const payload = response?.data || response || {}
      const nextStatus = normalizeStripeConnect(payload.region || payload)
      const onboardingUrl = payload.account_link?.url

      setStripeConnect(nextStatus)

      if (!onboardingUrl) {
        notifyError("No fue posible generar el enlace de onboarding.")
        return
      }

      window.location.assign(onboardingUrl)
    } catch (error) {
      console.error("Error al generar onboarding Stripe Connect:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible iniciar el onboarding de Stripe.")
    } finally {
      setStripeConnectActionLoading(false)
    }
  }

  async function handleSyncStripeConnect() {
    if (!form.id) return

    try {
      setStripeConnectActionLoading(true)
      const response = await syncAdminRegionStripeConnect(form.id)
      setStripeConnect(normalizeStripeConnect(response?.data?.region || response?.data || response))
      notifySuccess(response?.message || "Estado de Stripe sincronizado.")
    } catch (error) {
      console.error("Error al sincronizar Stripe Connect:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible sincronizar Stripe Connect.")
    } finally {
      setStripeConnectActionLoading(false)
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
          !isRegionalAdmin ? (
          <button type="button" className="btn btn-primary" onClick={openCreatePanel}>
            <i className="bi bi-plus-lg" aria-hidden="true" />{" "}
            Nueva región
          </button>
          ) : null
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
                      {!isRegionalAdmin ? (
                        <>
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
                        </>
                      ) : (
                        <span className="regions-table__review-only">Solicitar cambios</span>
                      )}
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

          <RegionProfileRequests
            requests={profileRequests}
            loading={profileRequestsLoading}
            canReview={canReviewProfileRequests}
            actionLoadingId={actionLoadingId}
            onApprove={handleApproveProfileRequest}
            onReject={handleRejectProfileRequest}
            onCancel={handleCancelProfileRequest}
          />
        </div>
      </AdminCard>

      <AdminSidePanel
        isOpen={panelOpen}
        title={panelMode === "create" ? "Nueva región" : "Detalle de región"}
        subtitle={isRegionalAdmin ? "Solicita cambios de portada y descripción para revisión." : "Configura contenido, banner, traducciones y productos asociados."}
        onClose={closePanel}
        closeDisabled={saving}
        width="lg"
        footer={
          <div className="regions-panel__footer">
            <button type="button" className="btn btn-outline-secondary" onClick={closePanel} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" form="region-form" className="btn btn-primary" disabled={saving || panelLoading || !canSubmit}>
              {saving ? "Guardando..." : isRegionalAdmin ? "Enviar solicitud" : "Guardar región"}
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
                <input name="name" value={form.name} onChange={handleFormChange} disabled={isRegionalAdmin} />
              </label>
              <label>
                <span>Slug</span>
                <input name="slug" value={form.slug} onChange={handleFormChange} placeholder="se-genera-si-lo-dejas-vacio" disabled={isRegionalAdmin} />
              </label>
              <label>
                <span>Orden</span>
                <input type="number" name="sort_order" value={form.sort_order} onChange={handleFormChange} placeholder="1" disabled={isRegionalAdmin} />
              </label>
              <label className="regions-panel__switch">
                <input type="checkbox" name="is_active" checked={Boolean(form.is_active)} onChange={handleFormChange} disabled={isRegionalAdmin} />
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

            {!isRegionalAdmin ? (
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
            ) : null}

            {isRegionalAdmin ? (
              <label className="regions-panel__field">
                <span>Notas para revisión</span>
                <textarea
                  name="request_notes"
                  value={form.request_notes}
                  onChange={handleFormChange}
                  rows="3"
                  placeholder="Explica por qué se solicita este cambio."
                />
              </label>
            ) : null}

            {panelMode === "edit" ? (
              <StripeConnectPanel
                status={stripeConnect}
                loading={stripeConnectLoading}
                actionLoading={stripeConnectActionLoading}
                onStartOnboarding={handleStartStripeOnboarding}
                onSync={handleSyncStripeConnect}
              />
            ) : null}

            {!isRegionalAdmin ? (
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

              {form.product_ids.length ? (
                <div className="regions-panel__regional-config">
                  <div className="regions-panel__regional-config-head">
                    <h4>Configuración regional</h4>
                    <span>Estos valores reemplazan precio y stock solo dentro de esta región.</span>
                  </div>
                  {form.product_ids.map((productId, index) => {
                    const product = products.find((item) => Number(item.id) === Number(productId))
                    const config = {
                      ...createDefaultRegionProductConfig(productId, index + 1),
                      ...(form.regional_products_config[productId] || {}),
                    }

                    return (
                      <article className="regions-panel__regional-product" key={productId}>
                        <div className="regions-panel__regional-product-head">
                          <strong>{product?.name || `Producto #${productId}`}</strong>
                          <label className="regions-panel__regional-switch">
                            <input
                              type="checkbox"
                              checked={Boolean(config.is_active)}
                              onChange={(event) =>
                                handleRegionalProductConfigChange(productId, "is_active", event.target.checked)
                              }
                            />
                            <span>Activo</span>
                          </label>
                        </div>
                        <div className="regions-panel__regional-grid">
                          <label>
                            <span>Precio regional</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={config.regional_price}
                              onChange={(event) =>
                                handleRegionalProductConfigChange(productId, "regional_price", event.target.value)
                              }
                              placeholder="Usar precio base"
                            />
                          </label>
                          <label>
                            <span>Stock regional</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={config.regional_stock}
                              onChange={(event) =>
                                handleRegionalProductConfigChange(productId, "regional_stock", event.target.value)
                              }
                              placeholder="Usar stock base"
                            />
                          </label>
                          <label>
                            <span>Comisión %</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={config.commission_rate}
                              onChange={(event) =>
                                handleRegionalProductConfigChange(productId, "commission_rate", event.target.value)
                              }
                              placeholder="0"
                            />
                          </label>
                          <label>
                            <span>Orden</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={config.sort_order}
                              onChange={(event) =>
                                handleRegionalProductConfigChange(productId, "sort_order", event.target.value)
                              }
                            />
                          </label>
                        </div>
                        <label className="regions-panel__regional-notes">
                          <span>Notas internas</span>
                          <input
                            type="text"
                            value={config.metadata_notes}
                            onChange={(event) =>
                              handleRegionalProductConfigChange(productId, "metadata_notes", event.target.value)
                            }
                            placeholder="Producto destacado en región norte"
                          />
                        </label>
                      </article>
                    )
                  })}
                </div>
              ) : null}
            </section>
            ) : null}
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

function buildRegionProfileChangePayload(form) {
  const payload = new FormData()

  payload.append("description", form.description.trim())
  payload.append("banner_alt", form.banner_alt.trim())
  payload.append("remove_banner", form.remove_banner ? "1" : "0")
  if (form.request_notes.trim()) payload.append("request_notes", form.request_notes.trim())
  if (form.banner instanceof File) payload.append("banner", form.banner)

  return payload
}

function buildRegionProductsPayload(form) {
  return form.product_ids.map((productId, index) => {
    const id = Number(productId)
    const config = {
      ...createDefaultRegionProductConfig(id, index + 1),
      ...(form.regional_products_config[id] || {}),
    }
    const notes = String(config.metadata_notes || "").trim()

    return {
      product_id: id,
      is_active: Boolean(config.is_active),
      regional_price: normalizeOptionalNumber(config.regional_price),
      regional_stock: normalizeOptionalNumber(config.regional_stock),
      commission_rate: normalizeOptionalNumber(config.commission_rate),
      sort_order: normalizeOptionalNumber(config.sort_order) ?? index + 1,
      metadata: notes ? { notes } : {},
    }
  })
}

function RegionProfileRequests({
  requests = [],
  loading,
  canReview,
  actionLoadingId,
  onApprove,
  onReject,
  onCancel,
}) {
  return (
    <section className="regions-profile-requests">
      <div className="regions-profile-requests__head">
        <div>
          <h3>{canReview ? "Solicitudes pendientes de perfil regional" : "Mis solicitudes de perfil"}</h3>
          <span>
            {canReview
              ? "Aprueba o rechaza cambios de portada y descripción."
              : "Consulta el estado de tus solicitudes enviadas."}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="regions-profile-requests__empty">Cargando solicitudes...</div>
      ) : requests.length ? (
        <div className="regions-profile-requests__list">
          {requests.map((request) => {
            const isPending = request.status === "pending"
            const loadingKey = `profile-request-${request.id}`

            return (
              <article className="regions-profile-request" key={request.id}>
                <div className="regions-profile-request__main">
                  <span className={`regions-profile-request__status is-${request.status}`}>
                    {getProfileRequestStatusLabel(request.status)}
                  </span>
                  <strong>{request.region_name || `Región #${request.region_id}`}</strong>
                  <small>
                    Solicitó {request.requested_by?.name || request.requested_by?.email || "Usuario"} ·{" "}
                    {formatDateTime(request.created_at)}
                  </small>
                  {request.proposed_changes.description ? (
                    <p>{request.proposed_changes.description}</p>
                  ) : null}
                  {request.proposed_changes.banner_url ? (
                    <a href={request.proposed_changes.banner_url} target="_blank" rel="noreferrer">
                      Ver portada propuesta
                    </a>
                  ) : request.proposed_changes.remove_banner ? (
                    <em>Solicita quitar la portada actual.</em>
                  ) : null}
                  {request.request_notes ? <em>{request.request_notes}</em> : null}
                </div>

                {isPending ? (
                  <div className="regions-profile-request__actions">
                    {canReview ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => onApprove(request)}
                          disabled={actionLoadingId === loadingKey}
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => onReject(request)}
                          disabled={actionLoadingId === loadingKey}
                        >
                          Rechazar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onCancel(request)}
                        disabled={actionLoadingId === loadingKey}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="regions-profile-requests__empty">
          {canReview ? "No hay solicitudes pendientes." : "Todavía no has enviado solicitudes."}
        </div>
      )}
    </section>
  )
}

function StripeConnectPanel({
  status,
  loading,
  actionLoading,
  onStartOnboarding,
  onSync,
}) {
  const connectStatus = status?.status || "not_started"

  return (
    <section className="regions-stripe-connect">
      <div className="regions-stripe-connect__head">
        <div>
          <h4>Stripe Connect</h4>
          <span>Cuenta independiente para pagos y futuros transfers del centro regional.</span>
        </div>
        <span className={`regions-stripe-connect__badge is-${connectStatus}`}>
          {getStripeConnectStatusLabel(connectStatus)}
        </span>
      </div>

      {loading ? (
        <div className="regions-stripe-connect__empty">Cargando estado de Stripe...</div>
      ) : (
        <>
          <div className="regions-stripe-connect__grid">
            <div>
              <span>Cuenta</span>
              <strong>{status?.account_id || "Sin cuenta"}</strong>
            </div>
            <div>
              <span>Datos enviados</span>
              <strong>{status?.details_submitted ? "Sí" : "No"}</strong>
            </div>
            <div>
              <span>Cobros</span>
              <strong>{status?.charges_enabled ? "Activos" : "Pendientes"}</strong>
            </div>
            <div>
              <span>Payouts</span>
              <strong>{status?.payouts_enabled ? "Activos" : "Pendientes"}</strong>
            </div>
          </div>

          <div className="regions-stripe-connect__actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onStartOnboarding}
              disabled={actionLoading}
            >
              {actionLoading ? "Procesando..." : "Abrir onboarding"}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onSync}
              disabled={actionLoading}
            >
              Sincronizar estado
            </button>
          </div>
        </>
      )}
    </section>
  )
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

function normalizeStripeConnect(value = {}) {
  return {
    region_id: value.region_id ?? value.id ?? null,
    account_id: value.account_id || "",
    status: value.status || "not_started",
    details_submitted: Boolean(value.details_submitted),
    charges_enabled: Boolean(value.charges_enabled),
    payouts_enabled: Boolean(value.payouts_enabled),
  }
}

function normalizeProfileRequest(item = {}) {
  const proposedChanges = item.proposed_changes && typeof item.proposed_changes === "object"
    ? item.proposed_changes
    : {}
  const currentSnapshot = item.current_snapshot && typeof item.current_snapshot === "object"
    ? item.current_snapshot
    : {}

  return {
    id: item.id ?? null,
    region_id: item.region_id ?? item.region?.id ?? null,
    region_name: item.region?.name || currentSnapshot.name || item.region_name || "",
    status: item.status || "pending",
    current_snapshot: currentSnapshot,
    proposed_changes: {
      ...proposedChanges,
      banner_url: normalizeMediaUrl(proposedChanges.banner_url || proposedChanges.banner_path),
      remove_banner: Boolean(proposedChanges.remove_banner),
    },
    requested_by: item.requested_by || {},
    reviewed_by: item.reviewed_by || null,
    reviewed_at: item.reviewed_at || null,
    request_notes: item.request_notes || item.notes || "",
    review_notes: item.review_notes || "",
    created_at: item.created_at || null,
  }
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
    regional_products_config: getRegionProductConfigs(item),
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

function getRegionProductConfigs(region = {}) {
  const configs = {}
  const products = Array.isArray(region.products) ? region.products : []

  products.forEach((product, index) => {
    const pivot = product.regional_catalog || product.pivot || product.product_region || {}
    const productId = Number(product.id || pivot.product_id || 0)
    if (!productId) return

    configs[productId] = {
      product_id: productId,
      is_active: Boolean(pivot.is_active ?? true),
      regional_price: normalizeInputValue(pivot.regional_price ?? pivot.price),
      regional_stock: normalizeInputValue(pivot.regional_stock ?? pivot.stock),
      commission_rate: normalizeInputValue(pivot.commission_rate),
      sort_order: normalizeInputValue(pivot.sort_order ?? index + 1),
      metadata_notes: String(pivot.metadata?.notes || ""),
    }
  })

  return configs
}

function createDefaultRegionProductConfig(productId, sortOrder = 1) {
  return {
    product_id: Number(productId),
    is_active: true,
    regional_price: "",
    regional_stock: "",
    commission_rate: "",
    sort_order: sortOrder,
    metadata_notes: "",
  }
}

function normalizeInputValue(value) {
  return value === null || value === undefined ? "" : String(value)
}

function normalizeOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) return null

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function getRegionPreviewImage(form, bannerPreview) {
  if (form.remove_banner) return ""
  if (form.banner) return bannerPreview
  return form.banner_url || ""
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-MX").format(Number(value || 0))
}

function formatDateTime(value) {
  if (!value) return "Sin fecha"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Sin fecha"

  return date.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function getProfileRequestStatusLabel(status) {
  const labels = {
    pending: "Pendiente",
    approved: "Aprobada",
    rejected: "Rechazada",
    cancelled: "Cancelada",
    canceled: "Cancelada",
  }

  return labels[status] || status || "Pendiente"
}

function getStripeConnectStatusLabel(status) {
  const labels = {
    not_started: "Sin iniciar",
    pending_onboarding: "Onboarding pendiente",
    pending: "Pendiente",
    active: "Activa",
    enabled: "Activa",
    restricted: "Restringida",
    rejected: "Rechazada",
  }

  return labels[status] || status || "Sin iniciar"
}

export default RegionsPage
