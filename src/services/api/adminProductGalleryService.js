import api from "./api.js"

export async function getAdminProductGallery(productId) {
  const { data } = await api.get(`/admin/products/${productId}/gallery`)
  return data
}

export async function createAdminProductGalleryItem(productId, payload) {
  const { data } = await api.post(`/admin/products/${productId}/gallery`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  })

  return data
}

export async function updateAdminProductGalleryItem(productId, galleryItemId, payload) {
  const config = payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {}

  const { data } = await api.post(
    `/admin/products/${productId}/gallery/${galleryItemId}`,
    payload,
    config
  )

  return data
}

export async function toggleAdminProductGalleryItem(productId, galleryItemId) {
  const { data } = await api.patch(`/admin/products/${productId}/gallery/${galleryItemId}/toggle`)
  return data
}

export async function deleteAdminProductGalleryItem(productId, galleryItemId) {
  const { data } = await api.delete(`/admin/products/${productId}/gallery/${galleryItemId}`)
  return data
}

export async function reorderAdminProductGallery(productId, items) {
  const { data } = await api.post(`/admin/products/${productId}/gallery/reorder`, { items })
  return data
}
