const STORAGE_PREFIX = "storage/"

export function normalizeMediaUrl(value) {
  const rawValue = String(value || "").trim()

  if (!rawValue) return ""
  if (rawValue.startsWith("blob:") || rawValue.startsWith("data:")) return rawValue

  const mediaBaseUrl = getMediaBaseUrl()

  if (!mediaBaseUrl) return rawValue

  try {
    const baseUrl = new URL(mediaBaseUrl)
    const basePath = normalizePath(baseUrl.pathname)
    const sourcePath = getSourcePath(rawValue)
    const mediaPath = buildMediaPath(sourcePath, basePath)

    return `${baseUrl.origin}${basePath ? `/${basePath}` : ""}/${mediaPath}`
  } catch {
    return rawValue
  }
}

function getMediaBaseUrl() {
  return String(import.meta.env.VITE_MEDIA_BASE_URL || import.meta.env.VITE_API_URL || "")
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/+$/, "")
}

function getSourcePath(value) {
  try {
    const sourceUrl = new URL(value)
    return `${sourceUrl.pathname}${sourceUrl.search}${sourceUrl.hash}`
  } catch {
    return value
  }
}

function buildMediaPath(value, basePath) {
  const [pathname = "", suffix = ""] = splitPathSuffix(value)
  const cleanBasePath = normalizePath(basePath)
  let cleanPath = normalizePath(pathname)

  if (cleanBasePath && cleanPath === cleanBasePath) {
    cleanPath = ""
  } else if (cleanBasePath && cleanPath.startsWith(`${cleanBasePath}/`)) {
    cleanPath = cleanPath.slice(cleanBasePath.length + 1)
  }

  if (cleanPath.startsWith("public/")) {
    cleanPath = cleanPath.slice("public/".length)
  }

  if (cleanPath.startsWith(STORAGE_PREFIX)) {
    return `${cleanPath}${suffix}`
  }

  return `${STORAGE_PREFIX}${cleanPath}${suffix}`
}

function splitPathSuffix(value) {
  const match = String(value || "").match(/^([^?#]*)([?#].*)?$/)

  return [match?.[1] || "", match?.[2] || ""]
}

function normalizePath(value) {
  return String(value || "").replace(/^\/+|\/+$/g, "")
}
