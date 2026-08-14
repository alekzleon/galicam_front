import { useEffect, useMemo, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel.jsx"
import { getAdminLog, getAdminLogs } from "../../../services/api/adminLogsService.js"
import { notifyError } from "../../../utils/toast.js"
import "./LogsPage.css"

const MODULE_OPTIONS = [
  { value: "", label: "Todos los módulos" },
  { value: "products", label: "Productos" },
  { value: "promotions", label: "Promociones" },
  { value: "gift_items", label: "Regalos" },
  { value: "banners", label: "Banners" },
  { value: "monthly_promotions", label: "Promociones del mes" },
  { value: "users", label: "Usuarios" },
  { value: "customers", label: "Clientes" },
  { value: "profiles", label: "Perfiles" },
  { value: "addresses", label: "Direcciones" },
  { value: "roles", label: "Roles" },
  { value: "categories", label: "Categorías" },
  { value: "families", label: "Familias" },
]

const ACTION_OPTIONS = [
  { value: "", label: "Todas las acciones" },
  { value: "created", label: "Alta" },
  { value: "updated", label: "Cambio" },
  { value: "deleted", label: "Baja" },
  { value: "price_changed", label: "Cambio de precio" },
  { value: "products_changed", label: "Productos asociados" },
  { value: "gifts_changed", label: "Regalos asociados" },
]

const ACTOR_OPTIONS = [
  { value: "", label: "Todos los actores" },
  { value: "admin", label: "Admin" },
  { value: "customer", label: "Cliente" },
  { value: "system", label: "Sistema" },
]

const ENTITY_OPTIONS = [
  { value: "", label: "Todas las entidades" },
  { value: "product", label: "Producto" },
  { value: "promotion", label: "Promoción" },
  { value: "gift_item", label: "Regalo" },
  { value: "banner", label: "Banner" },
  { value: "monthly_promotion", label: "Promoción del mes" },
  { value: "user", label: "Usuario" },
  { value: "customer", label: "Cliente" },
  { value: "profile", label: "Perfil" },
  { value: "address", label: "Dirección" },
  { value: "role", label: "Rol" },
  { value: "category", label: "Categoría" },
  { value: "family", label: "Familia" },
]

const INITIAL_FILTERS = {
  search: "",
  module: "",
  action: "",
  actor_type: "",
  entity_type: "",
  entity_id: "",
  from: "",
  to: "",
  page: 1,
  per_page: 20,
}

const INITIAL_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
  from: 0,
  to: 0,
}

