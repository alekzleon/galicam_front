import { useEffect, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel.jsx"
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUser,
  getAdminUserFormOptions,
  getAdminUsers,
  updateAdminUser,
} from "../../../services/api/adminUserService.js"
import { notifyError, notifySuccess, notifyWarning } from "../../../utils/toast.js"
import "./UsersPage.css"

const INITIAL_FORM = {
  role_id: "",
  name: "",
  username: "",
  email: "",
  password: "",
}

const DEFAULT_SORT_OPTIONS = [
  { value: "latest", label: "Más recientes" },
  { value: "oldest", label: "Más antiguos" },
  { value: "name_asc", label: "Nombre A-Z" },
  { value: "name_desc", label: "Nombre Z-A" },
  { value: "email_asc", label: "Correo A-Z" },
  { value: "email_desc", label: "Correo Z-A" },
]

function UsersPage() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [sortOptions, setSortOptions] = useState(DEFAULT_SORT_OPTIONS)
  const [loading, setLoading] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const [filters, setFilters] = useState({
    search: "",
    role_id: "",
    role_is_active: "",
    sort_by: "latest",
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

  const [panelOpen, setPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState("create")
  const [panelLoading, setPanelLoading] = useState(false)
  const [panelSaving, setPanelSaving] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)

  useEffect(() => {
    fetchOptions()
  }, [])

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.per_page, filters.role_id, filters.role_is_active, filters.sort_by])

  async function fetchOptions() {
    try {
      setOptionsLoading(true)
      const response = await getAdminUserFormOptions()
      const data = response?.data || {}

      setRoles(Array.isArray(data.roles) ? data.roles : [])
      setSortOptions(
        Array.isArray(data.sort_options) && data.sort_options.length
          ? data.sort_options
          : DEFAULT_SORT_OPTIONS
      )
    } catch (error) {
      console.error("Error al cargar opciones de usuarios:", error?.response?.data || error)
      notifyWarning("No fue posible cargar las opciones del formulario.")
    } finally {
      setOptionsLoading(false)
    }
  }

  async function fetchUsers(customSearch = null) {
    try {
      setLoading(true)

      const searchValue = customSearch !== null ? customSearch : filters.search
      const params = {
        page: filters.page,
        per_page: filters.per_page,
        sort_by: filters.sort_by,
      }

      if (searchValue?.trim()) params.search = searchValue.trim()
      if (filters.role_id) params.role_id = filters.role_id
      if (filters.role_is_active !== "") params.role_is_active = filters.role_is_active

      const response = await getAdminUsers(params)
      const meta = response?.meta || {}

      setUsers(Array.isArray(response?.data) ? response.data : [])
      setPagination({
        current_page: meta.current_page || 1,
        last_page: meta.last_page || 1,
        per_page: Number(meta.per_page || filters.per_page),
        total: meta.total || 0,
        from: meta.from || 0,
        to: meta.to || 0,
      })
    } catch (error) {
      console.error("Error al cargar usuarios:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar los usuarios.")
      setUsers([])
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
    setFilters((prev) => ({ ...prev, page: 1 }))
    fetchUsers(filters.search)
  }

  function handleClearFilters() {
    const nextFilters = {
      search: "",
      role_id: "",
      role_is_active: "",
      sort_by: "latest",
      page: 1,
      per_page: 15,
    }

    setFilters(nextFilters)
    fetchUsers("")
  }

  function openCreatePanel() {
    setPanelMode("create")
    setSelectedUserId(null)
    setForm(INITIAL_FORM)
    setPanelOpen(true)
    setPanelLoading(false)
  }

  async function openEditPanel(userId) {
    try {
      setPanelMode("edit")
      setSelectedUserId(userId)
      setPanelOpen(true)
      setPanelLoading(true)

      const response = await getAdminUser(userId)
      const user = response?.data || {}

      setForm({
        role_id: user.role_id ?? user.role?.id ?? "",
        name: user.name || "",
        username: user.username || "",
        email: user.email || "",
        password: "",
      })
    } catch (error) {
      console.error("Error al cargar usuario:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar el usuario.")
      closePanel()
    } finally {
      setPanelLoading(false)
    }
  }

  function closePanel() {
    if (panelSaving) return

    setPanelOpen(false)
    setPanelMode("create")
    setSelectedUserId(null)
    setPanelLoading(false)
    setForm(INITIAL_FORM)
  }

  function handleFormChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function buildPayload() {
    const payload = {
      role_id: Number(form.role_id),
      name: form.name.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
    }

    if (form.password.trim()) {
      payload.password = form.password.trim()
    }

    return payload
  }

  function validatePayload(payload) {
    if (!payload.role_id) {
      notifyWarning("Selecciona un rol para el usuario.")
      return false
    }

    if (!payload.name || !payload.username || !payload.email) {
      notifyWarning("Completa nombre, usuario y correo.")
      return false
    }

    if (panelMode === "create" && !form.password.trim()) {
      notifyWarning("La contraseña es obligatoria al crear un usuario.")
      return false
    }

    return true
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const payload = buildPayload()
    if (!validatePayload(payload)) return

    try {
      setPanelSaving(true)

      if (panelMode === "create") {
        const response = await createAdminUser(payload)
        notifySuccess(response?.message || "Usuario creado correctamente.")
      } else {
        if (!selectedUserId) return
        const response = await updateAdminUser(selectedUserId, payload)
        notifySuccess(response?.message || "Usuario actualizado correctamente.")
      }

      closePanel()
      fetchUsers()
    } catch (error) {
      console.error("Error al guardar usuario:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar el usuario.")
    } finally {
      setPanelSaving(false)
    }
  }

  async function handleDelete(userId) {
    if (!window.confirm("¿Eliminar este usuario?")) return

    try {
      setActionLoadingId(userId)
      const response = await deleteAdminUser(userId)
      notifySuccess(response?.message || "Usuario eliminado correctamente.")
      fetchUsers()
    } catch (error) {
      console.error("Error al eliminar usuario:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar el usuario.")
    } finally {
      setActionLoadingId(null)
    }
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > pagination.last_page) return
    setFilters((prev) => ({ ...prev, page: nextPage }))
  }

  function renderPagination() {
    if (pagination.last_page <= 1) return null

    const pages = []
    const start = Math.max(1, pagination.current_page - 2)
    const end = Math.min(pagination.last_page, pagination.current_page + 2)

    for (let i = start; i <= end; i += 1) pages.push(i)

    return (
      <div className="user-page__pagination">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => handlePageChange(pagination.current_page - 1)}
          disabled={pagination.current_page === 1 || loading}
        >
          Anterior
        </button>

        <div className="user-page__pagination-pages">
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
        title="Usuarios"
        subtitle="Gestiona usuarios internos y sus roles."
        right={
          <button type="button" className="btn btn-primary" onClick={openCreatePanel}>
            Nuevo usuario
          </button>
        }
      >
        <div className="user-page">
          <form className="user-page__filters row g-3 align-items-end" onSubmit={handleSearchSubmit}>
            <div className="col-12 col-lg-3">
              <label className="form-label">Buscar usuario</label>
              <input
                type="text"
                name="search"
                className="form-control"
                placeholder="Nombre, usuario o correo..."
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>

            <div className="col-12 col-md-3 col-lg-2">
              <label className="form-label">Rol</label>
              <select
                name="role_id"
                className="form-select"
                value={filters.role_id}
                onChange={handleFilterChange}
                disabled={optionsLoading}
              >
                <option value="">Todos</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.display_name || role.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-3 col-lg-2">
              <label className="form-label">Estado del rol</label>
              <select
                name="role_is_active"
                className="form-select"
                value={filters.role_is_active}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                <option value="true">Roles activos</option>
                <option value="false">Roles inactivos</option>
              </select>
            </div>

            <div className="col-12 col-md-3 col-lg-2">
              <label className="form-label">Orden</label>
              <select
                name="sort_by"
                className="form-select"
                value={filters.sort_by}
                onChange={handleFilterChange}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-6 col-md-3 col-lg-1">
              <label className="form-label">Mostrar</label>
              <select
                name="per_page"
                className="form-select"
                value={filters.per_page}
                onChange={handleFilterChange}
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="col-6 col-lg-2">
              <div className="user-page__filter-actions">
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

          <div className="user-page__summary">
            <div className="user-page__summary-text">
              {loading ? (
                <span>Cargando usuarios...</span>
              ) : (
                <span>
                  Mostrando <strong>{pagination.from || 0}</strong> - <strong>{pagination.to || 0}</strong> de{" "}
                  <strong>{pagination.total}</strong> usuarios
                </span>
              )}
            </div>
          </div>

          <div className="table-responsive user-page__table-wrapper">
            <table className="table table-hover align-middle user-page__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Verificado</th>
                  <th>Interno</th>
                  <th>Creado</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      Cargando información...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      No se encontraron usuarios.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const role = user.role || {}

                    return (
                      <tr
                        key={user.id}
                        className="user-page__row"
                        onClick={() => openEditPanel(user.id)}
                      >
                        <td className="fw-semibold">{user.id}</td>
                        <td>
                          <div className="user-page__identity">
                            <strong>{user.name}</strong>
                            <span>{user.updated_at ? `Actualizado: ${formatDate(user.updated_at)}` : ""}</span>
                          </div>
                        </td>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>
                          <div className="user-page__role">
                            <span className={`badge text-bg-${role.is_active ? "success" : "secondary"}`}>
                              {role.display_name || role.name || "Sin rol"}
                            </span>
                            {role.description ? <small>{role.description}</small> : null}
                          </div>
                        </td>
                        <td>
                          <span className={`badge text-bg-${user.email_verified_at ? "success" : "warning"}`}>
                            {user.email_verified_at ? "Sí" : "Pendiente"}
                          </span>
                        </td>
                        <td>{user.is_internal ? "Sí" : "No"}</td>
                        <td>{formatDate(user.created_at)}</td>
                        <td className="text-end">
                          <div
                            className="user-page__actions"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEditPanel(user.id)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(user.id)}
                              disabled={actionLoadingId === user.id}
                            >
                              {actionLoadingId === user.id ? "Eliminando..." : "Eliminar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {renderPagination()}
        </div>
      </AdminCard>

      <AdminSidePanel
        isOpen={panelOpen}
        title={panelMode === "create" ? "Nuevo usuario" : "Editar usuario"}
        subtitle="Asigna datos de acceso y rol administrativo."
        onClose={closePanel}
        closeDisabled={panelSaving}
        width="lg"
        footer={
          <div className="user-detail__footer-actions">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={closePanel}
              disabled={panelSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="user-detail-form"
              className="btn btn-primary"
              disabled={panelSaving || panelLoading}
            >
              {panelSaving ? "Guardando..." : panelMode === "create" ? "Crear usuario" : "Guardar cambios"}
            </button>
          </div>
        }
      >
        {panelLoading ? (
          <div className="user-page__panel-loading">Cargando usuario...</div>
        ) : (
          <form id="user-detail-form" className="user-detail" onSubmit={handleSubmit}>
            <section className="user-detail__card">
              <h4 className="user-detail__card-title">Datos generales</h4>
              <div className="row">
                <div className="col-12 col-md-6">
                  <label className="form-label">Nombre</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="Juan Perez"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    name="username"
                    className="form-control"
                    value={form.username}
                    onChange={handleFormChange}
                    placeholder="juan"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Correo</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="juan@correo.com"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Rol</label>
                  <select
                    name="role_id"
                    className="form-select"
                    value={form.role_id}
                    onChange={handleFormChange}
                    disabled={optionsLoading}
                  >
                    <option value="">Selecciona un rol</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.display_name || role.name}
                        {role.is_active ? "" : " (inactivo)"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label">
                    {panelMode === "create" ? "Contraseña" : "Nueva contraseña"}
                  </label>
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    value={form.password}
                    onChange={handleFormChange}
                    placeholder={panelMode === "create" ? "password123" : "Dejar vacío para conservar"}
                  />
                </div>
              </div>
            </section>

            <section className="user-detail__card">
              <h4 className="user-detail__card-title">Resumen</h4>
              <div className="user-detail__stats">
                <div className="user-detail__stat">
                  <span className="user-detail__stat-label">Modo</span>
                  <strong className="user-detail__stat-value">
                    {panelMode === "create" ? "Creación" : "Edición"}
                  </strong>
                </div>
                <div className="user-detail__stat">
                  <span className="user-detail__stat-label">Rol seleccionado</span>
                  <strong className="user-detail__stat-value">
                    {roles.find((role) => String(role.id) === String(form.role_id))?.display_name || "-"}
                  </strong>
                </div>
              </div>
            </section>
          </form>
        )}
      </AdminSidePanel>
    </>
  )
}

function formatDate(value) {
  if (!value) return "-"

  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default UsersPage
