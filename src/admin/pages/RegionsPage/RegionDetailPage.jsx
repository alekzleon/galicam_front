import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import AdminCard from "../../components/AdminCard/AdminCard"
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
  createAdminRegionProfileChangeRequest,
  createAdminRegionStripeConnectOnboardingLink,
  getAdminRegion,
  getAdminRegionProfileChangeRequests,
  getAdminRegionStripeConnect,
  rejectAdminRegionProfileChangeRequest,
  syncAdminRegionProducts,
  syncAdminRegionStripeConnect,
  updateAdminRegion,
} from "../../../services/api/adminRegionService"
import { useAuth } from "../../../context/AuthContext"
import { normalizeMediaUrl } from "../../../utils/mediaUrl"
import { notifyError, notifySuccess } from "../../../utils/toast"
import "./RegionsPage.css"

const BANNER_TYPES = ["image/jpeg", "image/png", "image/webp"]
const BANNER_MAX_SIZE = 5 * 1024 * 1024
const REGIONAL_ADMIN_ROLE = "centro_regional_admin"

const EMPTY_FORM = {
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
  translations: {},
}

const TABS = [
  { id: "profile", label: "Perfil" },
  { id: "products", label: "Productos" },
  { id: "stripe", label: "Stripe Connect" },
  { id: "requests", label: "Solicitudes" },
]

