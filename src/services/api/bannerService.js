import api from "./api.js"

function getMultipartConfig(payload) {
  return payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {}
}

export async function getBanners(params = {}) {
  const { data } = await api.get("/banners", { params })
  return data
}

export function normalizeBannerMediaUrl(banner) {
  const mediaUrl =
    banner?.media_url ||
    banner?.file_url ||
    banner?.image_url ||
    banner?.video_url ||
    banner?.url ||
    ""

  if (mediaUrl) return normalizeBackendMediaUrl(mediaUrl)

  const mediaPath =
    banner?.media_path ||
    banner?.image_path ||
    banner?.video_path ||
    ""

  if (!mediaPath) return ""

  const normalizedPath = String(mediaPath).replace(/^\/+/, "")
  const storagePath = normalizedPath.startsWith("storage/")
    ? normalizedPath
    : `storage/${normalizedPath}`

  return `${getMediaBaseUrl()}/${storagePath}`
}

export function getBannerMediaType(banner) {
  const explicitType = banner?.media_type || banner?.file_type || ""

  if (String(explicitType).toLowerCase().includes("video")) return "video"

  const url = normalizeBannerMediaUrl(banner).toLowerCase()
  if (/\.(mp4|webm|ogg|mov)(\?|$)/.test(url)) return "video"

  return "image"
}

function getMediaBaseUrl() {
  return normalizeBaseUrl(
    import.meta.env.MEDIA_BASE_URL ||
      import.meta.env.VITE_MEDIA_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      ""
  )
}

function normalizeBackendMediaUrl(url) {
  const value = String(url || "").trim()
  const mediaBaseUrl = getMediaBaseUrl()

  if (!value) return ""

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsedUrl = new URL(value)
      return `${mediaBaseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
    } catch {
      return value
    }
  }

  return `${mediaBaseUrl}/${value.replace(/^\/+/, "")}`
}

function normalizeBaseUrl(url) {
  return String(url || "").replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "")
}

export async function getAdminBanners(params = {}) {
  const { data } = await api.get("/admin/banners", { params })
  return data
}

export async function createAdminBanner(payload) {
  const { data } = await api.post("/admin/banners", payload, getMultipartConfig(payload))
  return data
}

export async function getAdminBanner(id) {
  const { data } = await api.get(`/admin/banners/${id}`)
  return data
}

export async function updateAdminBanner(id, payload) {
  if (payload instanceof FormData) {
    payload.append("_method", "PATCH")
    const { data } = await api.post(`/admin/banners/${id}`, payload, getMultipartConfig(payload))
    return data
  }

  const { data } = await api.patch(`/admin/banners/${id}`, payload)
  return data
}

export async function deleteAdminBanner(id) {
  const { data } = await api.delete(`/admin/banners/${id}`)
  return data
}

export async function toggleAdminBanner(id) {
  const { data } = await api.patch(`/admin/banners/${id}/toggle`)
  return data
}

export async function reorderAdminBanners(payload) {
  const { data } = await api.post("/admin/banners/reorder", payload)
  return data
}
