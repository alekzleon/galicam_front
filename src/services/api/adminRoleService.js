import api from "./api.js"

export async function getAdminRoles(params = {}) {
  const { data } = await api.get("/admin/roles", { params })
  return data
}

export async function getAdminRole(id) {
  const { data } = await api.get(`/admin/roles/${id}`)
  return data
}

export async function getAdminModules(params = {}) {
  const { data } = await api.get("/admin/modules", { params })
  return data
}

export async function createAdminRole(payload) {
  const { data } = await api.post("/admin/roles", payload)
  return data
}

export async function updateAdminRole(id, payload) {
  const { data } = await api.put(`/admin/roles/${id}`, payload)
  return data
}

export async function updateAdminRoleModules(id, moduleIds) {
  const { data } = await api.put(`/admin/roles/${id}/modules`, {
    module_ids: moduleIds,
  })
  return data
}
