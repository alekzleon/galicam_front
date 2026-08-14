import api from "./api.js"
import { getBannerMediaType, normalizeBannerMediaUrl } from "./bannerService.js"

function getMultipartConfig(payload) {
  return payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {}
}

export async function getBrandBanners(params = {}) {
  const { data } = await api.get("/brand-banners", { params })
  return data
}

export function normalizeBrandBannerMediaUrl(banner) {
  return normalizeBannerMediaUrl(banner)
}

export function getBrandBannerMediaType(banner) {
  return getBannerMediaType(banner)
}

export async function getAdminBrandBanners(params = {}) {
  const { data } = await api.get("/admin/brand-banners", { params })
  return data
}

export async function createAdminBrandBanner(payload) {
  const { data } = await api.post("/admin/brand-banners", payload, getMultipartConfig(payload))
  return data
}

export async function getAdminBrandBanner(id) {
  const { data } = await api.get(`/admin/brand-banners/${id}`)
  return data
}

export async function updateAdminBrandBanner(id, payload) {
  if (payload instanceof FormData) {
    payload.append("_method", "PATCH")
    const { data } = await api.post(`/admin/brand-banners/${id}`, payload, getMultipartConfig(payload))
    return data
  }

  const { data } = await api.patch(`/admin/brand-banners/${id}`, payload)
  return data
}

export async function deleteAdminBrandBanner(id) {
  const { data } = await api.delete(`/admin/brand-banners/${id}`)
  return data
}

export async function toggleAdminBrandBanner(id) {
  const { data } = await api.patch(`/admin/brand-banners/${id}/toggle`)
  return data
}

export async function reorderAdminBrandBanners(payload) {
  const { data } = await api.post("/admin/brand-banners/reorder", payload)
  return data
}
