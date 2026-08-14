import api from "./api.js"

function multipartConfig(payload) {
  return payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {}
}

export async function getAdminRegions(params = {}) {
  const { data } = await api.get("/admin/regions", { params })
  return data
}

export async function getAdminRegion(regionId) {
  const { data } = await api.get(`/admin/regions/${regionId}`)
  return data
}

export async function createAdminRegion(payload) {
  const { data } = await api.post("/admin/regions", payload, multipartConfig(payload))
  return data
}

export async function updateAdminRegion(regionId, payload) {
  const method = payload instanceof FormData ? "post" : "patch"
  const { data } = await api[method](`/admin/regions/${regionId}`, payload, multipartConfig(payload))
  return data
}

export async function updateAdminRegionStatus(regionId, isActive) {
  const { data } = await api.patch(`/admin/regions/${regionId}/status`, {
    is_active: isActive,
  })
  return data
}

export async function syncAdminRegionProducts(regionId, productIds = []) {
  const { data } = await api.put(`/admin/regions/${regionId}/products`, {
    product_ids: productIds.map(Number),
  })
  return data
}

export async function deleteAdminRegion(regionId) {
  const { data } = await api.delete(`/admin/regions/${regionId}`)
  return data
}
