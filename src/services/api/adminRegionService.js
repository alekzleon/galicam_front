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

export async function syncAdminRegionProducts(regionId, products = []) {
  const items = Array.isArray(products) ? products : []
  const hasDetailedConfig = items.some((item) => item && typeof item === "object")
  const payload = hasDetailedConfig
    ? { products: items.map(normalizeRegionProductPayload).filter((item) => item.product_id) }
    : { product_ids: items.map(Number).filter(Boolean) }

  const { data } = await api.put(`/admin/regions/${regionId}/products`, payload)
  return data
}

export async function deleteAdminRegion(regionId) {
  const { data } = await api.delete(`/admin/regions/${regionId}`)
  return data
}

export async function createAdminRegionProfileChangeRequest(regionId, payload) {
  const { data } = await api.post(
    `/admin/regions/${regionId}/profile-change-requests`,
    payload,
    multipartConfig(payload)
  )
  return data
}

export async function getAdminRegionProfileChangeRequests(params = {}) {
  const { data } = await api.get("/admin/region-profile-change-requests", { params })
  return data
}

export async function getAdminRegionProfileChangeRequest(requestId) {
  const { data } = await api.get(`/admin/region-profile-change-requests/${requestId}`)
  return data
}

export async function approveAdminRegionProfileChangeRequest(requestId, payload = {}) {
  const { data } = await api.post(`/admin/region-profile-change-requests/${requestId}/approve`, payload)
  return data
}

export async function rejectAdminRegionProfileChangeRequest(requestId, payload = {}) {
  const { data } = await api.post(`/admin/region-profile-change-requests/${requestId}/reject`, payload)
  return data
}

export async function cancelAdminRegionProfileChangeRequest(requestId) {
  const { data } = await api.delete(`/admin/region-profile-change-requests/${requestId}`)
  return data
}

export async function getAdminRegionStripeConnect(regionId) {
  const { data } = await api.get(`/admin/regions/${regionId}/stripe-connect`)
  return data
}

export async function createAdminRegionStripeConnectOnboardingLink(regionId) {
  const { data } = await api.post(`/admin/regions/${regionId}/stripe-connect/onboarding-link`)
  return data
}

export async function syncAdminRegionStripeConnect(regionId) {
  const { data } = await api.post(`/admin/regions/${regionId}/stripe-connect/sync`)
  return data
}

function normalizeRegionProductPayload(item = {}) {
  return {
    product_id: Number(item.product_id || item.id || 0),
    is_active: Boolean(item.is_active ?? true),
    regional_price: normalizeNullableNumber(item.regional_price),
    regional_stock: normalizeNullableNumber(item.regional_stock),
    commission_rate: normalizeNullableNumber(item.commission_rate),
    sort_order: normalizeNullableNumber(item.sort_order),
    metadata: item.metadata && typeof item.metadata === "object" ? item.metadata : {},
  }
}

function normalizeNullableNumber(value) {
  if (value === "" || value === null || value === undefined) return null

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}
