import api from "./api"

export async function getAdminCoupons(params = {}) {
  const response = await api.get("/admin/coupons", { params })
  return response.data
}

export async function getAdminCoupon(id) {
  const response = await api.get(`/admin/coupons/${id}`)
  return response.data
}

export async function createAdminCoupon(payload) {
  const response = await api.post("/admin/coupons", payload)
  return response.data
}

export async function updateAdminCoupon(id, payload) {
  const response = await api.put(`/admin/coupons/${id}`, payload)
  return response.data
}

export async function deleteAdminCoupon(id) {
  const response = await api.delete(`/admin/coupons/${id}`)
  return response.data
}

export async function toggleAdminCoupon(id) {
  const response = await api.patch(`/admin/coupons/${id}/toggle`)
  return response.data
}

export async function sendAdminCoupon(id, payload) {
  const response = await api.post(`/admin/coupons/${id}/send`, payload)
  return response.data
}

export async function getAdminCouponFormOptions() {
  const response = await api.get("/admin/coupons/form-options")
  return response.data
}
