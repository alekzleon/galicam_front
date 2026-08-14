import api from "./api.js"

function getMultipartConfig(payload) {
  return payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {}
}

export async function getMonthlyPromotions(params = {}) {
  const { data } = await api.get("/monthly-promotions", { params })
  return data
}

export async function getAdminMonthlyPromotions(params = {}) {
  const { data } = await api.get("/admin/monthly-promotions", { params })
  return data
}

export async function createAdminMonthlyPromotion(payload) {
  const { data } = await api.post(
    "/admin/monthly-promotions",
    payload,
    getMultipartConfig(payload)
  )
  return data
}

export async function getAdminMonthlyPromotion(id) {
  const { data } = await api.get(`/admin/monthly-promotions/${id}`)
  return data
}

export async function updateAdminMonthlyPromotion(id, payload) {
  if (payload instanceof FormData) {
    const { data } = await api.post(
      `/admin/monthly-promotions/${id}`,
      payload,
      getMultipartConfig(payload)
    )
    return data
  }

  const { data } = await api.patch(`/admin/monthly-promotions/${id}`, payload)
  return data
}

export async function deleteAdminMonthlyPromotion(id) {
  const { data } = await api.delete(`/admin/monthly-promotions/${id}`)
  return data
}

export async function toggleAdminMonthlyPromotion(id) {
  const { data } = await api.patch(`/admin/monthly-promotions/${id}/toggle`)
  return data
}

export async function reorderAdminMonthlyPromotions(payload) {
  const { data } = await api.post("/admin/monthly-promotions/reorder", payload)
  return data
}
