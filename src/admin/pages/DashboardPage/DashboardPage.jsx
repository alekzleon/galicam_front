import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "../../../context/AuthContext"
import {
  getAdminDashboard,
  getAdminMarketplaceDashboard,
} from "../../../services/api/adminDashboardService"
import { notifyError } from "../../../utils/toast"
import "./DashboardPage.css"

const REGIONAL_ADMIN_ROLE = "centro_regional_admin"

const QUICK_RANGES = [
  { key: "today", label: "Hoy", days: 1 },
  { key: "7d", label: "Últimos 7 días", days: 7 },
  { key: "30d", label: "Últimos 30 días", days: 30 },
]

const EMPTY_DASHBOARD = {
  type: "global",
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

const EMPTY_MARKETPLACE_DASHBOARD = {
  type: "marketplace",
  filters: getDefaultFilters(),
  summary: {
    orders: 0,
    gross_amount: 0,
    commission_amount: 0,
    net_amount: 0,
    transfer_amount: 0,
    transferred_amount: 0,
    failed_transfer_amount: 0,
  },
  regions: [],
  transfers_by_status: [],
  stripe_connect: {},
  recent_orders: [],
  recent_transfers: [],
}

function DashboardPage() {
  const { user } = useAuth()
  const isRegionalAdmin = getUserRoleName(user) === REGIONAL_ADMIN_ROLE
  const [dashboardMode, setDashboardMode] = useState(isRegionalAdmin ? "marketplace" : "global")
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)
  const [filters, setFilters] = useState(getDefaultFilters)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const isMarketplaceMode = dashboardMode === "marketplace"
  const summaryCards = useMemo(
    () => isMarketplaceMode ? buildMarketplaceSummaryCards(dashboard.summary) : buildSummaryCards(dashboard.summary),
    [dashboard.summary, isMarketplaceMode]
  )
  const activeQuickRange = useMemo(() => getActiveQuickRange(filters), [filters])

  const loadDashboard = useCallback(async (nextFilters, nextMode = dashboardMode) => {
    try {
      setRefreshing(true)
      const normalizedFilters = nextMode === "marketplace"
        ? cleanMarketplaceFilters(nextFilters, isRegionalAdmin)
        : nextFilters
      const dashboardResponse = nextMode === "marketplace"
        ? await getAdminMarketplaceDashboard(normalizedFilters)
        : await getAdminDashboard(normalizedFilters)
      const normalizedDashboard = nextMode === "marketplace"
        ? normalizeMarketplaceDashboardResponse(dashboardResponse)
        : normalizeDashboardResponse(dashboardResponse)
      setDashboard(normalizedDashboard)
      setFilters(normalizedDashboard.filters)
    } catch (error) {
      console.error("Error cargando dashboard:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar el dashboard.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [dashboardMode, isRegionalAdmin])

  useEffect(() => {
    const nextMode = isRegionalAdmin ? "marketplace" : dashboardMode
    if (isRegionalAdmin && dashboardMode !== "marketplace") {
      setDashboardMode("marketplace")
      return
    }
    loadDashboard(cleanFiltersForMode(filters, nextMode, isRegionalAdmin), nextMode)
  }, [dashboardMode, isRegionalAdmin, loadDashboard])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    loadDashboard(filters, dashboardMode)
  }

  function applyQuickRange(range) {
    const nextFilters = {
      ...cleanFiltersForMode(filters, dashboardMode, isRegionalAdmin),
      ...getRangeFilters(range.days),
    }
    setFilters(nextFilters)
    loadDashboard(nextFilters, dashboardMode)
  }

  function handleModeChange(nextMode) {
    if (nextMode === dashboardMode) return
    setDashboardMode(nextMode)
    setLoading(true)
    const nextFilters = cleanFiltersForMode(filters, nextMode, isRegionalAdmin)
    setFilters(nextFilters)
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-page__header">
        <div>
          <h1>{isMarketplaceMode ? "Dashboard marketplace" : "Dashboard"}</h1>
          <p>
            {isMarketplaceMode
              ? "Resumen regional de pedidos, comisiones, transfers y Stripe Connect."
              : "Resumen comercial, clientes, carritos, cashback y pedidos recientes."}
          </p>
          {!isRegionalAdmin ? (
            <div className="dashboard-mode-toggle" aria-label="Tipo de dashboard">
              <button
                type="button"
                className={dashboardMode === "global" ? "is-active" : ""}
                onClick={() => handleModeChange("global")}
                disabled={refreshing}
              >
                Global
              </button>
              <button
                type="button"
                className={dashboardMode === "marketplace" ? "is-active" : ""}
                onClick={() => handleModeChange("marketplace")}
                disabled={refreshing}
              >
                Marketplace
              </button>
            </div>
          ) : null}
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
          {isMarketplaceMode && !isRegionalAdmin ? (
            <label className="dashboard-filters__region">
              <span>Región ID</span>
              <input
                type="number"
                min="1"
                name="region_id"
                value={filters.region_id || ""}
                onChange={handleFilterChange}
                placeholder="Todas"
              />
            </label>
          ) : null}
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

      {isMarketplaceMode ? (
        <MarketplaceDashboardView dashboard={dashboard} loading={loading} />
      ) : (
        <>
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
        </>
      )}
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

function MarketplaceDashboardView({ dashboard, loading }) {
  return (
    <>
      <section className="dashboard-page__middle">
        <article className="dashboard-widget dashboard-widget--table">
          <WidgetHeader title="Centros regionales" description="Bruto, comisión y neto por región" />
          <MarketplaceRegionsTable items={dashboard.regions} loading={loading} />
        </article>

        <article className="dashboard-widget dashboard-widget--table">
          <WidgetHeader title="Transfers por estatus" description="Auditoría de Stripe Connect" />
          <MarketplaceTransferStatusList items={dashboard.transfers_by_status} loading={loading} />
        </article>
      </section>

      <section className="dashboard-page__middle">
        <article className="dashboard-widget dashboard-widget--table">
          <WidgetHeader title="Pedidos recientes" description="Pedidos regionales del periodo" />
          <MarketplaceOrdersTable items={dashboard.recent_orders} loading={loading} />
        </article>

        <article className="dashboard-widget dashboard-widget--table">
          <WidgetHeader title="Transfers recientes" description="Últimos movimientos por centro" />
          <MarketplaceTransfersTable items={dashboard.recent_transfers} loading={loading} />
        </article>
      </section>

      <section className="dashboard-page__bottom dashboard-page__bottom--single">
        <article className="dashboard-widget dashboard-widget--table">
          <WidgetHeader title="Stripe Connect" description="Estado de la cuenta conectada en el contexto actual" />
          <StripeConnectSummary value={dashboard.stripe_connect} loading={loading} />
        </article>
      </section>
    </>
  )
}

function MarketplaceRegionsTable({ items, loading }) {
  if (loading) return <TableSkeleton rows={5} />
  if (!items.length) return <EmptyState text="Sin centros regionales en el periodo." />

  return (
    <div className="dashboard-table dashboard-table--marketplace-regions">
      <div className="dashboard-table__head">
        <span>Región</span>
        <span>Pedidos</span>
        <span>Bruto</span>
        <span>Comisión</span>
        <span>Neto</span>
      </div>
      <div className="dashboard-table__body">
        {items.map((item) => (
          <div className="dashboard-table__row" key={item.region_id || item.region_slug || item.name}>
            <strong>{item.name || item.region_name || item.region_slug || "Regional"}</strong>
            <span>{formatNumber(item.orders)}</span>
            <span>{formatMoney(item.gross_amount)}</span>
            <span>{formatMoney(item.commission_amount)}</span>
            <span>{formatMoney(item.net_amount || item.transfer_amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MarketplaceTransferStatusList({ items, loading }) {
  if (loading) return <TableSkeleton rows={4} />
  if (!items.length) return <EmptyState text="Sin transfers registrados." />

  return (
    <div className="dashboard-marketplace-status-list">
      {items.map((item) => (
        <div className="dashboard-marketplace-status" key={item.status}>
          <div>
            <span className={`dashboard-status is-${item.status}`}>{translateTransferStatus(item.status)}</span>
            <strong>{formatMoney(item.amount || item.transfer_amount || item.total)}</strong>
          </div>
          <small>{formatNumber(item.count)} movimiento(s)</small>
        </div>
      ))}
    </div>
  )
}

function MarketplaceOrdersTable({ items, loading }) {
  if (loading) return <TableSkeleton rows={5} />
  if (!items.length) return <EmptyState text="Sin pedidos regionales recientes." />

  return (
    <div className="dashboard-table dashboard-table--marketplace-orders">
      <div className="dashboard-table__head">
        <span>Pedido</span>
        <span>Región</span>
        <span>Total</span>
        <span>Comisión</span>
        <span>Fecha</span>
      </div>
      <div className="dashboard-table__body">
        {items.map((item) => (
          <div className="dashboard-table__row" key={item.id || item.number}>
            <strong>{item.number || `#${item.id}`}</strong>
            <span>{item.region_name || item.region_slug || "Regional"}</span>
            <span>{formatMoney(item.total || item.gross_amount, item.currency)}</span>
            <span>{formatMoney(item.commission_amount, item.currency)}</span>
            <span>{formatDateTime(item.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MarketplaceTransfersTable({ items, loading }) {
  if (loading) return <TableSkeleton rows={5} />
  if (!items.length) return <EmptyState text="Sin transfers recientes." />

  return (
    <div className="dashboard-table dashboard-table--marketplace-transfers">
      <div className="dashboard-table__head">
        <span>Región</span>
        <span>Estatus</span>
        <span>Bruto</span>
        <span>Transfer</span>
        <span>Stripe</span>
      </div>
      <div className="dashboard-table__body">
        {items.map((item) => (
          <div className="dashboard-table__row" key={item.id || item.stripe_transfer_id || item.region_id}>
            <strong>{item.region_name || item.region_slug || `Región #${item.region_id}`}</strong>
            <span className={`dashboard-status is-${item.status}`}>{translateTransferStatus(item.status)}</span>
            <span>{formatMoney(item.gross_amount, item.currency)}</span>
            <span>{formatMoney(item.transfer_amount || item.net_amount, item.currency)}</span>
            <span>{item.stripe_transfer_id || item.stripe_account_id || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StripeConnectSummary({ value, loading }) {
  if (loading) return <TableSkeleton rows={3} />
  const items = normalizeStripeConnectItems(value)
  if (!items.length) return <EmptyState text="Sin información de Stripe Connect." />

  return (
    <div className="dashboard-stripe-connect">
      {items.map((item, index) => (
        <article key={item.region_id || item.account_id || index}>
          <div>
            <strong>{item.region_name || item.region_slug || item.name || "Cuenta regional"}</strong>
            <span className={`dashboard-status is-${item.status || "pending"}`}>
              {translateTransferStatus(item.status || "pending")}
            </span>
          </div>
          <small>{item.account_id || item.stripe_account_id || "Sin cuenta Stripe"}</small>
          <div className="dashboard-stripe-connect__checks">
            <span className={item.details_submitted ? "is-ok" : ""}>Datos {item.details_submitted ? "listos" : "pendientes"}</span>
            <span className={item.charges_enabled ? "is-ok" : ""}>Cobros {item.charges_enabled ? "activos" : "pendientes"}</span>
            <span className={item.payouts_enabled ? "is-ok" : ""}>Payouts {item.payouts_enabled ? "activos" : "pendientes"}</span>
          </div>
        </article>
      ))}
    </div>
  )
}

function normalizeStripeConnectItems(value) {
  const source = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : []

  return source.filter((item) => {
    if (!item || typeof item !== "object") return false

    return Boolean(
      item.region_id ||
      item.region_name ||
      item.region_slug ||
      item.account_id ||
      item.stripe_account_id ||
      item.status ||
      item.details_submitted ||
      item.charges_enabled ||
      item.payouts_enabled
    )
  })
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

function buildMarketplaceSummaryCards(summary) {
  return [
    {
      title: "Pedidos",
      value: formatNumber(summary.orders),
      icon: "bi-receipt",
      color: "is-cyan",
    },
    {
      title: "Bruto",
      value: formatMoney(summary.gross_amount),
      icon: "bi-cash-stack",
      color: "is-blue",
    },
    {
      title: "Comisión",
      value: formatMoney(summary.commission_amount),
      icon: "bi-percent",
      color: "is-orange",
    },
    {
      title: "Neto regional",
      value: formatMoney(summary.net_amount),
      icon: "bi-bank",
      color: "is-green",
    },
    {
      title: "Transfer estimado",
      value: formatMoney(summary.transfer_amount),
      icon: "bi-arrow-left-right",
      color: "is-purple",
    },
    {
      title: "Transferido",
      value: formatMoney(summary.transferred_amount),
      icon: "bi-check2-circle",
      color: "is-green",
    },
    {
      title: "Fallido",
      value: formatMoney(summary.failed_transfer_amount),
      icon: "bi-exclamation-triangle",
      color: "is-red",
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

function normalizeMarketplaceDashboardResponse(response) {
  const data = response?.data || response || {}
  const payload = data.data || data

  return {
    type: "marketplace",
    filters: {
      ...EMPTY_MARKETPLACE_DASHBOARD.filters,
      ...(payload.filters || {}),
    },
    summary: normalizeMarketplaceSummary(payload.summary),
    regions: normalizeMarketplaceRegions(payload.regions),
    transfers_by_status: normalizeTransfersByStatus(payload.transfers_by_status),
    stripe_connect: payload.stripe_connect || {},
    recent_orders: normalizeMarketplaceOrders(payload.recent_orders),
    recent_transfers: normalizeMarketplaceTransfers(payload.recent_transfers),
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

function normalizeMarketplaceSummary(summary = {}) {
  return Object.fromEntries(
    Object.entries(EMPTY_MARKETPLACE_DASHBOARD.summary).map(([key, fallback]) => [
      key,
      Number(summary?.[key] ?? fallback),
    ])
  )
}

function normalizeMarketplaceRegions(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        region_id: item.region_id ?? item.id ?? null,
        region_name: item.region_name || item.name || "",
        region_slug: item.region_slug || item.slug || "",
        name: item.name || item.region_name || "",
        orders: Number(item.orders ?? item.orders_count ?? 0),
        gross_amount: Number(item.gross_amount ?? item.total ?? 0),
        commission_amount: Number(item.commission_amount ?? 0),
        net_amount: Number(item.net_amount ?? item.transfer_amount ?? 0),
        transfer_amount: Number(item.transfer_amount ?? item.net_amount ?? 0),
      }))
    : []
}

function normalizeTransfersByStatus(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        status: item.status || "pending",
        count: Number(item.count ?? item.total_count ?? 0),
        amount: Number(item.amount ?? item.transfer_amount ?? item.total ?? 0),
        transfer_amount: Number(item.transfer_amount ?? item.amount ?? item.total ?? 0),
        total: Number(item.total ?? item.amount ?? 0),
      }))
    : []
}

function normalizeMarketplaceOrders(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id,
        number: item.number || `#${item.id}`,
        region_id: item.region_id ?? null,
        region_name: item.region_name || item.region?.name || "",
        region_slug: item.region_slug || item.region?.slug || "",
        total: Number(item.total ?? item.gross_amount ?? 0),
        gross_amount: Number(item.gross_amount ?? item.total ?? 0),
        commission_amount: Number(item.commission_amount ?? 0),
        currency: item.currency || "mxn",
        created_at: item.created_at || null,
      }))
    : []
}

function normalizeMarketplaceTransfers(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id,
        region_id: item.region_id ?? null,
        region_name: item.region_name || item.region?.name || "",
        region_slug: item.region_slug || item.region?.slug || "",
        stripe_account_id: item.stripe_account_id || item.account_id || "",
        stripe_transfer_id: item.stripe_transfer_id || "",
        status: item.status || "pending",
        gross_amount: Number(item.gross_amount ?? 0),
        commission_amount: Number(item.commission_amount ?? 0),
        transfer_amount: Number(item.transfer_amount ?? item.net_amount ?? 0),
        net_amount: Number(item.net_amount ?? item.transfer_amount ?? 0),
        currency: item.currency || "mxn",
      }))
    : []
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

function cleanFiltersForMode(filters = {}, mode = "global", isRegionalAdmin = false) {
  if (mode === "marketplace") return cleanMarketplaceFilters(filters, isRegionalAdmin)

  return {
    from: filters.from || "",
    to: filters.to || "",
  }
}

function cleanMarketplaceFilters(filters = {}, isRegionalAdmin = false) {
  const nextFilters = {
    from: filters.from || "",
    to: filters.to || "",
  }

  if (!isRegionalAdmin && filters.region_id) {
    nextFilters.region_id = filters.region_id
  }

  return nextFilters
}

function getUserRoleName(user) {
  return String(user?.role?.name || user?.role_name || user?.role || "").toLowerCase()
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

function translateTransferStatus(status) {
  const map = {
    pending: "Pendiente",
    pending_onboarding: "Onboarding pendiente",
    processing: "Procesando",
    paid: "Pagado",
    succeeded: "Completado",
    transferred: "Transferido",
    failed: "Fallido",
    canceled: "Cancelado",
    cancelled: "Cancelado",
  }

  return map[String(status || "").toLowerCase()] || status || "Sin estatus"
}

export default DashboardPage
