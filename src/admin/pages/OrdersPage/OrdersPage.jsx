import { useCallback, useEffect, useMemo, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel"
import {
  cancelAdminOrder,
  downloadAdminOrderPurchaseOrder,
  getAdminOrder,
  getAdminOrders,
} from "../../../services/api/adminOrderService"
import { notifyError, notifySuccess, notifyWarning } from "../../../utils/toast"
import { normalizeMediaUrl } from "../../../utils/mediaUrl"
import "./OrdersPage.css"

const INITIAL_FILTERS = {
  search: "",
  payment_status: "",
  payment_method: "",
  from: "",
  to: "",
  sort_by: "latest",
  per_page: 20,
  page: 1,
}

const PAYMENT_STATUS_OPTIONS = [
  ["", "Todos"],
  ["pending", "Pendiente"],
  ["paid", "Pagado"],
  ["failed", "Fallido"],
]

const SORT_OPTIONS = [
  ["latest", "Más recientes"],
  ["oldest", "Más antiguos"],
  ["total_desc", "Total mayor"],
  ["total_asc", "Total menor"],
  ["paid_at_desc", "Pagados recientes"],
]

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [meta, setMeta] = useState(createEmptyMeta())
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const summary = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.total += Number(order.total || 0)
        if (order.payment_status === "paid") acc.paid += 1
        if (order.payment_status === "pending") acc.pending += 1
        if (order.payment_status === "failed") acc.failed += 1
        return acc
      },
      { total: 0, paid: 0, pending: 0, failed: 0 }
    )
  }, [orders])

  const loadOrders = useCallback(async (nextFilters = INITIAL_FILTERS) => {
    try {
      setLoading(true)
      const response = await getAdminOrders(cleanParams(nextFilters))
      setOrders(normalizeOrders(response?.data))
      setMeta(normalizeMeta(response?.meta, nextFilters))
    } catch (error) {
      console.error("Error al cargar pedidos:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar los pedidos.")
      setOrders([])
      setMeta(createEmptyMeta())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders(filters)
  }, [filters, loadOrders])

  async function openOrderDetail(order) {
    if (!order?.id) return

    setPanelOpen(true)
    setDetailLoading(true)
    setSelectedOrder(order)

    try {
      const response = await getAdminOrder(order.id)
      const freshOrder = normalizeOrderDetail(response?.data ?? response)
      setSelectedOrder(freshOrder)
    } catch (error) {
      console.error("Error al cargar detalle de pedido:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar el detalle del pedido.")
    } finally {
      setDetailLoading(false)
    }
  }

  function closePanel() {
    if (saving) return
    setPanelOpen(false)
    setSelectedOrder(null)
  }

  function updateFilter(name, value) {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: name === "page" ? value : 1,
    }))
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS)
  }

  async function handleCancelOrder(order = selectedOrder) {
    if (!order?.id) return
    if (!window.confirm(`¿Cancelar el pedido ${order.number || `#${order.id}`}?`)) return

    try {
      setSaving(true)
      const response = await cancelAdminOrder(order.id)
      notifySuccess(response?.message || "Pedido cancelado correctamente.")
      await loadOrders(filters)
      if (panelOpen) closePanel()
    } catch (error) {
      console.error("Error al cancelar pedido:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cancelar el pedido.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadPdf(order = selectedOrder) {
    if (!order?.id) return

    try {
      const response = await downloadAdminOrderPurchaseOrder(order.id)
      const blob = new Blob([response.data], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${order.number || `pedido-${order.id}`}-orden-compra.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error al descargar PDF:", error?.response?.data || error)
      notifyWarning("La orden de compra en PDF todavía no está disponible.")
    }
  }

  const hasNextPage = meta.current_page < meta.last_page
  const hasPreviousPage = meta.current_page > 1

  return (
    <>
      <AdminCard
        title="Pedidos"
        subtitle="Consulta compras, pagos, productos y beneficios aplicados por cliente."
        right={
          <button type="button" className="orders-button orders-button--secondary" onClick={() => loadOrders(filters)}>
            <i className="bi bi-arrow-clockwise" aria-hidden="true" />
            Actualizar
          </button>
        }
      >
        <div className="orders-page">
          <section className="orders-page__summary" aria-label="Resumen de pedidos">
            <div>
              <span>Total vendido</span>
              <strong>{formatMoney(summary.total)}</strong>
            </div>
            <div>
              <span>Pagados</span>
              <strong>{summary.paid}</strong>
            </div>
            <div>
              <span>Pendientes</span>
              <strong>{summary.pending}</strong>
            </div>
            <div>
              <span>Fallidos</span>
              <strong>{summary.failed}</strong>
            </div>
          </section>

          <section className="orders-page__filters" aria-label="Filtros de pedidos">
            <label className="orders-page__search">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Buscar pedido o cliente"
              />
            </label>

            <select
              value={filters.payment_status}
              onChange={(event) => updateFilter("payment_status", event.target.value)}
            >
              {PAYMENT_STATUS_OPTIONS.map(([value, label]) => (
                <option key={value || "all"} value={value}>{label}</option>
              ))}
            </select>

            <input
              type="date"
              value={filters.from}
              onChange={(event) => updateFilter("from", event.target.value)}
              aria-label="Desde"
            />
            <input
              type="date"
              value={filters.to}
              onChange={(event) => updateFilter("to", event.target.value)}
              aria-label="Hasta"
            />

            <select value={filters.sort_by} onChange={(event) => updateFilter("sort_by", event.target.value)}>
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <button type="button" className="orders-button orders-button--ghost" onClick={resetFilters}>
              Limpiar
            </button>
          </section>

          <div className="orders-page__table-wrapper">
            <table className="orders-page__table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Pago</th>
                  <th>Productos</th>
                  <th>Subtotal</th>
                  <th>Descuento</th>
                  <th>Total</th>
                  <th>Fecha</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="orders-page__empty">Cargando pedidos...</td>
                  </tr>
                ) : orders.length ? (
                  orders.map((order) => (
                    <tr key={order.id} onClick={() => openOrderDetail(order)}>
                      <td>
                        <div className="orders-page__main-cell">
                          <strong>{order.number || `#${order.id}`}</strong>
                          <span>{order.payment_method || "Sin método"}</span>
                        </div>
                      </td>
                      <td>
                        <div className="orders-page__main-cell">
                          <strong>{order.customer.name || "Cliente invitado"}</strong>
                          <span>{order.customer.email || "Sin correo"}</span>
                        </div>
                      </td>
                      <td><PaymentBadge status={order.payment_status} /></td>
                      <td>{order.items_count} producto(s)</td>
                      <td>{formatMoney(order.subtotal, order.currency)}</td>
                      <td>{formatMoney(order.discount, order.currency)}</td>
                      <td><strong>{formatMoney(order.total, order.currency)}</strong></td>
                      <td>{formatDate(order.created_at)}</td>
                      <td className="text-end" onClick={(event) => event.stopPropagation()}>
                        <div className="orders-page__actions">
                          <button
                            type="button"
                            className="orders-icon-button orders-icon-button--view"
                            onClick={() => openOrderDetail(order)}
                            title="Ver detalle"
                            aria-label={`Ver ${order.number}`}
                          >
                            <i className="bi bi-eye" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="orders-icon-button orders-icon-button--pdf"
                            onClick={() => handleDownloadPdf(order)}
                            title="Descargar PDF"
                            aria-label={`Descargar PDF de ${order.number}`}
                          >
                            <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="orders-icon-button orders-icon-button--cancel"
                            onClick={() => handleCancelOrder(order)}
                            title="Cancelar pedido"
                            aria-label={`Cancelar ${order.number}`}
                            disabled={order.status === "paid"}
                          >
                            <i className="bi bi-x-lg" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="orders-page__empty">No hay pedidos con estos filtros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="orders-page__pagination">
            <span>
              Mostrando {meta.from || 0}-{meta.to || orders.length} de {meta.total || orders.length}
            </span>
            <div>
              <button
                type="button"
                className="orders-button orders-button--secondary"
                disabled={!hasPreviousPage || loading}
                onClick={() => updateFilter("page", meta.current_page - 1)}
              >
                Anterior
              </button>
              <strong>Página {meta.current_page} de {meta.last_page}</strong>
              <button
                type="button"
                className="orders-button orders-button--secondary"
                disabled={!hasNextPage || loading}
                onClick={() => updateFilter("page", meta.current_page + 1)}
              >
                Siguiente
              </button>
            </div>
          </footer>
        </div>
      </AdminCard>

      <AdminSidePanel
        isOpen={panelOpen}
        title={selectedOrder?.number || "Detalle del pedido"}
        subtitle={selectedOrder?.customer?.name || "Información completa de la compra"}
        onClose={closePanel}
        closeDisabled={saving}
        width="xl"
        footer={
          <div className="orders-panel__footer">
            <button type="button" className="orders-button orders-button--secondary" onClick={closePanel} disabled={saving}>
              Cerrar
            </button>
            <button type="button" className="orders-button orders-button--ghost" onClick={() => handleDownloadPdf()} disabled={!selectedOrder?.id}>
              <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
              PDF
            </button>
          </div>
        }
      >
        {detailLoading && !selectedOrder?.items?.length ? (
          <div className="orders-page__empty">Cargando detalle...</div>
        ) : selectedOrder ? (
          <OrderDetail
            order={selectedOrder}
            saving={saving}
            onCancelOrder={handleCancelOrder}
          />
        ) : null}
      </AdminSidePanel>
    </>
  )
}

function OrderDetail({ order, saving, onCancelOrder }) {
  const coupon = order.metadata?.coupon
  const loyalty = order.metadata?.loyalty
  const cashback = loyalty?.cashback

  const savings = [
    coupon ? ["Cupón aplicado", coupon.code || "Cupón"] : null,
    ["Descuento cupón", formatMoney(coupon?.discount_amount || 0, order.currency)],
    ["Ahorro primera compra", formatMoney(loyalty?.first_purchase_discount?.amount || 0, order.currency)],
    ["Cashback usado", formatMoney(cashback?.applied_amount || 0, order.currency)],
    ["Cashback ganado", formatMoney(cashback?.earn?.amount || 0, order.currency)],
  ].filter(Boolean)

  return (
    <div className="orders-panel">
      <section className="orders-panel__summary">
        <div>
          <span>Pedido</span>
          <strong>{order.number || `#${order.id}`}</strong>
        </div>
        <div>
          <span>Cliente</span>
          <strong>{order.customer?.name || "Cliente invitado"}</strong>
        </div>
        <div>
          <span>Pago</span>
          <strong>{getPaymentStatusLabel(order.payment_status)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{formatMoney(order.total, order.currency)}</strong>
        </div>
      </section>

      <section className="orders-panel__grid">
        <div className="orders-panel__section">
          <h4>Resumen</h4>
          <div className="orders-panel__info-list">
            <InfoRow label="Correo" value={order.customer?.email || "Sin correo"} />
            <InfoRow label="Método" value={order.payment_method || "Sin método"} />
            <InfoRow label="Pago" value={getPaymentStatusLabel(order.payment_status)} />
            <InfoRow label="Fecha" value={formatDateTime(order.created_at)} />
            <InfoRow label="Pagado" value={formatDateTime(order.paid_at) || "No registrado"} />
          </div>
        </div>

        <div className="orders-panel__section">
          <h4>Pago</h4>
          <div className="orders-panel__info-list">
            <InfoRow label="Método" value={order.payment_method || "Sin método"} />
            <InfoRow label="Fecha de pago" value={formatDateTime(order.paid_at) || "No registrado"} />
          </div>
        </div>
      </section>

      <section className="orders-panel__section">
        <h4>Productos</h4>
        <div className="orders-panel__items">
          {order.items.length ? (
            order.items.map((item) => (
              <article key={item.id} className="orders-panel__item">
                <div className="orders-panel__item-media">
                  {item.image ? <img src={normalizeMediaUrl(item.image)} alt={item.name} /> : <i className="bi bi-box-seam" aria-hidden="true" />}
                </div>
                <div className="orders-panel__item-info">
                  <strong>{item.name}</strong>
                  <span>{formatSelectedAttributes(item.selected_attributes)}</span>
                  <small>SKU: {item.sku || "N/D"}</small>
                </div>
                <div className="orders-panel__item-numbers">
                  <span>Cant. {item.quantity}</span>
                  <span>{formatMoney(item.unit_price, order.currency)}</span>
                  <span>Desc. {formatMoney(item.discount, order.currency)}</span>
                  <strong>{formatMoney(item.line_total, order.currency)}</strong>
                </div>
              </article>
            ))
          ) : (
            <p className="orders-page__empty">Este pedido no tiene productos registrados.</p>
          )}
        </div>
      </section>

      <section className="orders-panel__grid">
        <div className="orders-panel__section">
          <h4>Ahorros y cashback</h4>
          <div className="orders-panel__saving-grid">
            {savings.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="orders-panel__section">
          <h4>Totales</h4>
          <div className="orders-panel__totals">
            <InfoRow label="Subtotal" value={formatMoney(order.subtotal, order.currency)} />
            <InfoRow label="Descuento" value={formatMoney(order.discount, order.currency)} />
            <InfoRow label="Impuestos" value={formatMoney(order.tax, order.currency)} />
            <InfoRow label="Envío" value={formatMoney(order.shipping, order.currency)} />
            <InfoRow label="Total" value={formatMoney(order.total, order.currency)} strong />
          </div>
        </div>
      </section>

      <div className="orders-panel__danger">
        <button
          type="button"
          className="orders-button orders-button--danger"
          onClick={() => onCancelOrder(order)}
          disabled={saving || order.status === "paid"}
        >
          Cancelar pedido
        </button>
        {order.status === "paid" ? <span>Los pedidos pagados no se cancelan desde este endpoint.</span> : null}
      </div>
    </div>
  )
}

function InfoRow({ label, value, strong = false }) {
  return (
    <div className={`orders-panel__info-row ${strong ? "is-strong" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PaymentBadge({ status }) {
  return <span className={`orders-badge orders-badge--payment-${status || "default"}`}>{getPaymentStatusLabel(status)}</span>
}

function normalizeOrders(items = []) {
  return Array.isArray(items) ? items.map(normalizeOrder) : []
}

function normalizeOrder(order = {}) {
  return {
    id: order.id,
    number: order.number || "",
    status: order.status || "pending_payment",
    payment_status: order.payment_status || "pending",
    payment_method: order.payment_method || "",
    customer: {
      id: order.customer?.id ?? null,
      name: order.customer?.name || order.customer?.username || "",
      email: order.customer?.email || "",
    },
    currency: order.currency || "mxn",
    items_count: Number(order.items_count || 0),
    items_lines_count: Number(order.items_lines_count || 0),
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    tax: Number(order.tax || 0),
    shipping: Number(order.shipping || 0),
    total: Number(order.total || 0),
    paid_at: order.paid_at || null,
    created_at: order.created_at || null,
    updated_at: order.updated_at || null,
  }
}

function normalizeOrderDetail(order = {}) {
  return {
    ...normalizeOrder(order),
    cart: order.cart || null,
    stripe: order.stripe || null,
    promotions_applied: Array.isArray(order.promotions_applied) ? order.promotions_applied : [],
    shipping_address: order.shipping_address || {},
    items: Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [],
    payments: Array.isArray(order.payments) ? order.payments : [],
    metadata: order.metadata && typeof order.metadata === "object" ? order.metadata : {},
  }
}

function normalizeOrderItem(item = {}) {
  return {
    id: item.id,
    product_id: item.product_id ?? null,
    sku: item.sku || "",
    name: item.name || "Producto",
    brand: item.brand || "",
    image: item.image || item.image_url || item.image_path || "",
    selected_attribute_value_ids: Array.isArray(item.selected_attribute_value_ids)
      ? item.selected_attribute_value_ids
      : [],
    selected_attributes: normalizeSelectedAttributes(item.selected_attributes ?? item.metadata?.selected_attributes),
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || 0),
    discount: Number(item.discount || 0),
    line_total: Number(item.line_total || 0),
    promotion: item.promotion || null,
    metadata: item.metadata || {},
  }
}

function normalizeSelectedAttributes(attributes) {
  if (!Array.isArray(attributes)) return []

  return attributes
    .filter(Boolean)
    .map((attribute) => ({
      attribute: attribute.attribute || attribute.name || "",
      value: attribute.value || "",
    }))
    .filter((attribute) => attribute.attribute && attribute.value)
}

function normalizeMeta(meta = {}, filters = INITIAL_FILTERS) {
  return {
    current_page: Number(meta.current_page || filters.page || 1),
    last_page: Number(meta.last_page || 1),
    per_page: Number(meta.per_page || filters.per_page || 20),
    total: Number(meta.total || 0),
    from: Number(meta.from || 0),
    to: Number(meta.to || 0),
  }
}

function createEmptyMeta() {
  return normalizeMeta()
}

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  )
}

function formatSelectedAttributes(attributes = []) {
  if (!attributes.length) return "Sin atributos"
  return attributes.map((attribute) => `${attribute.attribute}: ${attribute.value}`).join(" / ")
}

function getPaymentStatusLabel(status) {
  const labels = {
    pending: "Pendiente",
    paid: "Pagado",
    failed: "Fallido",
  }

  return labels[status] || "Sin pago"
}

function formatMoney(value, currency = "mxn") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: String(currency || "mxn").toUpperCase(),
  }).format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return "N/D"
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function formatDateTime(value) {
  if (!value) return ""
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export default OrdersPage
