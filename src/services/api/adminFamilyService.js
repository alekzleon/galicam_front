import api from "./api.js"

export async function getAdminFamilies(params = {}) {
  const { data } = await api.get("/admin/families", { params })
  return data
}

export async function getAdminFamily(familyId) {
  const { data } = await api.get(`/admin/families/${familyId}`)
  return data
}

export async function createAdminFamily(payload) {
  const { data } = await api.post("/admin/families", payload)
  return data
}

export async function updateAdminFamily(familyId, payload) {
  const { data } = await api.patch(`/admin/families/${familyId}`, payload)
  return data
}

export async function updateAdminFamilyStatus(familyId, isActive) {
  const { data } = await api.patch(`/admin/families/${familyId}/status`, {
    is_active: isActive,
  })

  return data
}

export async function deleteAdminFamily(familyId) {
  const { data } = await api.delete(`/admin/families/${familyId}`)
  return data
}
