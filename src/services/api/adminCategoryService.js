import api from "./api.js"

export async function getAdminCategories(params = {}) {
  const { data } = await api.get("/admin/categories", { params })
  return data
}

export async function getAdminCategory(categoryId) {
  const { data } = await api.get(`/admin/categories/${categoryId}`)
  return data
}

export async function createAdminCategory(payload) {
  const config = payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {}

  const { data } = await api.post("/admin/categories", payload, config)
  return data
}

export async function updateAdminCategory(categoryId, payload) {
  const config = payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {}
  const method = payload instanceof FormData ? "post" : "patch"

  const { data } = await api[method](`/admin/categories/${categoryId}`, payload, config)
  return data
}

export async function updateAdminCategoryStatus(categoryId, isActive) {
  const { data } = await api.patch(`/admin/categories/${categoryId}/status`, {
    is_active: isActive,
  })

  return data
}

export async function deleteAdminCategory(categoryId) {
  const { data } = await api.delete(`/admin/categories/${categoryId}`)
  return data
}
