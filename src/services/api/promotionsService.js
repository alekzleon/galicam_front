import api from "./api"

export async function getRandomPromotion() {
  const response = await api.get("/promotions/random")
  return response.data
}

export async function getRandomSixPromotions() {
  const response = await api.get("/promotions/random-six")
  return response.data
}

export async function getAllPromotions(params = {}) {
  const response = await api.get("/promotions/all", { params })
  return response.data
}

export async function getAdminPromotions(params = {}) {
  const response = await api.get("/admin/promotions", { params })
  return response.data
}

export async function getAdminPromotionFormOptions() {
  const response = await api.get("/admin/promotions/form-options")
  return response.data
}

export async function getAdminPromotion(id) {
  const response = await api.get(`/admin/promotions/${id}`)
  return response.data
}

export async function createAdminPromotion(payload) {
  const response = await api.post("/admin/promotions", payload)
  return response.data
}

export async function updateAdminPromotion(id, payload) {
  const response = payload instanceof FormData
    ? await api.post(`/admin/promotions/${id}`, payload)
    : await api.put(`/admin/promotions/${id}`, payload)
  return response.data
}

export async function deleteAdminPromotion(id) {
  const response = await api.delete(`/admin/promotions/${id}`)
  return response.data
}

export async function toggleAdminPromotion(id) {
  const response = await api.patch(`/admin/promotions/${id}/toggle`)
  return response.data
}

export async function getAdminProductsForPromotions(params = {}) {
  const response = await api.get("/admin/products", { params })
  return response.data
}
