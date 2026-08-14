import { useCallback, useEffect, useMemo, useState } from "react"
import { getAdminDashboard } from "../../../services/api/adminDashboardService"
import { notifyError } from "../../../utils/toast"
import "./DashboardPage.css"

const QUICK_RANGES = [
  { key: "today", label: "Hoy", days: 1 },
  { key: "7d", label: "Últimos 7 días", days: 7 },
  { key: "30d", label: "Últimos 30 días", days: 30 },
]

const EMPTY_DASHBOARD = {
  filters: getDefaultFilters(),
  summary: {
    sales: 0,
    orders: 0,
    average_order_value: 0,
    discounts: 0,
    customers_total: 0,
    customers_new: 0,
    customers_with_purchase: 0,
    products_total: 0,
    products_active: 0,
    pending_orders: 0,
    abandoned_carts: 0,
    recovered_carts: 0,
    cashback_earned: 0,
    cashback_redeemed: 0,
    cashback_available_balance: 0,
    estimated_customer_savings: 0,
  },
  charts: {
    sales_by_day: [],
    orders_by_status: [],
    cashback_by_day: [],
    cart_funnel: [],
  },
  tables: {
    top_products: [],
    best_selling_products: [],
    least_selling_products: [],
    low_stock_products: [],
    recent_orders: [],
  },
}

