import api from "./api"

export async function getAdminProductPriceScales(productId) {
  const { data } = await api.get(`/admin/products/${productId}/price-scales`)
  return data
}

export async function updateAdminProductPriceScales(productId, payload) {
  const { data } = await api.put(`/admin/products/${productId}/price-scales`, payload)
  return data
}

export async function deleteAdminProductPriceScales(productId) {
  const { data } = await api.delete(`/admin/products/${productId}/price-scales`)
  return data
}
