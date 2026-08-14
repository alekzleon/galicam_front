import api from "./api"

function getMultipartConfig(payload) {
  return payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {}
}

export async function getAdminGiftItems(params = {}) {
  const response = await api.get("/admin/gift-items", { params })
  return response.data
}

export async function createAdminGiftItem(payload) {
  const response = await api.post("/admin/gift-items", payload, getMultipartConfig(payload))
  return response.data
}

export async function getAdminGiftItem(id) {
  const response = await api.get(`/admin/gift-items/${id}`)
  return response.data
}

export async function updateAdminGiftItem(id, payload) {
  if (payload instanceof FormData) {
    const response = await api.post(
      `/admin/gift-items/${id}`,
      payload,
      getMultipartConfig(payload)
    )
    return response.data
  }

  const response = await api.patch(`/admin/gift-items/${id}`, payload)
  return response.data
}

export async function deleteAdminGiftItem(id) {
  const response = await api.delete(`/admin/gift-items/${id}`)
  return response.data
}

export async function toggleAdminGiftItem(id) {
  const response = await api.patch(`/admin/gift-items/${id}/toggle`)
  return response.data
}