function DashboardPage() {
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)
  const [filters, setFilters] = useState(getDefaultFilters)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const summaryCards = useMemo(() => buildSummaryCards(dashboard.summary), [dashboard.summary])
  const activeQuickRange = useMemo(() => getActiveQuickRange(filters), [filters])

  const loadDashboard = useCallback(async (nextFilters) => {
    try {
      setRefreshing(true)
      const dashboardResponse = await getAdminDashboard(nextFilters)
      const normalizedDashboard = normalizeDashboardResponse(dashboardResponse)
      setDashboard(normalizedDashboard)
      setFilters(normalizedDashboard.filters)
    } catch (error) {
      console.error("Error cargando dashboard:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar el dashboard.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard(getDefaultFilters())
  }, [loadDashboard])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    loadDashboard(filters)
  }

  function applyQuickRange(range) {
    const nextFilters = getRangeFilters(range.days)
    setFilters(nextFilters)
    loadDashboard(nextFilters)
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-page__header">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen comercial, clientes, carritos, cashback y pedidos recientes.</p>
        </div>

        <form className="dashboard-filters" onSubmit={handleSubmit}>
          <div className="dashboard-filters__quick" aria-label="Accesos rápidos de periodo">
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
          <button type="submit" disabled={refreshing}>
            {refreshing ? "Actualizando..." : "Aplicar"}
          </button>
        </form>
      </header>

      <section className="dashboard-page__kpis">
        {summaryCards.map((item) => (
          <article className="dashboard-widget dashboard-widget--kpi" key={item.title}>
            <div className={`dashboard-widget__badge ${item.color}`}>
              <i className={`bi ${item.icon}`} aria-hidden="true" />
            </div>

            <div className="dashboard-widget__kpi-content">
              <p className="dashboard-widget__label">{item.title}</p>
              <h3 className="dashboard-widget__amount">{item.value}</h3>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-page__middle">
        <article className="dashboard-widget dashboard-widget--chart">
          <WidgetHeader
            title="Ventas por día"
            description={`${formatDate(dashboard.filters.from)} - ${formatDate(dashboard.filters.to)}`}
          />
          <SalesByDayChart items={dashboard.charts.sales_by_day} loading={loading} />
        </article>

        <article className="dashboard-widget dashboard-widget--chart">
          <WidgetHeader title="Pedidos por estatus" description="Conteo y total por estado" />
          <OrdersStatusChart items={dashboard.charts.orders_by_status} loading={loading} />
        </article>
      </section>

      <section className="dashboard-page__middle">
        <article className="dashboard-widget dashboard-widget--chart">
          <WidgetHeader title="Cashback por día" description="Generado contra redimido" />
          <CashbackChart items={dashboard.charts.cashback_by_day} loading={loading} />
        </article>

        <article className="dashboard-widget dashboard-widget--chart">
          <WidgetHeader title="Carritos" description="Activos y abandonados" />
          <CartFunnel items={dashboard.charts.cart_funnel} loading={loading} />
        </article>
      </section>

      <section className="dashboard-page__bottom">
        <article className="dashboard-widget dashboard-widget--table">
          <WidgetHeader title="Productos más vendidos" description="Top por cantidad e ingresos" />
          <ProductsSalesTable items={dashboard.tables.best_selling_products} loading={loading} />
        </article>

        <article className="dashboard-widget dashboard-widget--table">
          <WidgetHeader title="Productos menos vendidos" description="Productos con menor movimiento en el periodo" />
          <ProductsSalesTable
            items={dashboard.tables.least_selling_products}
            loading={loading}
            emptyText="Sin productos con ventas bajas en el periodo."
          />
        </article>
      </section>

      <section className="dashboard-page__bottom">
        <article className="dashboard-widget dashboard-widget--table">
          <WidgetHeader title="Menor stock" description="Stock actual con ventas del periodo como contexto" />
          <LowStockTable items={dashboard.tables.low_stock_products} loading={loading} />
        </article>

        <article className="dashboard-widget dashboard-widget--table">
          <WidgetHeader title="Pedidos recientes" description="Últimos movimientos del periodo" />
          <RecentOrdersTable items={dashboard.tables.recent_orders} loading={loading} />
        </article>
      </section>
    </div>
  )
}

function WidgetHeader({ title, description }) {
  return (
    <div className="dashboard-widget__header">
      <div>
        <h3 className="dashboard-widget__title">{title}</h3>
        {description ? <p className="dashboard-widget__description">{description}</p> : null}
      </div>
    </div>
  )
}

function SalesByDayChart({ items, loading }) {
  const maxSales = Math.max(...items.map((item) => item.sales), 1)

  if (loading) return <ChartSkeleton />

  if (!items.length) return <EmptyState text="Sin ventas en el periodo." />

  return (
    <div className="dashboard-chart dashboard-chart--sales">
      {items.map((item) => (
        <div className="dashboard-chart__day" key={item.date}>
          <div className="dashboard-chart__bar-stack">
            <span
              className="dashboard-chart__bar is-sales"
              style={{ height: `${Math.max((item.sales / maxSales) * 100, 5)}%` }}
              title={`${formatDate(item.date)}: ${formatMoney(item.sales)}`}
            />
            <span
              className="dashboard-chart__bar is-discount"
              style={{ height: `${Math.max((item.discounts / maxSales) * 100, item.discounts ? 4 : 0)}%` }}
              title={`Descuentos: ${formatMoney(item.discounts)}`}
            />
          </div>
          <small>{formatShortDate(item.date)}</small>
        </div>
      ))}
    </div>
  )
}

function OrdersStatusChart({ items, loading }) {
  const maxCount = Math.max(...items.map((item) => item.count), 1)

  if (loading) return <ChartSkeleton />
  if (!items.length) return <EmptyState text="Sin pedidos por estatus." />

  return (
    <div className="dashboard-list-chart">
      {items.map((item) => (
        <div className="dashboard-list-chart__item" key={item.status}>
          <div className="dashboard-list-chart__meta">
            <strong>{translateStatus(item.status)}</strong>
            <span>{item.count} pedidos · {formatMoney(item.total)}</span>
          </div>
          <div className="dashboard-list-chart__track">
            <span style={{ width: `${Math.max((item.count / maxCount) * 100, 4)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CashbackChart({ items, loading }) {
  const maxValue = Math.max(...items.map((item) => Math.max(item.earned, item.redeemed)), 1)

  if (loading) return <ChartSkeleton />
  if (!items.length) return <EmptyState text="Sin movimientos de cashback." />

  return (
    <div className="dashboard-chart dashboard-chart--cashback">
      {items.map((item) => (
        <div className="dashboard-chart__day" key={item.date}>
          <div className="dashboard-chart__bar-pair">
            <span
              className="dashboard-chart__bar is-earned"
              style={{ height: `${Math.max((item.earned / maxValue) * 100, item.earned ? 5 : 0)}%` }}
              title={`Generado: ${formatMoney(item.earned)}`}
            />
            <span
              className="dashboard-chart__bar is-redeemed"
              style={{ height: `${Math.max((item.redeemed / maxValue) * 100, item.redeemed ? 5 : 0)}%` }}
              title={`Redimido: ${formatMoney(item.redeemed)}`}
            />
          </div>
          <small>{formatShortDate(item.date)}</small>
        </div>
      ))}
    </div>
  )
}

function CartFunnel({ items, loading }) {
  const maxCount = Math.max(...items.map((item) => item.count), 1)

  if (loading) return <ChartSkeleton />
  if (!items.length) return <EmptyState text="Sin datos de carritos." />

  return (
    <div className="dashboard-funnel">
      {items.map((item) => (
        <div className="dashboard-funnel__item" key={item.status}>
          <div>
            <strong>{translateCartStatus(item.status)}</strong>
            <span>{item.count}</span>
          </div>
          <div className="dashboard-funnel__track">
            <span style={{ width: `${Math.max((item.count / maxCount) * 100, 8)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ProductsSalesTable({
  items,
  loading,
  emptyText = "Sin productos vendidos en el periodo.",
}) {
  if (loading) return <TableSkeleton rows={5} />
  if (!items.length) return <EmptyState text={emptyText} />

  return (
    <div className="dashboard-table dashboard-table--products">
      <div className="dashboard-table__head">
        <span>Producto</span>
        <span>SKU</span>
        <span>Cantidad</span>
        <span>Ingresos</span>
      </div>
      <div className="dashboard-table__body">
        {items.map((item, index) => (
          <div className="dashboard-table__row" key={`${item.product_id || "product"}-${index}`}>
            <strong>{item.name}</strong>
            <span>{item.sku || "-"}</span>
            <span>{formatNumber(item.quantity)}</span>
            <span>{formatMoney(item.revenue)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LowStockTable({ items, loading }) {
  if (loading) return <TableSkeleton rows={5} />
  if (!items.length) return <EmptyState text="Sin productos con stock bajo." />

  return (
    <div className="dashboard-table dashboard-table--stock">
      <div className="dashboard-table__head">
        <span>Producto</span>
        <span>SKU</span>
        <span>Stock</span>
        <span>Vendido</span>
        <span>Ingresos</span>
        <span>Activo</span>
      </div>
      <div className="dashboard-table__body">
        {items.map((item, index) => (
          <div className="dashboard-table__row" key={`${item.product_id || "stock"}-${index}`}>
            <strong>{item.name}</strong>
            <span>{item.sku || "-"}</span>
            <span className={item.stock <= 0 ? "dashboard-stock is-empty" : "dashboard-stock"}>
              {formatNumber(item.stock)}
            </span>
            <span>{formatNumber(item.quantity_sold)}</span>
            <span>{formatMoney(item.revenue)}</span>
            <span className={`dashboard-status ${item.is_active ? "is-paid" : "is-pending"}`}>
              {item.is_active ? "Activo" : "Inactivo"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecentOrdersTable({ items, loading }) {
  if (loading) return <TableSkeleton rows={5} />
  if (!items.length) return <EmptyState text="Sin pedidos recientes." />

  return (
    <div className="dashboard-table dashboard-table--orders">
      <div className="dashboard-table__head">
        <span>Pedido</span>
        <span>Cliente</span>
        <span>Estatus</span>
        <span>Total</span>
        <span>Fecha</span>
      </div>
      <div className="dashboard-table__body">
        {items.map((item) => (
          <div className="dashboard-table__row" key={item.id}>
            <strong>{item.number}</strong>
            <span>{item.customer?.name || item.customer?.email || "Cliente sin nombre"}</span>
            <span className={`dashboard-status ${item.status === "paid" ? "is-paid" : "is-pending"}`}>
              {translateStatus(item.status)}
            </span>
            <span>{formatMoney(item.total)}</span>
            <span>{formatDateTime(item.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="dashboard-skeleton-chart" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}

function TableSkeleton({ rows = 4 }) {
  return (
    <div className="dashboard-table-skeleton" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

function EmptyState({ text }) {
  return <div className="dashboard-empty">{text}</div>
}

function buildSummaryCards(summary) {
  return [
    {
      title: "Ventas",
      value: formatMoney(summary.sales),
      icon: "bi-cash-coin",
      color: "is-blue",
    },
    {
      title: "Pedidos",
      value: formatNumber(summary.orders),
      icon: "bi-receipt",
      color: "is-cyan",
    },
    {
      title: "Ticket promedio",
      value: formatMoney(summary.average_order_value),
      icon: "bi-graph-up-arrow",
      color: "is-green",
    },
    {
      title: "Clientes",
      value: formatNumber(summary.customers_total),
      icon: "bi-people",
      color: "is-purple",
    },
    {
      title: "Ahorro estimado",
      value: formatMoney(summary.estimated_customer_savings),
      icon: "bi-piggy-bank",
      color: "is-orange",
    },
    {
      title: "Cashback disponible",
      value: formatMoney(summary.cashback_available_balance),
      icon: "bi-wallet2",
      color: "is-blue",
    },
    {
      title: "Carritos abandonados",
      value: formatNumber(summary.abandoned_carts),
      icon: "bi-cart-x",
      color: "is-red",
    },
    {
      title: "Carritos recuperados",
      value: formatNumber(summary.recovered_carts),
      icon: "bi-cart-check",
      color: "is-green",
    },
  ]
}

function normalizeDashboardResponse(response) {
  const data = response?.data || response || {}
  const payload = data.data || data

  return {
    filters: {
      ...EMPTY_DASHBOARD.filters,
      ...(payload.filters || {}),
    },
    summary: normalizeSummary(payload.summary),
    charts: {
      sales_by_day: normalizeSalesByDay(payload.charts?.sales_by_day),
      orders_by_status: normalizeOrdersByStatus(payload.charts?.orders_by_status),
      cashback_by_day: normalizeCashbackByDay(payload.charts?.cashback_by_day),
      cart_funnel: normalizeCartFunnel(payload.charts?.cart_funnel),
    },
    tables: {
      top_products: normalizeProductSales(payload.tables?.top_products),
      best_selling_products: normalizeProductSales(
        payload.tables?.best_selling_products || payload.tables?.top_products
      ),
      least_selling_products: normalizeProductSales(payload.tables?.least_selling_products),
      low_stock_products: normalizeLowStockProducts(payload.tables?.low_stock_products),
      recent_orders: normalizeRecentOrders(payload.tables?.recent_orders),
    },
  }
}

function normalizeSummary(summary = {}) {
  return Object.fromEntries(
    Object.entries(EMPTY_DASHBOARD.summary).map(([key, fallback]) => [
      key,
      Number(summary?.[key] ?? fallback),
    ])
  )
}

function normalizeSalesByDay(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        date: item.date || "",
        orders: Number(item.orders ?? 0),
        sales: Number(item.sales ?? 0),
        discounts: Number(item.discounts ?? 0),
      }))
    : []
}

function normalizeOrdersByStatus(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        status: item.status || "unknown",
        count: Number(item.count ?? 0),
        total: Number(item.total ?? 0),
      }))
    : []
}

function normalizeCashbackByDay(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        date: item.date || "",
        earned: Number(item.earned ?? 0),
        redeemed: Number(item.redeemed ?? 0),
      }))
    : []
}

function normalizeCartFunnel(items = []) {
  return Array.isArray(items)
    ? items
        .filter((item) => ["active", "abandoned"].includes(String(item.status || "").toLowerCase()))
        .map((item) => ({
          status: item.status || "unknown",
          count: Number(item.count ?? 0),
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

function normalizeLowStockProducts(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        product_id: item.product_id ?? null,
        name: item.name || "Producto sin nombre",
        sku: item.sku || null,
        stock: Number(item.stock ?? 0),
        quantity_sold: Number(item.quantity_sold ?? 0),
        revenue: Number(item.revenue ?? 0),
        is_active: Boolean(item.is_active),
      }))
    : []
}

function normalizeRecentOrders(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id,
        number: item.number || `#${item.id}`,
        customer: item.customer || {},
        status: item.status || "unknown",
        payment_status: item.payment_status || "unknown",
        total: Number(item.total ?? 0),
        created_at: item.created_at || null,
        paid_at: item.paid_at || null,
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

function formatDate(value) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function formatShortDate(value) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00`))
}

function formatDateTime(value) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function translateStatus(status) {
  const map = {
    paid: "Pagado",
    pending: "Pendiente",
    cancelled: "Cancelado",
    canceled: "Cancelado",
    completed: "Completado",
    processing: "Procesando",
    failed: "Fallido",
  }

  return map[String(status || "").toLowerCase()] || status || "Sin estatus"
}

function translateCartStatus(status) {
  const map = {
    active: "Activos",
    abandoned: "Abandonados",
    converted: "Convertidos",
    recovered: "Recuperados",
  }

  return map[String(status || "").toLowerCase()] || status || "Sin estatus"
}

export default DashboardPage
