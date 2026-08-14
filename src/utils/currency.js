export const CURRENCY_STORAGE_KEY = "currency"

export const DEFAULT_CURRENCY = "MXN"

export const CURRENCY_AWARE_PUBLIC_PATHS = [
  "/products",
  "/products/smart-search",
  "/search/suggestions",
  "/regions",
  "/home",
  "/promotions",
  "/monthly-promotions",
]

export function getStoredCurrency() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(CURRENCY_STORAGE_KEY) || ""
}

export function getCurrentCurrency() {
  return normalizeCurrencyCode(getStoredCurrency())
}

export function saveCurrency(currency) {
  if (typeof window === "undefined") return
  localStorage.setItem(CURRENCY_STORAGE_KEY, normalizeCurrencyCode(currency))
}

export function normalizeCurrencyCode(currency) {
  const value = String(currency || DEFAULT_CURRENCY).trim().toUpperCase()
  return value || DEFAULT_CURRENCY
}

export function isCurrencyAwareApiPath(url = "") {
  const path = normalizeApiPath(url)

  return CURRENCY_AWARE_PUBLIC_PATHS.some((prefix) => (
    path === prefix || path.startsWith(`${prefix}/`)
  ))
}

function normalizeApiPath(url = "") {
  const [path] = String(url || "").split("?")
  return path.replace(/^\/api\/v1/, "")
}
