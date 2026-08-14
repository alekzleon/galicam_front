import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { getAccountOrder, getAccountOrders } from "../../services/api/accountService"
import { useLocalization } from "../../context/LocalizationContext"
import { normalizeMediaUrl } from "../../utils/mediaUrl"
import { notifyError } from "../../utils/toast"
import "./account.css"

const INITIAL_FILTERS = {
  search: "",
  status: "",
  payment_status: "",
  from: "",
  to: "",
  sort_by: "latest",
  per_page: 12,
  page: 1,
}

const STATUS_OPTIONS = [
  ["", "all"],
  ["pending_payment", "paymentPending"],
  ["paid", "paymentPaid"],
  ["payment_failed", "paymentFailed"],
  ["cancelled", "orderCancelled"],
]

const PAYMENT_OPTIONS = [
  ["", "allPayments"],
  ["pending", "paymentPending"],
  ["paid", "paymentPaid"],
  ["failed", "paymentFailed"],
]

const SORT_OPTIONS = [
  ["latest", "sortLatest"],
  ["oldest", "sortOldest"],
  ["total_desc", "sortTotalDesc"],
  ["total_asc", "sortTotalAsc"],
  ["paid_at_desc", "sortPaidRecent"],
]

function AccountOrdersPage() {
  const { locale, t } = useLocalization()
  const [orders, setOrders] = useState([])
  const [meta, setMeta] = useState(createEmptyMeta())
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  const totals = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.total += Number(order.total || 0)
        acc.orders += 1
        if (order.payment_status === "paid") acc.paid += 1
        return acc
      },
      { total: 0, orders: 0, paid: 0 }
    )
  }, [orders])

  const loadOrders = useCallback(async (nextFilters = INITIAL_FILTERS) => {
    try {
      setLoading(true)
      const response = await getAccountOrders(cleanParams(nextFilters))
      setOrders(normalizeOrders(response?.data))
      setMeta(normalizeMeta(response?.meta, nextFilters))
    } catch (error) {
      console.error("Error al cargar pedidos:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || t("accountOrdersLoadError"))
      setOrders([])
      setMeta(createEmptyMeta())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders(filters)
  }, [filters, loadOrders])

  function updateFilter(name, value) {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: name === "page" ? value : 1,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    loadOrders(filters)
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS)
  }

  async function openOrder(order) {
    if (!order?.id) return

    try {
      setDetailLoading(true)
      setSelectedOrder(order)
      const response = await getAccountOrder(order.id)
      setSelectedOrder(normalizeOrderDetail(response?.data ?? response))
    } catch (error) {
      console.error("Error al cargar pedido:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || t("accountOrderDetailLoadError"))
    } finally {
      setDetailLoading(false)
    }
  }

  const hasPreviousPage = meta.current_page > 1
  const hasNextPage = meta.current_page < meta.last_page

  return (
    <div className="account_detail_page">
      <div className="account_detail_shell account_orders_shell">
        <nav className="account_detail_breadcrumb" aria-label="Breadcrumb">
          <Link to="/mi-cuenta">{t("myAccount")}</Link>
          <span>/</span>
          <span>{t("myOrders")}</span>
        </nav>

        <header className="account_detail_header account_orders_header">
          <div>
            <h1 className="account_detail_title">{t("myOrders")}</h1>
            <p className="account_detail_text">{t("accountOrdersDescription")}</p>
          </div>
        </header>

        <section className="account_orders_summary" aria-label={t("accountOrdersSummary")}>
          <div>
            <span>{t("orders")}</span>
            <strong>{formatNumber(totals.orders, locale)}</strong>
          </div>
          <div>
            <span>{t("paymentPaidPlural")}</span>
            <strong>{formatNumber(totals.paid, locale)}</strong>
          </div>
          <div>
            <span>{t("periodTotal")}</span>
            <strong>{formatMoney(totals.total, "mxn", locale)}</strong>
          </div>
        </section>

        <form className="account_orders_filters" onSubmit={handleSubmit}>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder={t("accountOrderSearchPlaceholder")}
          />
          <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value || "all"} value={value}>{t(label)}</option>
            ))}
          </select>
          <select value={filters.payment_status} onChange={(event) => updateFilter("payment_status", event.target.value)}>
            {PAYMENT_OPTIONS.map(([value, label]) => (
              <option key={value || "all-payments"} value={value}>{t(label)}</option>
            ))}
          </select>
          <input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} aria-label={t("from")} />
          <input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} aria-label={t("to")} />
          <select value={filters.sort_by} onChange={(event) => updateFilter("sort_by", event.target.value)}>
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{t(label)}</option>
            ))}
          </select>
          <button type="submit" className="btn btn_primary" disabled={loading}>{t("apply")}</button>
          <button type="button" className="btn btn_secondary" onClick={resetFilters} disabled={loading}>{t("clearFilters")}</button>
        </form>

        <div className="account_orders_layout">
          <section className="account_orders_list" aria-label={t("accountOrdersList")}>
            {loading ? (
              <div className="account_orders_empty">{t("accountOrdersLoading")}</div>
            ) : orders.length ? (
              orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  className={`account_order_card ${selectedOrder?.id === order.id ? "is-active" : ""}`}
                  onClick={() => openOrder(order)}
                >
                  <span className="account_order_card__number">{order.number || `#${order.id}`}</span>
                  <span className={`account_order_status account_order_status--${order.payment_status || "default"}`}>
                    {order.payment_status_label || getPaymentLabel(order.payment_status, t)}
                  </span>
                  <span className="account_order_card__meta">{formatDate(order.created_at, locale)} · {t("itemsCount", { count: order.items_count })}</span>
                  <strong>{formatMoney(order.total, order.currency, locale)}</strong>
                </button>
              ))
            ) : (
              <div className="account_orders_empty">{t("accountOrdersEmpty")}</div>
            )}

            <footer className="account_orders_pagination">
              <span>
                {t("showingRange", {
                  from: meta.from || 0,
                  to: meta.to || orders.length,
                  total: meta.total || orders.length,
                })}
              </span>
              <div>
                <button type="button" className="btn btn_secondary" disabled={!hasPreviousPage || loading} onClick={() => updateFilter("page", meta.current_page - 1)}>
                  {t("previous")}
                </button>
                <strong>{meta.current_page} / {meta.last_page}</strong>
                <button type="button" className="btn btn_secondary" disabled={!hasNextPage || loading} onClick={() => updateFilter("page", meta.current_page + 1)}>
                  {t("next")}
                </button>
              </div>
            </footer>
          </section>

          <OrderDetailPanel order={selectedOrder} loading={detailLoading} locale={locale} t={t} />
        </div>
      </div>
    </div>
  )
}