function RegionDetailPage() {
  const { regionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activeLocales } = useAdminLocalization()
  const [activeTab, setActiveTab] = useState("profile")
  const [form, setForm] = useState(EMPTY_FORM)
  const [products, setProducts] = useState([])
  const [productSearch, setProductSearch] = useState("")
  const [bannerPreview, setBannerPreview] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)
  const [profileRequests, setProfileRequests] = useState([])
  const [profileRequestsLoading, setProfileRequestsLoading] = useState(false)
  const [stripeConnect, setStripeConnect] = useState(null)
  const [stripeConnectLoading, setStripeConnectLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const isRegionalAdmin = String(user?.role?.name || "").toLowerCase() === REGIONAL_ADMIN_ROLE
  const canReviewProfileRequests = !isRegionalAdmin
  const canManageProducts = !isRegionalAdmin
  const canSaveProfile = form.name.trim().length > 0
  const selectedProductIds = useMemo(() => new Set(form.product_ids.map(Number)), [form.product_ids])
  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase()
    if (!term) return products

    return products.filter((product) =>
      [product.name, product.sku, product.brand].join(" ").toLowerCase().includes(term)
    )
  }, [productSearch, products])

  useEffect(() => {
    fetchRegion()
    fetchProducts()
    fetchProfileRequests()
    fetchStripeConnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId])

  useEffect(() => {
    if (!form.banner) {
      setBannerPreview("")
      return undefined
    }

    const previewUrl = URL.createObjectURL(form.banner)
    setBannerPreview(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [form.banner])

  async function fetchRegion() {
    try {
      setLoading(true)
      const response = await getAdminRegion(regionId)
      const region = normalizeRegion(response?.data || response)

      setForm({
        ...EMPTY_FORM,
        ...region,
        banner: null,
        remove_banner: false,
        product_ids: getRegionProductIds(region),
        regional_products_config: getRegionProductConfigs(region),
      })
    } catch (error) {
      console.error("Error al cargar región:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar la región.")
      navigate("/admin/catalog/regions")
    } finally {
      setLoading(false)
    }
  }

  async function fetchProducts() {
    if (!canManageProducts) return

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
        ? { status: "pending", region_id: regionId }
        : { region_id: regionId, per_page: 20 }
      const response = await getAdminRegionProfileChangeRequests(params)
      setProfileRequests(normalizeCollection(response).map(normalizeProfileRequest))
    } catch (error) {
      console.error("Error al cargar solicitudes de perfil regional:", error?.response?.data || error)
      setProfileRequests([])
    } finally {
      setProfileRequestsLoading(false)
    }
  }

  async function fetchStripeConnect() {
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

      setForm((prev) => ({ ...prev, banner: file, remove_banner: false }))
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

      if (exists) delete nextConfig[id]
      else nextConfig[id] = createDefaultRegionProductConfig(id, prev.product_ids.length + 1)

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

  async function handleSaveProfile(event) {
    event.preventDefault()

    if (!canSaveProfile) {
      notifyError("El nombre de la región es requerido.")
      return
    }

    try {
      setSaving(true)

      if (isRegionalAdmin) {
        const response = await createAdminRegionProfileChangeRequest(
          form.id,
          buildRegionProfileChangePayload(form)
        )
        notifySuccess(response?.message || "Solicitud enviada para revisión.")
        setForm((prev) => ({ ...prev, banner: null, remove_banner: false, request_notes: "" }))
        fetchProfileRequests()
        return
      }

      const response = await updateAdminRegion(form.id, buildRegionPayload(form))
      notifySuccess(response?.message || "Región actualizada.")
      fetchRegion()
    } catch (error) {
      console.error("Error al guardar región:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar la región.")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveProducts() {
    try {
      setSaving(true)
      const response = await syncAdminRegionProducts(form.id, buildRegionProductsPayload(form))
      notifySuccess(response?.message || "Productos regionales actualizados.")
      fetchRegion()
    } catch (error) {
      console.error("Error al guardar productos regionales:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar productos regionales.")
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
      fetchRegion()
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
    try {
      setActionLoadingId("stripe")
      const response = await createAdminRegionStripeConnectOnboardingLink(form.id)
      const payload = response?.data || response || {}
      const onboardingUrl = payload.account_link?.url

      setStripeConnect(normalizeStripeConnect(payload.region || payload))

      if (!onboardingUrl) {
        notifyError("No fue posible generar el enlace de onboarding.")
        return
      }

      window.location.assign(onboardingUrl)
    } catch (error) {
      console.error("Error al generar onboarding Stripe Connect:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible iniciar el onboarding de Stripe.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleSyncStripeConnect() {
    try {
      setActionLoadingId("stripe")
      const response = await syncAdminRegionStripeConnect(form.id)
      setStripeConnect(normalizeStripeConnect(response?.data?.region || response?.data || response))
      notifySuccess(response?.message || "Estado de Stripe sincronizado.")
    } catch (error) {
      console.error("Error al sincronizar Stripe Connect:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible sincronizar Stripe Connect.")
    } finally {
      setActionLoadingId(null)
    }
  }

  if (loading) {
    return (
      <AdminCard title="Detalle de región" subtitle="Cargando información regional...">
        <div className="regions-detail__loading">Cargando región...</div>
      </AdminCard>
    )
  }

  return (
    <AdminCard
      title={form.name || "Detalle de región"}
      subtitle="Configura perfil, catálogo regional, Stripe Connect y solicitudes."
      right={
        <Link to="/admin/catalog/regions" className="btn btn-outline-secondary">
          Volver
        </Link>
      }
    >
      <div className="regions-detail">
        <nav className="regions-detail__tabs" aria-label="Secciones de región">
          {TABS.filter((tab) => canManageProducts || tab.id !== "products").map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={activeTab === tab.id ? "is-active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "profile" ? (
          <ProfileTab
            form={form}
            bannerPreview={bannerPreview}
            activeLocales={activeLocales}
            isRegionalAdmin={isRegionalAdmin}
            saving={saving}
            canSave={canSaveProfile}
            onSubmit={handleSaveProfile}
            onChange={handleFormChange}
            onRemoveBannerChange={handleRemoveBannerChange}
            onTranslationChange={handleTranslationChange}
          />
        ) : null}

        {activeTab === "products" && canManageProducts ? (
          <ProductsTab
            form={form}
            products={products}
            filteredProducts={filteredProducts}
            selectedProductIds={selectedProductIds}
            productSearch={productSearch}
            loading={productsLoading}
            saving={saving}
            onProductSearchChange={setProductSearch}
            onToggleProduct={toggleProduct}
            onClearProducts={clearProducts}
            onConfigChange={handleRegionalProductConfigChange}
            onSave={handleSaveProducts}
          />
        ) : null}

        {activeTab === "stripe" ? (
          <StripeConnectPanel
            status={stripeConnect}
            loading={stripeConnectLoading}
            actionLoading={actionLoadingId === "stripe"}
            onStartOnboarding={handleStartStripeOnboarding}
            onSync={handleSyncStripeConnect}
          />
        ) : null}

        {activeTab === "requests" ? (
          <RegionProfileRequests
            requests={profileRequests}
            loading={profileRequestsLoading}
            canReview={canReviewProfileRequests}
            actionLoadingId={actionLoadingId}
            onApprove={handleApproveProfileRequest}
            onReject={handleRejectProfileRequest}
            onCancel={handleCancelProfileRequest}
          />
        ) : null}
      </div>
    </AdminCard>
  )
}

function ProfileTab({
  form,
  bannerPreview,
  activeLocales,
  isRegionalAdmin,
  saving,
  canSave,
  onSubmit,
  onChange,
  onRemoveBannerChange,
  onTranslationChange,
}) {
  return (
    <form className="regions-panel" onSubmit={onSubmit}>
      <section className="regions-panel__grid">
        <label>
          <span>Nombre *</span>
          <input name="name" value={form.name} onChange={onChange} disabled={isRegionalAdmin} />
        </label>
        <label>
          <span>Slug</span>
          <input name="slug" value={form.slug} onChange={onChange} disabled={isRegionalAdmin} />
        </label>
        <label>
          <span>Orden</span>
          <input type="number" name="sort_order" value={form.sort_order} onChange={onChange} disabled={isRegionalAdmin} />
        </label>
        <label className="regions-panel__switch">
          <input type="checkbox" name="is_active" checked={Boolean(form.is_active)} onChange={onChange} disabled={isRegionalAdmin} />
          <span>Región activa</span>
        </label>
      </section>

      <label className="regions-panel__field">
        <span>Descripción</span>
        <textarea name="description" value={form.description} onChange={onChange} rows="5" />
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
            <input type="file" name="banner" accept="image/jpeg,image/png,image/webp" onChange={onChange} />
          </label>
          <label>
            <span>Texto alternativo</span>
            <input name="banner_alt" value={form.banner_alt} onChange={onChange} placeholder="Banner región norte" />
          </label>
          {form.banner_url ? (
            <label className="regions-panel__remove-image">
              <input type="checkbox" checked={Boolean(form.remove_banner)} onChange={onRemoveBannerChange} />
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
          onChange={onTranslationChange}
        />
      ) : (
        <label className="regions-panel__field">
          <span>Notas para revisión</span>
          <textarea
            name="request_notes"
            value={form.request_notes}
            onChange={onChange}
            rows="3"
            placeholder="Explica por qué se solicita este cambio."
          />
        </label>
      )}

      <div className="regions-detail__actions">
        <button type="submit" className="btn btn-primary" disabled={saving || !canSave}>
          {saving ? "Guardando..." : isRegionalAdmin ? "Enviar solicitud" : "Guardar perfil"}
        </button>
      </div>
    </form>
  )
}

function ProductsTab({
  form,
  products,
  filteredProducts,
  selectedProductIds,
  productSearch,
  loading,
  saving,
  onProductSearchChange,
  onToggleProduct,
  onClearProducts,
  onConfigChange,
  onSave,
}) {
  return (
    <section className="regions-panel__products">
      <div className="regions-panel__products-head">
        <div>
          <h4>Productos asociados</h4>
          <span>{form.product_ids.length} seleccionado(s)</span>
        </div>
        <div className="regions-detail__actions">
          {form.product_ids.length ? (
            <button type="button" onClick={onClearProducts}>
              Limpiar
            </button>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar productos"}
          </button>
        </div>
      </div>

      <input
        className="regions-panel__product-search"
        type="text"
        value={productSearch}
        onChange={(event) => onProductSearchChange(event.target.value)}
        placeholder="Buscar producto por nombre, SKU o marca..."
      />

      <div className="regions-panel__product-list">
        {loading ? (
          <div className="regions-panel__products-empty">Cargando productos...</div>
        ) : filteredProducts.length ? (
          filteredProducts.map((product) => (
            <label className="regions-panel__product-option" key={product.id}>
              <input
                type="checkbox"
                checked={selectedProductIds.has(product.id)}
                onChange={() => onToggleProduct(product.id)}
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
                      onChange={(event) => onConfigChange(productId, "is_active", event.target.checked)}
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
                      onChange={(event) => onConfigChange(productId, "regional_price", event.target.value)}
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
                      onChange={(event) => onConfigChange(productId, "regional_stock", event.target.value)}
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
                      onChange={(event) => onConfigChange(productId, "commission_rate", event.target.value)}
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
                      onChange={(event) => onConfigChange(productId, "sort_order", event.target.value)}
                    />
                  </label>
                </div>
                <label className="regions-panel__regional-notes">
                  <span>Notas internas</span>
                  <input
                    type="text"
                    value={config.metadata_notes}
                    onChange={(event) => onConfigChange(productId, "metadata_notes", event.target.value)}
                    placeholder="Producto destacado en región norte"
                  />
                </label>
              </article>
            )
          })}
        </div>
      ) : null}
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
            <button type="button" className="btn btn-primary" onClick={onStartOnboarding} disabled={actionLoading}>
              {actionLoading ? "Procesando..." : "Abrir onboarding"}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={onSync} disabled={actionLoading}>
              Sincronizar estado
            </button>
          </div>
        </>
      )}
    </section>
  )
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
                  {request.proposed_changes.description ? <p>{request.proposed_changes.description}</p> : null}
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

function buildRegionPayload(form) {
  const payload = new FormData()

  payload.append("name", form.name.trim())
  if (form.slug.trim()) payload.append("slug", form.slug.trim())
  payload.append("description", form.description.trim())
  payload.append("banner_alt", form.banner_alt.trim())
  payload.append("is_active", form.is_active ? "1" : "0")
  if (form.sort_order !== "") payload.append("sort_order", String(form.sort_order))
  if (form.banner instanceof File) payload.append("banner", form.banner)
  if (form.remove_banner) payload.append("remove_banner", "1")
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

function normalizeProfileRequest(item = {}) {
  const proposedChanges = item.proposed_changes && typeof item.proposed_changes === "object" ? item.proposed_changes : {}
  const currentSnapshot = item.current_snapshot && typeof item.current_snapshot === "object" ? item.current_snapshot : {}

  return {
    id: item.id ?? null,
    region_id: item.region_id ?? item.region?.id ?? null,
    region_name: item.region?.name || currentSnapshot.name || item.region_name || "",
    status: item.status || "pending",
    proposed_changes: {
      ...proposedChanges,
      banner_url: normalizeMediaUrl(proposedChanges.banner_url || proposedChanges.banner_path),
      remove_banner: Boolean(proposedChanges.remove_banner),
    },
    requested_by: item.requested_by || {},
    request_notes: item.request_notes || item.notes || "",
    created_at: item.created_at || null,
  }
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

export default RegionDetailPage
