import { useCallback, useEffect, useMemo, useState } from "react"
import { getAdminSalesChannelsDashboard } from "../../../services/api/adminDashboardService"
import { notifyError } from "../../../utils/toast"
import "./SalesChannelsPage.css"

const QUICK_RANGES = [
  { key: "today", label: "Hoy", days: 1 },
  { key: "7d", label: "Últimos 7 días", days: 7 },
  { key: "30d", label: "Últimos 30 días", days: 30 },
]

const EMPTY_SALES_CHANNELS_DASHBOARD = {
  filters: {
    ...getDefaultFilters(),
    sales_channel: "",
    limit: 5,
  },
  summary: {
    sales: 0,
    orders: 0,
    average_order_value: 0,
    channels_count: 0,
    top_channel: null,
  },
  channels: [],
  top_products_by_channel: [],
  accepted_channels: [],
}

function SalesChannelsPage() {
  const [data, setData] = useState(EMPTY_SALES_CHANNELS_DASHBOARD)
  const [filters, setFilters] = useState(EMPTY_SALES_CHANNELS_DASHBOARD.filters)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const activeQuickRange = useMemo(() => getActiveQuickRange(filters), [filters])
  const summaryCards = useMemo(
    () => [
      { label: "Ventas totales", value: formatMoney(data.summary.sales), icon: "bi-cash-coin", color: "#2563eb" },
      { label: "Pedidos", value: formatNumber(data.summary.orders), icon: "bi-receipt", color: "#16a34a" },
      { label: "Ticket promedio", value: formatMoney(data.summary.average_order_value), icon: "bi-graph-up-arrow", color: "#9333ea" },
      { label: "Canales activos", value: formatNumber(data.summary.channels_count), icon: "bi-broadcast", color: "#f59e0b" },
      {
        label: "Canal principal",
        value: data.summary.top_channel?.sales_channel_label || "-",
        icon: getChannelTheme(data.summary.top_channel?.sales_channel).icon,
        color: getChannelTheme(data.summary.top_channel?.sales_channel).color,
      },
    ],
    [data.summary]
  )

  const loadSalesChannels = useCallback(async (nextFilters) => {
    try {
      setRefreshing(true)
      const response = await getAdminSalesChannelsDashboard({
        from: nextFilters.from,
        to: nextFilters.to,
        limit: nextFilters.limit || 5,
        sales_channel: nextFilters.sales_channel || undefined,
      })
      const normalized = normalizeSalesChannelsDashboardResponse(response)
      setData(normalized)
      setFilters((prev) => ({
        ...prev,
        ...normalized.filters,
        sales_channel: nextFilters.sales_channel || "",
      }))
    } catch (error) {
      console.error("Error cargando canales de venta:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar canales de venta.")
      setData(EMPTY_SALES_CHANNELS_DASHBOARD)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadSalesChannels(EMPTY_SALES_CHANNELS_DASHBOARD.filters)
  }, [loadSalesChannels])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    loadSalesChannels(filters)
  }

  function applyQuickRange(range) {
    const rangeFilters = getRangeFilters(range.days)
    const nextFilters = {
      ...filters,
      ...rangeFilters,
    }

    setFilters(nextFilters)
    loadSalesChannels(nextFilters)
  }

  return (
    <div className="sales-channels-page">
      <header className="sales-channels-page__header">
        <div>
          <h1>Canales de venta</h1>
          <p>Analiza ventas, pedidos, clientes y productos ganadores por canal.</p>
        </div>

        <form className="sales-channels-filters" onSubmit={handleSubmit}>
          <div className="sales-channels-filters__quick" aria-label="Accesos rápidos de periodo">
            {QUICK_RANGES.map((range) => (
              <button
                key={range.key}
                type="button"
                className={activeQuickRange === range.key ? "is-active" : ""}
                onClick={() => applyQuickRange(range)}
                disabled={refreshing}
              >
                {range.label}
              </button>
            ))}
            <span className={!activeQuickRange ? "is-active" : ""}>Personalizado</span>
          </div>

          <label>
            <span>Desde</span>
            <input type="date" name="from" value={filters.from} onChange={handleFilterChange} />
          </label>
          <label>
            <span>Hasta</span>
            <input type="date" name="to" value={filters.to} onChange={handleFilterChange} />
          </label>
          <label>
            <span>Canal</span>
            <select name="sales_channel" value={filters.sales_channel} onChange={handleFilterChange}>
              <option value="">Todos</option>
              {data.accepted_channels.map((channel) => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={refreshing}>
            {refreshing ? "Actualizando..." : "Aplicar"}
          </button>
        </form>
      </header>

      <section className="sales-channels-page__summary">
        {summaryCards.map((item) => (
          <article
            className="sales-channels-widget sales-channels-widget--summary"
            key={item.label}
            style={{ "--accent": item.color }}
          >
            <div className="sales-channels-widget__icon">
              <i className={`bi ${item.icon}`} aria-hidden="true" />
            </div>
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="sales-channels-page__analytics">
        <article className="sales-channels-widget sales-channels-widget--chart">
          <WidgetHeader title="Ventas por canal" description="Comparativo de ingresos y participación" />
          {loading ? <ChartSkeleton /> : <ChannelRevenueChart items={data.channels} />}
        </article>

        <article className="sales-channels-widget sales-channels-widget--mix">
          <WidgetHeader title="Mix de canales" description="Distribución de ventas" />
          {loading ? <ChartSkeleton /> : <ChannelMixChart items={data.channels} />}
        </article>
      </section>

      <section className="sales-channels-page__grid">
        <article className="sales-channels-widget">
          <WidgetHeader title="Rendimiento por canal" description="Ventas, pedidos, clientes y participación" />
          {loading ? <TableSkeleton rows={5} /> : <SalesChannelsTable items={data.channels} />}
        </article>

        <article className="sales-channels-widget">
          <WidgetHeader title="Productos por canal" description="Top de productos vendidos por canal" />
          {loading ? <TableSkeleton rows={5} /> : <TopProductsByChannel items={data.top_products_by_channel} />}
        </article>
      </section>
    </div>
  )
}

function ChannelRevenueChart({ items }) {
  const maxSales = Math.max(...items.map((item) => item.sales), 1)

  if (!items.length) return <EmptyState text="Sin ventas por canal en el periodo." />

  return (
    <div className="sales-channels-bars">
      {items.map((item) => {
        const theme = getChannelTheme(item.sales_channel)
        const width = Math.max((item.sales / maxSales) * 100, 4)

        return (
          <div className="sales-channels-bars__item" key={item.sales_channel}>
            <div className="sales-channels-bars__label">
              <span style={{ "--accent": theme.color }}>
                <i className={`bi ${theme.icon}`} aria-hidden="true" />
              </span>
              <strong>{item.sales_channel_label}</strong>
              <small>{formatPercent(item.sales_percentage)}</small>
            </div>
            <div className="sales-channels-bars__track">
              <span style={{ width: `${width}%`, "--accent": theme.color }} />
            </div>
            <div className="sales-channels-bars__meta">
              <strong>{formatMoney(item.sales)}</strong>
              <span>{formatNumber(item.orders)} pedidos</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ChannelMixChart({ items }) {
  if (!items.length) return <EmptyState text="Sin mezcla de canales." />

  return (
    <div className="sales-channels-mix">
      <div
        className="sales-channels-mix__donut"
        style={{ background: buildDonutGradient(items) }}
      >
        <div>
          <strong>{formatNumber(items.length)}</strong>
          <span>canales</span>
        </div>
      </div>

      <div className="sales-channels-mix__legend">
        {items.map((item) => {
          const theme = getChannelTheme(item.sales_channel)

          return (
            <div className="sales-channels-mix__legend-item" key={item.sales_channel}>
              <span style={{ background: theme.color }} />
              <strong>{item.sales_channel_label}</strong>
              <small>{formatPercent(item.sales_percentage)}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WidgetHeader({ title, description }) {
  return (
    <div className="sales-channels-widget__header">
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  )
}

function SalesChannelsTable({ items }) {
  if (!items.length) return <EmptyState text="Sin ventas por canal en el periodo." />

  return (
    <div className="sales-channels-table">
      <div className="sales-channels-table__head">
        <span>Canal</span>
        <span>Ventas</span>
        <span>Pedidos</span>
        <span>Clientes</span>
        <span>Ticket promedio</span>
        <span>% ventas</span>
        <span>% pedidos</span>
        <span>Descuentos</span>
      </div>
      <div className="sales-channels-table__body">
        {items.map((item) => (
          <div
            className="sales-channels-table__row"
            key={item.sales_channel}
            style={{ "--accent": getChannelTheme(item.sales_channel).color }}
          >
            <strong className="sales-channels-table__channel">
              <span>
                <i className={`bi ${getChannelTheme(item.sales_channel).icon}`} aria-hidden="true" />
              </span>
              {item.sales_channel_label}
            </strong>
            <span>{formatMoney(item.sales)}</span>
            <span>{formatNumber(item.orders)}</span>
            <span>{formatNumber(item.customers)}</span>
            <span>{formatMoney(item.average_order_value)}</span>
            <span>
              <MetricBar value={item.sales_percentage} />
            </span>
            <span>
              <MetricBar value={item.orders_percentage} />
            </span>
            <span>{formatMoney(item.discounts)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MetricBar({ value }) {
  return (
    <span className="sales-channels-metric">
      <span className="sales-channels-metric__track">
        <span style={{ width: `${Math.min(Math.max(Number(value || 0), 0), 100)}%` }} />
      </span>
      <small>{formatPercent(value)}</small>
    </span>
  )
}

function TopProductsByChannel({ items }) {
  const [openChannel, setOpenChannel] = useState(items[0]?.sales_channel || "")

  useEffect(() => {
    setOpenChannel((current) =>
      items.some((item) => item.sales_channel === current)
        ? current
        : items[0]?.sales_channel || ""
    )
  }, [items])

  if (!items.length) return <EmptyState text="Sin productos destacados por canal." />

  return (
    <div className="sales-channels-products">
      {items.map((channel) => (
        <article
          className="sales-channels-products__group"
          key={channel.sales_channel}
          style={{ "--accent": getChannelTheme(channel.sales_channel).color }}
        >
          <button
            type="button"
            className="sales-channels-products__toggle"
            onClick={() => setOpenChannel((current) => current === channel.sales_channel ? "" : channel.sales_channel)}
            aria-expanded={openChannel === channel.sales_channel}
          >
            <span>
              <i className={`bi ${getChannelTheme(channel.sales_channel).icon}`} aria-hidden="true" />
              <strong>{channel.sales_channel_label}</strong>
            </span>
            <small>{formatNumber(channel.products.length)} producto(s)</small>
            <i className="bi bi-chevron-down" aria-hidden="true" />
          </button>

          {openChannel === channel.sales_channel && channel.products.length ? (
            <div className="sales-channels-products__list">
              {channel.products.map((product, index) => (
                <div
                  className="sales-channels-products__item"
                  key={`${channel.sales_channel}-${product.product_id || index}`}
                >
                  <strong>{product.name}</strong>
                  <span>{product.sku || "-"}</span>
                  <span>{formatNumber(product.quantity)} pza(s)</span>
                  <span>{formatMoney(product.revenue)}</span>
                </div>
              ))}
            </div>
          ) : openChannel === channel.sales_channel ? (
            <p>Sin productos vendidos.</p>
          ) : null}
        </article>
      ))}
    </div>
  )
}

function TableSkeleton({ rows = 4 }) {
  return (
    <div className="sales-channels-skeleton" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="sales-channels-chart-skeleton" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}

function EmptyState({ text }) {
  return <div className="sales-channels-empty">{text}</div>
}

function normalizeSalesChannelsDashboardResponse(response) {
  const data = response?.data || response || {}
  const payload = data.data || data

  return {
    filters: {
      ...EMPTY_SALES_CHANNELS_DASHBOARD.filters,
      ...(payload.filters || {}),
      sales_channel: payload.filters?.sales_channel || "",
    },
    summary: {
      sales: Number(payload.summary?.sales ?? 0),
      orders: Number(payload.summary?.orders ?? 0),
      average_order_value: Number(payload.summary?.average_order_value ?? 0),
      channels_count: Number(payload.summary?.channels_count ?? 0),
      top_channel: payload.summary?.top_channel
        ? {
            sales_channel: payload.summary.top_channel.sales_channel || "other",
            sales_channel_label: payload.summary.top_channel.sales_channel_label || "Otro",
            sales: Number(payload.summary.top_channel.sales ?? 0),
            orders: Number(payload.summary.top_channel.orders ?? 0),
          }
        : null,
    },
    channels: normalizeSalesChannels(payload.channels),
    top_products_by_channel: normalizeTopProductsByChannel(payload.top_products_by_channel),
    accepted_channels: normalizeAcceptedChannels(payload.accepted_channels),
  }
}

function normalizeSalesChannels(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        sales_channel: item.sales_channel || "other",
        sales_channel_label: item.sales_channel_label || "Otro",
        orders: Number(item.orders ?? 0),
        customers: Number(item.customers ?? 0),
        sales: Number(item.sales ?? 0),
        discounts: Number(item.discounts ?? 0),
        average_order_value: Number(item.average_order_value ?? 0),
        sales_percentage: Number(item.sales_percentage ?? 0),
        orders_percentage: Number(item.orders_percentage ?? 0),
      }))
    : []
}

function normalizeTopProductsByChannel(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        sales_channel: item.sales_channel || "other",
        sales_channel_label: item.sales_channel_label || "Otro",
        products: normalizeProductSales(item.products),
      }))
    : []
}

function normalizeProductSales(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        product_id: item.product_id ?? null,
        name: item.name || "Producto sin nombre",
        sku: item.sku || null,
        quantity: Number(item.quantity ?? 0),
        revenue: Number(item.revenue ?? 0),
      }))
    : []
}

function normalizeAcceptedChannels(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        value: item.value || "other",
        label: item.label || "Otro",
      }))
    : []
}

function getDefaultFilters() {
  return getRangeFilters(30)
}

function getRangeFilters(days) {
  const today = new Date()
  const from = new Date(today)
  from.setDate(today.getDate() - Math.max(Number(days || 1) - 1, 0))

  return {
    from: formatDateInput(from),
    to: formatDateInput(today),
  }
}

function getActiveQuickRange(filters) {
  const match = QUICK_RANGES.find((range) => {
    const rangeFilters = getRangeFilters(range.days)
    return filters.from === rangeFilters.from && filters.to === rangeFilters.to
  })

  return match?.key || ""
}

function formatDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0))
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-MX").format(Number(value || 0))
}

function formatPercent(value) {
  return `${new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 1,
  }).format(Number(value || 0))}%`
}

function getChannelTheme(channel) {
  const themes = {
    online_store: { color: "#2563eb", icon: "bi-shop" },
    whatsapp: { color: "#16a34a", icon: "bi-whatsapp" },
    instagram: { color: "#db2777", icon: "bi-instagram" },
    facebook: { color: "#1d4ed8", icon: "bi-facebook" },
    tiktok: { color: "#111827", icon: "bi-tiktok" },
    google: { color: "#ea4335", icon: "bi-google" },
    email: { color: "#7c3aed", icon: "bi-envelope" },
    marketplace: { color: "#f59e0b", icon: "bi-bag" },
    physical_store: { color: "#0f766e", icon: "bi-building" },
    admin: { color: "#475569", icon: "bi-person-gear" },
    referral: { color: "#0891b2", icon: "bi-share" },
    other: { color: "#64748b", icon: "bi-three-dots" },
  }

  return themes[String(channel || "other").toLowerCase()] || themes.other
}

function buildDonutGradient(items = []) {
  let cursor = 0
  const segments = items.map((item) => {
    const start = cursor
    const end = cursor + Math.max(Number(item.sales_percentage || 0), 0)
    cursor = end

    return `${getChannelTheme(item.sales_channel).color} ${start}% ${end}%`
  })

  if (!segments.length || cursor <= 0) {
    return "conic-gradient(#e5e7eb 0% 100%)"
  }

  if (cursor < 100) {
    segments.push(`#e5e7eb ${cursor}% 100%`)
  }

  return `conic-gradient(${segments.join(", ")})`
}

export default SalesChannelsPage
