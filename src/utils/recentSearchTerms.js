const RECENT_SEARCH_TERMS_KEY = "recent_search_terms"
const MAX_RECENT_SEARCH_TERMS = 5

export function getRecentSearchTerms() {
  if (typeof window === "undefined") return []

  try {
    const terms = JSON.parse(window.localStorage.getItem(RECENT_SEARCH_TERMS_KEY) || "[]")
    return Array.isArray(terms)
      ? terms.map((term) => String(term || "").trim()).filter(Boolean).slice(0, MAX_RECENT_SEARCH_TERMS)
      : []
  } catch {
    return []
  }
}

export function saveRecentSearchTerm(term) {
  if (typeof window === "undefined") return

  const clean = String(term || "").trim()
  if (!clean) return

  const current = getRecentSearchTerms()
  const next = [clean, ...current.filter((item) => item.toLowerCase() !== clean.toLowerCase())]
    .slice(0, MAX_RECENT_SEARCH_TERMS)

  window.localStorage.setItem(RECENT_SEARCH_TERMS_KEY, JSON.stringify(next))
}