function LogsPage() {
  const [logs, setLogs] = useState([])
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [pagination, setPagination] = useState(INITIAL_PAGINATION)
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.page,
    filters.per_page,
    filters.module,
    filters.action,
    filters.actor_type,
    filters.entity_type,
    filters.from,
    filters.to,
  ])

  const activeFilterCount = useMemo(() => {
    return [
      filters.search,
      filters.module,
      filters.action,
      filters.actor_type,
      filters.entity_type,
      filters.entity_id,
      filters.from,
      filters.to,
    ].filter(Boolean).length
  }, [filters])

  async function fetchLogs(customFilters = null) {
    try {
      setLoading(true)
      const sourceFilters = customFilters || filters
      const params = {
        page: sourceFilters.page,
        per_page: sourceFilters.per_page,
      }

      Object.entries(sourceFilters).forEach(([key, value]) => {
        if (["page", "per_page"].includes(key)) return
        if (String(value || "").trim() === "") return
        params[key] = String(value).trim()
      })

      const response = await getAdminLogs(params)
      const items = Array.isArray(response?.data) ? response.data : []
      const meta = response?.meta || {}

      setLogs(items)
      setPagination({
        current_page: meta.current_page || 1,
        last_page: meta.last_page || 1,
        per_page: Number(meta.per_page || sourceFilters.per_page),
        total: meta.total || 0,
        from: meta.from || 0,
        to: meta.to || 0,
      })
    } catch (error) {
      console.error("Error al obtener logs:", error)
      notifyError(error?.response?.data?.message || "No fue posible cargar los logs.")
      setLogs([])
      setPagination(INITIAL_PAGINATION)
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange(event) {
    const { name, value } = event.target

    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }))
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    const nextFilters = {
      ...filters,
      page: 1,
    }

    setFilters(nextFilters)
    fetchLogs(nextFilters)
  }

  function handleClearFilters() {
    setFilters(INITIAL_FILTERS)
    fetchLogs(INITIAL_FILTERS)
  }

  async function handleOpenPanel(log) {
    try {
      setPanelOpen(true)
      setSelectedLog(log)
      setPanelLoading(true)

      const response = await getAdminLog(log.id)
      setSelectedLog(response?.data || log)
    } catch (error) {
      console.error("Error al cargar detalle del log:", error)
      notifyError(error?.response?.data?.message || "No fue posible cargar el detalle del log.")
      setSelectedLog(log)
    } finally {
      setPanelLoading(false)
    }
  }

  function handleClosePanel() {
    setPanelOpen(false)
    setSelectedLog(null)
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > pagination.last_page) return

    setFilters((prev) => ({
      ...prev,
      page: nextPage,
    }))
  }

  function renderPagination() {
    if (pagination.last_page <= 1) return null

    const pages = []
    const start = Math.max(1, pagination.current_page - 2)
    const end = Math.min(pagination.last_page, pagination.current_page + 2)

    for (let i = start; i <= end; i += 1) {
      pages.push(i)
    }

    return (
      <div className="logs-page__pagination">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => handlePageChange(pagination.current_page - 1)}
          disabled={pagination.current_page === 1 || loading}
        >
          Anterior
        </button>

        <div className="logs-page__pagination-pages">
          {pages.map((page) => (
            <button
              key={page}
              type="button"
              className={`btn btn-sm ${
                page === pagination.current_page ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => handlePageChange(page)}
              disabled={loading}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => handlePageChange(pagination.current_page + 1)}
          disabled={pagination.current_page === pagination.last_page || loading}
        >
          Siguiente
        </button>
      </div>
    )
  }

  return (
    <>
      <AdminCard
        title="Logs"
        subtitle="Consulta movimientos de altas, cambios y bajas registrados en el sistema"
        right={
          activeFilterCount ? (
            <span className="badge text-bg-primary">{activeFilterCount} filtros activos</span>
          ) : null
        }
      >
        <div className="logs-page">
          <form className="logs-page__filters row g-3 align-items-end" onSubmit={handleSearchSubmit}>
            <div className="col-12 col-lg-4">
              <label className="form-label">Buscar texto</label>
              <input
                type="text"
                name="search"
                className="form-control"
                placeholder="Resumen, campo, precio, usuario..."
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>

            <div className="col-12 col-md-4 col-lg-2">
              <label className="form-label">Módulo</label>
              <select
                name="module"
                className="form-select"
                value={filters.module}
                onChange={handleFilterChange}
              >
                {MODULE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-4 col-lg-2">
              <label className="form-label">Acción</label>
              <select
                name="action"
                className="form-select"
                value={filters.action}
                onChange={handleFilterChange}
              >
                {ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-4 col-lg-2">
              <label className="form-label">Actor</label>
              <select
                name="actor_type"
                className="form-select"
                value={filters.actor_type}
                onChange={handleFilterChange}
              >
                {ACTOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-6 col-lg-2">
              <label className="form-label">Mostrar</label>
              <select
                name="per_page"
                className="form-select"
                value={filters.per_page}
                onChange={handleFilterChange}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="col-12 col-md-4 col-lg-2">
              <label className="form-label">Entidad</label>
              <select
                name="entity_type"
                className="form-select"
                value={filters.entity_type}
                onChange={handleFilterChange}
              >
                {ENTITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-6 col-md-4 col-lg-2">
              <label className="form-label">ID entidad</label>
              <input
                type="number"
                min="1"
                name="entity_id"
                className="form-control"
                placeholder="Ej. 15"
                value={filters.entity_id}
                onChange={handleFilterChange}
              />
            </div>

            <div className="col-6 col-md-4 col-lg-2">
              <label className="form-label">Desde</label>
              <input
                type="date"
                name="from"
                className="form-control"
                value={filters.from}
                onChange={handleFilterChange}
              />
            </div>

            <div className="col-6 col-md-4 col-lg-2">
              <label className="form-label">Hasta</label>
              <input
                type="date"
                name="to"
                className="form-control"
                value={filters.to}
                onChange={handleFilterChange}
              />
            </div>

            <div className="col-12 col-lg-4">
              <div className="logs-page__filter-actions">
                <button type="submit" className="btn btn-primary">
                  Buscar
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClearFilters}
                >
                  Limpiar
                </button>
              </div>
            </div>
          </form>

          <div className="logs-page__summary">
            <div className="logs-page__summary-text">
              {loading ? (
                <span>Cargando logs...</span>
              ) : (
                <span>
                  Mostrando <strong>{pagination.from || 0}</strong> -{" "}
                  <strong>{pagination.to || 0}</strong> de <strong>{pagination.total}</strong>{" "}
                  registros
                </span>
              )}
            </div>
          </div>

          <div className="table-responsive logs-page__table-wrapper">
            <table className="table table-hover align-middle logs-page__table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Actor</th>
                  <th>Módulo</th>
                  <th>Acción</th>
                  <th>Resumen</th>
                  <th>Entidad</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      Cargando información...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      No se encontraron logs.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="logs-page__row"
                      onClick={() => handleOpenPanel(log)}
                    >
                      <td className="logs-page__date">{formatDateTime(log.created_at)}</td>
                      <td>
                        <div className="logs-page__actor">
                          <strong>{getActorName(log)}</strong>
                          <span>{formatLabel(log.actor_type)}</span>
                        </div>
                      </td>
                      <td>{formatLabel(log.module)}</td>
                      <td>
                        <span className={`logs-page__action logs-page__action--${getActionTone(log.action)}`}>
                          {formatLabel(log.action)}
                        </span>
                      </td>
                      <td className="logs-page__summary-cell">{log.summary || "-"}</td>
                      <td>{formatEntity(log.entity)}</td>
                      <td>{log.ip || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {renderPagination()}
        </div>
      </AdminCard>

      <LogDetailPanel
        isOpen={panelOpen}
        loading={panelLoading}
        log={selectedLog}
        onClose={handleClosePanel}
      />
    </>
  )
}

function LogDetailPanel({ isOpen, loading, log, onClose }) {
  return (
    <AdminSidePanel
      isOpen={isOpen}
      title="Detalle del log"
      subtitle={log ? `Registro #${log.id} · ${formatDateTime(log.created_at)}` : "Cargando registro"}
      onClose={onClose}
      width="lg"
      footer={
        <div className="logs-detail__footer">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="logs-detail__loading">Cargando detalle del log...</div>
      ) : log ? (
        <div className="logs-detail">
          <section className="logs-detail__hero">
            <div>
              <h3>{log.summary || "Movimiento registrado"}</h3>
              <p>
                {formatLabel(log.module)} · {formatLabel(log.action)}
              </p>
            </div>
            <span className={`logs-page__action logs-page__action--${getActionTone(log.action)}`}>
              {formatLabel(log.action)}
            </span>
          </section>

          <section className="logs-detail__grid">
            <InfoItem label="Actor" value={getActorName(log)} hint={getActorMeta(log)} />
            <InfoItem label="Tipo de actor" value={formatLabel(log.actor_type)} />
            <InfoItem label="Entidad" value={formatEntity(log.entity)} />
            <InfoItem label="IP" value={log.ip || "-"} />
            <InfoItem label="Fecha" value={formatDateTime(log.created_at)} />
            <InfoItem label="User agent" value={log.user_agent || "-"} wide />
          </section>

          <section className="logs-detail__section">
            <div className="logs-detail__section-header">
              <h4>Cambios registrados</h4>
              <span>Valores anteriores y nuevos del movimiento</span>
            </div>
            <div className="logs-detail__changes">
              <JsonBlock title="Valores anteriores" value={log.old_values} />
              <JsonBlock title="Valores nuevos" value={log.new_values} />
            </div>
          </section>

          <section className="logs-detail__section">
            <div className="logs-detail__section-header">
              <h4>Metadata</h4>
              <span>Contexto adicional enviado por backend</span>
            </div>
            <JsonBlock value={log.metadata} />
          </section>
        </div>
      ) : (
        <div className="logs-detail__loading">Selecciona un log para ver su detalle.</div>
      )}
    </AdminSidePanel>
  )
}

function InfoItem({ label, value, hint, wide = false }) {
  return (
    <div className={`logs-detail__info ${wide ? "logs-detail__info--wide" : ""}`}>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  )
}

function JsonBlock({ title, value }) {
  const hasContent =
    value !== null &&
    value !== undefined &&
    !(typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)

  return (
    <div className="logs-detail__json-card">
      {title ? <h5>{title}</h5> : null}
      {hasContent ? (
        <pre>{JSON.stringify(value, null, 2)}</pre>
      ) : (
        <p className="logs-detail__empty-json">Sin información registrada.</p>
      )}
    </div>
  )
}

function formatDateTime(value) {
  if (!value) return "-"
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatLabel(value) {
  if (!value) return "-"

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatEntity(entity) {
  if (!entity) return "-"

  const type = entity.type || entity.entity_type || "-"
  const id = entity.id || entity.entity_id

  return id ? `${formatLabel(type)} #${id}` : formatLabel(type)
}

function getActorName(log) {
  return log?.actor?.name || log?.actor?.username || log?.actor?.email || "Sistema"
}

function getActorMeta(log) {
  const actor = log?.actor || {}
  return actor.email || actor.username || ""
}

function getActionTone(action) {
  if (["created", "attached", "activated"].includes(action)) return "success"
  if (["deleted", "detached", "disabled"].includes(action)) return "danger"
  if (["price_changed", "updated", "products_changed", "gifts_changed"].includes(action)) {
    return "warning"
  }

  return "neutral"
}

export default LogsPage
