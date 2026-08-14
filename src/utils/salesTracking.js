const SALES_TRACKING_STORAGE_KEY = "sales_tracking"

const TRACKING_KEYS = [
  "channel",
  "sales_channel",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]

export function captureSalesTrackingFromSearch(search = "") {
  const params = new URLSearchParams(search)
  const nextTracking = {}

  TRACKING_KEYS.forEach((key) => {
    const value = params.get(key)

    if (value && value.trim()) {
      nextTracking[key] = value.trim()
    }
  })

  if (!Object.keys(nextTracking).length) {
    return getSalesTracking()
  }

  const mergedTracking = {
    ...getSalesTracking(),
    ...nextTracking,
  }

  setSalesTracking(mergedTracking)
  return mergedTracking
}

export function getSalesTracking() {
  if (typeof window === "undefined") return {}

  try {
    const storedValue = window.localStorage.getItem(SALES_TRACKING_STORAGE_KEY)
    const parsedValue = storedValue ? JSON.parse(storedValue) : {}

    return sanitizeTracking(parsedValue)
  } catch {
    return {}
  }
}

export function getSalesTrackingPayload() {
  return sanitizeTracking(getSalesTracking())
}

export function mergeSalesTrackingPayload(payload = {}) {
  return {
    ...getSalesTrackingPayload(),
    ...payload,
  }
}

function setSalesTracking(tracking = {}) {
  if (typeof window === "undefined") return

  const sanitizedTracking = sanitizeTracking(tracking)

  if (!Object.keys(sanitizedTracking).length) return

  window.localStorage.setItem(
    SALES_TRACKING_STORAGE_KEY,
    JSON.stringify(sanitizedTracking)
  )
}

function sanitizeTracking(tracking = {}) {
  return TRACKING_KEYS.reduce((accumulator, key) => {
    const value = tracking?.[key]

    if (value === null || value === undefined) return accumulator

    const normalizedValue = String(value).trim()

    if (normalizedValue) {
      accumulator[key] = normalizedValue
    }

    return accumulator
  }, {})
}
