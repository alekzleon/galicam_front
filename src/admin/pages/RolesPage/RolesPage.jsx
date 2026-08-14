import { useEffect, useMemo, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel.jsx"
import { useAuth } from "../../../context/AuthContext.jsx"
import {
  createAdminRole,
  getAdminModules,
  getAdminRoles,
  updateAdminRoleModules,
} from "../../../services/api/adminRoleService.js"
import { notifyError, notifySuccess, notifyWarning } from "../../../utils/toast.js"
import { can } from "../../../utils/adminAccess.js"
import "./RolesPage.css"

const LOCKED_SUPER_ADMIN_MODULES = new Set(["dashboard", "usuarios", "roles"])

const INITIAL_FORM = {
  name: "",
  display_name: "",
  description: "",
  is_active: true,
  module_ids: [],
}

function RolesPage() {
  const { user } = useAuth()
  const [roles, setRoles] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingRoleId, setSavingRoleId] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelSaving, setPanelSaving] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)

  const canManageAccess = can(user, "roles")

  const modulesByGroup = useMemo(() => {
    return modules.reduce((groups, module) => {
      const groupKey = module.group_key || "otros"
      const group = groups.find((item) => item.key === groupKey)

      if (group) {
        group.items.push(module)
      } else {
        groups.push({
          key: groupKey,
          label: formatGroupName(groupKey),
          items: [module],
        })
      }

      return groups
    }, [])
  }, [modules])

  function getCurrentModuleIds(role) {
    return getRoleModuleIds(role)
  }

  useEffect(() => {
    fetchAccessMatrix()
  }, [])

  async function fetchAccessMatrix() {
    try {
      setLoading(true)
      const [rolesResponse, modulesResponse] = await Promise.all([
        getAdminRoles(),
        getAdminModules(),
      ])

      const normalizedModules = normalizeModules(modulesResponse?.data)

      setModules(normalizedModules)
      setRoles(normalizeRoles(rolesResponse?.data, normalizedModules))
    } catch (error) {
      console.error("Error al cargar roles y módulos:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar roles y módulos.")
      setRoles([])
      setModules([])
    } finally {
      setLoading(false)
    }
  }

  function openCreatePanel() {
    setForm(INITIAL_FORM)
    setPanelOpen(true)
  }

  function closePanel() {
    if (panelSaving) return

    setPanelOpen(false)
    setForm(INITIAL_FORM)
  }

  function handleFormChange(event) {
    const { name, value, checked, type } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  function toggleFormModule(moduleId) {
    setForm((prev) => {
      const currentIds = new Set(prev.module_ids)

      if (currentIds.has(moduleId)) {
        currentIds.delete(moduleId)
      } else {
        currentIds.add(moduleId)
      }

      return {
        ...prev,
        module_ids: Array.from(currentIds),
      }
    })
  }

  async function toggleMatrixModule(role, module) {
    if (!canManageAccess || isModuleLockedForRole(role, module)) return

    const previousIds = getCurrentModuleIds(role)
    const nextIds = toggleModuleId(previousIds, module.id)

    if (!nextIds.length) {
      notifyWarning("El rol debe conservar al menos un módulo.")
      return
    }

    updateRoleModulesInState(role.id, nextIds)

    try {
      setSavingRoleId(role.id)
      await updateAdminRoleModules(role.id, nextIds)
    } catch (error) {
      updateRoleModulesInState(role.id, previousIds)
      console.error("Error al actualizar permisos:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar los permisos.")
    } finally {
      setSavingRoleId(null)
    }
  }

  async function handleSubmitRole(event) {
    event.preventDefault()

    const payload = buildRolePayload()
    if (!validateRolePayload(payload)) return

    try {
      setPanelSaving(true)

      const response = await createAdminRole(payload)
      notifySuccess(response?.message || "Rol creado correctamente.")

      closePanel()
      fetchAccessMatrix()
    } catch (error) {
      console.error("Error al guardar rol:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar el rol.")
    } finally {
      setPanelSaving(false)
    }
  }

  function buildRolePayload() {
    return {
      name: form.name.trim(),
      display_name: form.display_name.trim(),
      description: form.description.trim(),
      is_active: Boolean(form.is_active),
      module_ids: form.module_ids,
    }
  }

  function validateRolePayload(payload) {
    if (!payload.name) {
      notifyWarning("Captura el identificador del rol.")
      return false
    }

    if (!payload.display_name) {
      notifyWarning("Captura el nombre visible del rol.")
      return false
    }

    if (!payload.module_ids.length) {
      notifyWarning("Selecciona al menos un módulo.")
      return false
    }

    return true
  }

  function updateRoleModulesInState(roleId, moduleIds) {
    setRoles((currentRoles) =>
      currentRoles.map((role) =>
        role.id === roleId
          ? {
              ...role,
              module_ids: moduleIds,
              modules: modules.filter((module) => moduleIds.includes(module.id)),
            }
          : role
      )
    )
  }

  function applyBaseRoleModules(roleId) {
    if (!roleId) return

    const baseRole = roles.find((role) => String(role.id) === String(roleId))

    if (!baseRole) return

    setForm((prev) => ({
      ...prev,
      module_ids: getRoleModuleIds(baseRole),
    }))
  }

  return (
    <>
      <AdminCard
        title="Roles y permisos"
        subtitle="Administra módulos asignados por rol."
        right={
          <div className="roles-page__header-actions">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={fetchAccessMatrix}
              disabled={loading}
            >
              Actualizar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreatePanel}
              disabled={!canManageAccess}
            >
              Nuevo rol
            </button>
          </div>
        }
      >
        <div className="roles-page">
          {!canManageAccess ? (
            <div className="roles-page__notice">
              Tu rol actual no permite administrar roles ni permisos.
            </div>
          ) : null}

          <div className="roles-page__summary">
            <div>
              <span>Roles</span>
              <strong>{roles.length}</strong>
            </div>
            <div>
              <span>Módulos</span>
              <strong>{modules.length}</strong>
            </div>
            <div>
              <span>Grupos</span>
              <strong>{modulesByGroup.length}</strong>
            </div>
          </div>

          <div className="roles-page__matrix-wrap">
            <table className="roles-page__matrix">
              <thead>
                <tr>
                  <th className="roles-page__role-heading">Rol</th>
                  {modules.map((module) => (
                    <th key={module.id}>
                      <span>{module.display_name || module.name}</span>
                      <small>{formatGroupName(module.group_key)}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={modules.length + 1} className="roles-page__empty">
                      Cargando matriz de permisos...
                    </td>
                  </tr>
                ) : roles.length === 0 || modules.length === 0 ? (
                  <tr>
                    <td colSpan={modules.length + 1} className="roles-page__empty">
                      No hay roles o módulos disponibles.
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                      <tr key={role.id}>
                        <td className="roles-page__role-cell">
                          <strong>{role.display_name || role.name}</strong>
                          <span>{role.name}</span>
                          <small className={role.is_active ? "is-active" : "is-inactive"}>
                            {role.is_active ? "Activo" : "Inactivo"}
                          </small>
                        </td>
                        {modules.map((module) => {
                          const checked = getCurrentModuleIds(role).includes(module.id)
                          const locked = isModuleLockedForRole(role, module)

                          return (
                            <td key={module.id} className="roles-page__permission-cell">
                              <label
                                className={`roles-page__permission ${
                                  checked ? "roles-page__permission--checked" : ""
                                } ${locked ? "roles-page__permission--locked" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!canManageAccess || locked || savingRoleId === role.id}
                                  onChange={() => toggleMatrixModule(role, module)}
                                />
                                <span>{checked ? "Si" : "No"}</span>
                              </label>
                            </td>
                          )
                        })}
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminCard>

      <AdminSidePanel
        isOpen={panelOpen}
        title="Nuevo rol"
        subtitle="Asigna datos generales y módulos permitidos."
        onClose={closePanel}
        closeDisabled={panelSaving}
        width="lg"
        footer={
          <div className="roles-page__panel-actions">
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
              form="role-detail-form"
              className="btn btn-primary"
              disabled={panelSaving}
            >
              {panelSaving ? "Guardando..." : "Guardar rol"}
            </button>
          </div>
        }
      >
        <form id="role-detail-form" className="roles-page__form" onSubmit={handleSubmitRole}>
          <section className="roles-page__form-section">
            <h4>Datos del rol</h4>
            <div className="row">
              <div className="col-12 col-md-6">
                <label className="form-label">Identificador</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="ventas"
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Nombre visible</label>
                <input
                  type="text"
                  name="display_name"
                  className="form-control"
                  value={form.display_name}
                  onChange={handleFormChange}
                  placeholder="Ventas"
                />
              </div>
              <div className="col-12">
                <label className="form-label">Descripción</label>
                <textarea
                  name="description"
                  className="form-control"
                  value={form.description}
                  onChange={handleFormChange}
                  rows="3"
                  placeholder="Equipo comercial"
                />
              </div>
              <div className="col-12">
                <label className="form-label">Basar permisos en</label>
                <select
                  className="form-control"
                  value=""
                  onChange={(event) => applyBaseRoleModules(event.target.value)}
                >
                  <option value="">Selecciona un rol base</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.display_name || role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <label className="roles-page__switch">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleFormChange}
                  />
                  <span>Rol activo</span>
                </label>
              </div>
            </div>
          </section>

          <section className="roles-page__form-section">
            <h4>Módulos</h4>
            <div className="roles-page__module-groups">
              {modulesByGroup.map((group) => (
                <div className="roles-page__module-group" key={group.key}>
                  <div className="roles-page__module-group-title">{group.label}</div>
                  {group.items.map((module) => {
                    const checked = form.module_ids.includes(module.id)

                    return (
                      <label className="roles-page__module-option" key={module.id}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFormModule(module.id)}
                        />
                        <span>
                          <strong>{module.display_name || module.name}</strong>
                          <small>{module.name}</small>
                        </span>
                      </label>
                    )
                  })}
                </div>
              ))}
            </div>
          </section>
        </form>
      </AdminSidePanel>
    </>
  )
}

function normalizeRoles(data, modules = []) {
  return Array.isArray(data) ? data.map((role) => normalizeRole(role, modules)) : []
}

function normalizeRole(role, modules = []) {
  return {
    ...role,
    modules: normalizeRoleModules(role?.modules, modules),
    module_ids: normalizeRoleModuleIds(role, modules),
  }
}

function normalizeRoleModules(roleModules, modules = []) {
  if (!Array.isArray(roleModules)) return []

  return roleModules
    .map((roleModule) => {
      if (typeof roleModule === "object" && roleModule !== null) return roleModule

      const moduleByName = modules.find((module) => module.name === roleModule)

      return moduleByName || null
    })
    .filter(Boolean)
}

function normalizeModules(data) {
  return Array.isArray(data)
    ? data
        .map((module) => ({
          ...module,
          id: Number(module.id),
          sort_order: Number(module.sort_order || 0),
        }))
        .sort((a, b) => a.sort_order - b.sort_order || a.display_name.localeCompare(b.display_name))
    : []
}

function normalizeRoleModuleIds(role, modules = []) {
  if (Array.isArray(role?.module_ids)) {
    return role.module_ids.map(Number).filter(Boolean)
  }

  return normalizeRoleModules(role?.modules, modules)
    .map((module) => Number(module.id))
    .filter(Boolean)
}

function getRoleModuleIds(role) {
  if (Array.isArray(role?.module_ids)) {
    return role.module_ids.map(Number).filter(Boolean)
  }

  if (!Array.isArray(role?.modules)) return []

  return role.modules
    .map((module) => {
      if (typeof module === "object") return Number(module.id)
      return null
    })
    .filter(Boolean)
}

function toggleModuleId(moduleIds, moduleId) {
  const nextIds = new Set(moduleIds)

  if (nextIds.has(moduleId)) {
    nextIds.delete(moduleId)
  } else {
    nextIds.add(moduleId)
  }

  return Array.from(nextIds)
}

function formatGroupName(groupKey = "") {
  const labels = {
    analitica: "Analítica",
    administracion: "Administración",
    catalogo: "Catálogo",
    operacion: "Operación",
    finanzas: "Finanzas",
    marketing: "Marketing",
    control: "Control",
    sistema: "Sistema",
    front: "Front",
  }

  return labels[groupKey] || groupKey.replaceAll("_", " ")
}

function isModuleLockedForRole(role, module) {
  return role?.name === "super_admin" && LOCKED_SUPER_ADMIN_MODULES.has(module?.name)
}

export default RolesPage
