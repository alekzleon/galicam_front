/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { updateMeLocaleRequest } from "../services/api/authService"
import { getPublicLocalization } from "../services/api/settingsService"
import { getAuthToken } from "../services/storage/authStorage"
import {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  formatMessage,
  getLocaleMessages,
  getStoredLocale,
  normalizeLocaleCode,
  saveLocale,
} from "../utils/localization"

const DEFAULT_LOCALIZATION = {
  default_locale: DEFAULT_LOCALE,
  available_locales: SUPPORTED_LOCALES.map((code) => ({
    code,
    name: LOCALE_LABELS[code],
    native_name: LOCALE_LABELS[code],
  })),
  supported_locales: SUPPORTED_LOCALES.map((code) => ({
    code,
    name: LOCALE_LABELS[code],
    native_name: LOCALE_LABELS[code],
  })),
}

const LocalizationContext = createContext(null)

export function LocalizationProvider({ children }) {
  const [localization, setLocalization] = useState(DEFAULT_LOCALIZATION)
  const [locale, setLocale] = useState(() => normalizeLocaleCode(getStoredLocale()))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadLocalization() {
      try {
        setLoading(true)
        const response = await getPublicLocalization()
        const nextLocalization = normalizeLocalizationResponse(response)
        const availableCodes = getAvailableLocaleCodes(nextLocalization)
        const savedLocale = getStoredLocale()
        const initialLocale =
          savedLocale && availableCodes.includes(savedLocale)
            ? savedLocale
            : nextLocalization.default_locale || DEFAULT_LOCALE

        if (!isMounted) return

        setLocalization(nextLocalization)
        setLocale(normalizeLocaleCode(initialLocale))
        saveLocale(normalizeLocaleCode(initialLocale))
      } catch (error) {
        console.error("Error loading localization settings:", error?.response?.data || error)
        if (!isMounted) return

        const fallbackLocale = normalizeLocaleCode(getStoredLocale())
        setLocalization(DEFAULT_LOCALIZATION)
        setLocale(fallbackLocale)
        saveLocale(fallbackLocale)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadLocalization()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const handlePreferredLocale = (event) => {
      const preferredLocale = normalizeLocaleCode(event.detail)
      const availableCodes = getAvailableLocaleCodes(localization)

      if (!availableCodes.includes(preferredLocale) || preferredLocale === locale) return

      saveLocale(preferredLocale)
      setLocale(preferredLocale)
    }

    window.addEventListener("auth:preferred-locale", handlePreferredLocale)
    return () => window.removeEventListener("auth:preferred-locale", handlePreferredLocale)
  }, [locale, localization])

  const changeLocale = useCallback(async (selectedLocale) => {
    const availableCodes = getAvailableLocaleCodes(localization)
    const nextLocale = availableCodes.includes(selectedLocale)
      ? selectedLocale
      : localization.default_locale || DEFAULT_LOCALE

    const normalizedLocale = normalizeLocaleCode(nextLocale)

    saveLocale(normalizedLocale)
    setLocale(normalizedLocale)

    if (getAuthToken()) {
      try {
        await updateMeLocaleRequest(normalizedLocale)
      } catch (error) {
        console.error("Error updating user locale:", error?.response?.data || error)
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("locale:changed", { detail: normalizedLocale }))
      window.location.reload()
    }
  }, [localization])

  const t = useMemo(() => {
    const localeMessages = getLocaleMessages(locale)

    return (key, values) => formatMessage(localeMessages[key] || key, values)
  }, [locale])

  const value = useMemo(() => ({
    locale,
    localization,
    loading,
    availableLocales: normalizeLocaleList(localization.available_locales),
    changeLocale,
    t,
  }), [changeLocale, loading, locale, localization, t])

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  )
}

export function useLocalization() {
  const context = useContext(LocalizationContext)

  if (!context) {
    throw new Error("useLocalization debe usarse dentro de LocalizationProvider")
  }

  return context
}

function normalizeLocalizationResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value && typeof data.value === "object" ? data.value : data.localization || data
  const availableLocales = normalizeLocaleList(value.available_locales || value.supported_locales)
  const supportedLocales = normalizeLocaleList(value.supported_locales || value.available_locales)
  const availableCodes = availableLocales.map((item) => item.code)
  const defaultLocale = availableCodes.includes(value.default_locale)
    ? value.default_locale
    : DEFAULT_LOCALE

  return {
    default_locale: defaultLocale,
    available_locales: availableLocales.length ? availableLocales : DEFAULT_LOCALIZATION.available_locales,
    supported_locales: supportedLocales.length ? supportedLocales : DEFAULT_LOCALIZATION.supported_locales,
  }
}

function normalizeLocaleList(locales) {
  if (!Array.isArray(locales)) return []

  return locales
    .map((locale) => {
      const code = typeof locale === "string" ? locale : locale?.code
      if (!SUPPORTED_LOCALES.includes(code)) return null

      return {
        code,
        name: locale?.name || LOCALE_LABELS[code],
        native_name: locale?.native_name || LOCALE_LABELS[code],
      }
    })
    .filter(Boolean)
}

function getAvailableLocaleCodes(localization) {
  const codes = normalizeLocaleList(localization?.available_locales).map((item) => item.code)

  return codes.length ? codes : SUPPORTED_LOCALES
}