function OrderDetailPanel({ order, loading, locale, t }) {
  if (!order) {
    return (
      <aside className="account_order_detail account_order_detail--empty">
        <strong>{t("accountSelectOrder")}</strong>
        <span>{t("accountSelectOrderText")}</span>
      </aside>
    )
  }

  const savings = order.savings || {}

  return (
    <aside className="account_order_detail">
      {loading ? <div className="account_orders_loading">{t("accountOrderDetailLoading")}</div> : null}

      <header className="account_order_detail__head">
        <div>
          <span>{t("order")}</span>
          <h2>{order.number || `#${order.id}`}</h2>
        </div>
        <span className={`account_order_status account_order_status--${order.payment_status || "default"}`}>
          {order.payment_status_label || getPaymentLabel(order.payment_status, t)}
        </span>
      </header>

      <div className="account_order_detail__grid">
        <InfoItem label={t("total")} value={formatMoney(order.total, order.currency, locale)} strong />
        <InfoItem label={t("method")} value={order.payment_method || t("noMethod")} />
        <InfoItem label={t("date")} value={formatDateTime(order.created_at, locale)} />
        <InfoItem label={t("paid")} value={formatDateTime(order.paid_at, locale) || t("notRegistered")} />
      </div>

      {order.document_notes ? (
        <section className="account_order_section">
          <h3>{t("orderNotes")}</h3>
          <p>{order.document_notes}</p>
        </section>
      ) : null}

      <section className="account_order_section">
        <h3>{t("shippingAddress")}</h3>
        <p>{formatAddress(order.shipping_address, t)}</p>
      </section>

      <section className="account_order_section">
        <h3>{t("products")}</h3>
        <div className="account_order_items">
          {order.items.length ? (
            order.items.map((item) => (
              <article className="account_order_item" key={item.id}>
                <div className="account_order_item__media">
                  {item.image ? <img src={normalizeMediaUrl(item.image)} alt={item.name} /> : <i className="bi bi-box-seam" aria-hidden="true" />}
                </div>
                <div>
                  <strong>{item.name}</strong>
                  <span>{formatSelectedAttributes(item.selected_attributes, t)}</span>
                  <small>SKU: {item.sku || t("notAvailable")}</small>
                </div>
                <div className="account_order_item__numbers">
                  <span>{t("quantityShort")} {formatNumber(item.quantity, locale)}</span>
                  <span>{formatMoney(item.unit_price, order.currency, locale)}</span>
                  <strong>{formatMoney(item.line_total, order.currency, locale)}</strong>
                </div>
              </article>
            ))
          ) : (
            <p>{t("accountOrderNoProducts")}</p>
          )}
        </div>
      </section>

      <section className="account_order_detail__grid">
        <InfoItem label={t("orderDiscount")} value={formatMoney(savings.order_discount, order.currency, locale)} />
        <InfoItem label={t("cartCouponTitle")} value={formatMoney(savings.coupon_discount, order.currency, locale)} />
        <InfoItem label={t("cashbackApplied")} value={formatMoney(savings.cashback_used, order.currency, locale)} />
        <InfoItem label={t("cashbackEarn")} value={formatMoney(savings.cashback_earned, order.currency, locale)} />
      </section>

      <section className="account_order_section">
        <h3>{t("totals")}</h3>
        <div className="account_order_totals">
          <InfoRow label={t("subtotal")} value={formatMoney(order.subtotal, order.currency, locale)} />
          <InfoRow label={t("discount")} value={formatMoney(order.discount, order.currency, locale)} />
          <InfoRow label={t("tax")} value={formatMoney(order.tax, order.currency, locale)} />
          <InfoRow label={t("shipping")} value={formatMoney(order.shipping, order.currency, locale)} />
          <InfoRow label={t("total")} value={formatMoney(order.total, order.currency, locale)} strong />
        </div>
      </section>
    </aside>
  )
}

function InfoItem({ label, value, strong = false }) {
  return (
    <div className="account_order_info">
      <span>{label}</span>
      <strong className={strong ? "is-strong" : ""}>{value}</strong>
    </div>
  )
}

function InfoRow({ label, value, strong = false }) {
  return (
    <div className={`account_order_total_row ${strong ? "is-strong" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function normalizeOrders(items = []) {
  return Array.isArray(items) ? items.map(normalizeOrder) : []
}

function normalizeOrder(order = {}) {
  return {
    id: order.id,
    number: order.number || "",
    orden_compra: order.orden_compra || "",
    status: order.status || "",
    status_label: order.status_label || "",
    payment_status: order.payment_status || "",
    payment_status_label: order.payment_status_label || "",
    payment_method: order.payment_method || "",
    currency: order.currency || "mxn",
    items_count: Number(order.items_count || 0),
    items_lines_count: Number(order.items_lines_count || 0),
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    tax: Number(order.tax || 0),
    shipping: Number(order.shipping || 0),
    total: Number(order.total || 0),
    document_notes: order.document_notes || "",
    paid_at: order.paid_at || null,
    created_at: order.created_at || null,
    links: order.links || {},
    savings: {},
    shipping_address: {},
    items: [],
    payments: [],
  }
}

function normalizeOrderDetail(order = {}) {
  return {
    ...normalizeOrder(order),
    savings: order.savings || {},
    coupon: order.coupon || null,
    cashback: order.cashback || null,
    shipping_address: order.shipping_address || {},
    items: Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [],
    payments: Array.isArray(order.payments) ? order.payments : [],
  }
}

function normalizeOrderItem(item = {}) {
  return {
    id: item.id,
    product_id: item.product_id ?? null,
    sku: item.sku || "",
    name: item.name || "",
    brand: item.brand || "",
    image: item.image || "",
    selected_attributes: Array.isArray(item.selected_attributes) ? item.selected_attributes : [],
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || 0),
    discount: Number(item.discount || 0),
    line_total: Number(item.line_total || 0),
    promotion: item.promotion || null,
    breakdown: item.breakdown || {},
  }
}

function normalizeMeta(meta = {}, filters = INITIAL_FILTERS) {
  return {
    current_page: Number(meta.current_page || filters.page || 1),
    last_page: Number(meta.last_page || 1),
    per_page: Number(meta.per_page || filters.per_page || 12),
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

function formatSelectedAttributes(attributes = [], t) {
  if (!attributes.length) return t("noAttributes")
  return attributes.map((attribute) => `${attribute.attribute}: ${attribute.value}`).join(" / ")
}

function formatAddress(address = {}, t) {
  const parts = [
    address.street,
    address.external_number,
    address.internal_number,
    address.neighborhood,
    address.city,
    address.state,
    address.zip_code,
  ].filter(Boolean)

  return parts.join(", ") || address.full_address || t("accountNoAddress")
}

function getPaymentLabel(status, t) {
  const labels = {
    pending: t("paymentPending"),
    paid: t("paymentPaid"),
    failed: t("paymentFailed"),
  }

  return labels[String(status || "").toLowerCase()] || t("noPayment")
}

function formatMoney(value, currency = "mxn", locale = "es") {
  return new Intl.NumberFormat(getLocaleTag(locale), {
    style: "currency",
    currency: String(currency || "mxn").toUpperCase(),
  }).format(Number(value || 0))
}

function formatNumber(value, locale = "es") {
  return new Intl.NumberFormat(getLocaleTag(locale)).format(Number(value || 0))
}

function formatDate(value, locale = "es") {
  if (!value) return "N/D"
  return new Intl.DateTimeFormat(getLocaleTag(locale), { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function formatDateTime(value, locale = "es") {
  if (!value) return ""
  return new Intl.DateTimeFormat(getLocaleTag(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function getLocaleTag(locale) {
  if (locale === "en") return "en-US"
  if (locale === "fr") return "fr-FR"
  return "es-MX"
}

export default AccountOrdersPage
