/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { getPublicCurrencySettings } from "../services/api/settingsService"
import {
  DEFAULT_CURRENCY,
  getStoredCurrency,
  saveCurrency,
} from "../utils/currency"

const DEFAULT_CURRENCY_SETTINGS = {
  base_currency: "MXN",
  default_currency: "MXN",
  available_currencies: [
    {
      code: "MXN",
      name: "Mexican Peso",
      native_name: "Peso mexicano",
      symbol: "$",
      decimals: 2,
      locale: "es-MX",
      exchange_rate: 1,
      is_base: true,
      is_default: true,
    },
  ],
  supported_currencies: [],
  exchange_rates: {
    MXN: 1,
  },
  rounding: {
    mode: "round",
    precision: 2,
  },
}

const CurrencyContext = createContext(null)

export function CurrencyProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_CURRENCY_SETTINGS)
  const [currency, setCurrency] = useState(() => getStoredCurrency() || DEFAULT_CURRENCY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadCurrencySettings() {
      try {
        setLoading(true)
        const response = await getPublicCurrencySettings()
        const nextSettings = normalizeCurrencyResponse(response)
        const availableCodes = nextSettings.available_currencies.map((item) => item.code)
        const savedCurrency = getStoredCurrency()
        const nextCurrency = availableCodes.includes(savedCurrency)
          ? savedCurrency
          : nextSettings.default_currency || nextSettings.base_currency || DEFAULT_CURRENCY

        if (!isMounted) return

        setSettings(nextSettings)
        setCurrency(nextCurrency)
        saveCurrency(nextCurrency)
      } catch (error) {
        console.error("Error loading currency settings:", error?.response?.data || error)
        if (!isMounted) return
        setSettings(DEFAULT_CURRENCY_SETTINGS)
        setCurrency(getStoredCurrency() || DEFAULT_CURRENCY)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadCurrencySettings()

    return () => {
      isMounted = false
    }
  }, [])

  const changeCurrency = useCallback((selectedCurrency) => {
    const availableCodes = settings.available_currencies.map((item) => item.code)
    const nextCurrency = availableCodes.includes(selectedCurrency)
      ? selectedCurrency
      : settings.default_currency || settings.base_currency || DEFAULT_CURRENCY

    setCurrency(nextCurrency)
    saveCurrency(nextCurrency)

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("currency:changed", { detail: nextCurrency }))
    }
  }, [settings])

  const selectedCurrency = useMemo(() => {
    return settings.available_currencies.find((item) => item.code === currency) || settings.available_currencies[0]
  }, [currency, settings.available_currencies])

  const value = useMemo(() => ({
    currency,
    selectedCurrency,
    availableCurrencies: settings.available_currencies,
    currencySettings: settings,
    loading,
    changeCurrency,
  }), [changeCurrency, currency, loading, selectedCurrency, settings])

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)

  if (!context) {
    throw new Error("useCurrency debe usarse dentro de CurrencyProvider")
  }

  return context
}

function normalizeCurrencyResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value && typeof data.value === "object" ? data.value : data.currency || data
  const availableCurrencies = normalizeAvailableCurrencies(value.available_currencies)
  const defaultCurrency = String(value.default_currency || value.base_currency || "MXN").toUpperCase()
  const baseCurrency = String(value.base_currency || defaultCurrency || DEFAULT_CURRENCY).toUpperCase()

  return {
    ...DEFAULT_CURRENCY_SETTINGS,
    ...value,
    base_currency: baseCurrency,
    default_currency: defaultCurrency,
    available_currencies: availableCurrencies.length
      ? availableCurrencies
      : DEFAULT_CURRENCY_SETTINGS.available_currencies,
    exchange_rates: value.exchange_rates || DEFAULT_CURRENCY_SETTINGS.exchange_rates,
    rounding: {
      ...DEFAULT_CURRENCY_SETTINGS.rounding,
      ...(value.rounding || {}),
    },
  }
}

function normalizeAvailableCurrencies(currencies) {
  if (!Array.isArray(currencies)) return []

  return currencies
    .map((currency) => {
      const code = typeof currency === "string" ? currency : currency?.code
      if (!code) return null

      const normalizedCode = String(code).toUpperCase()
      return {
        code: normalizedCode,
        name: currency?.name || normalizedCode,
        native_name: currency?.native_name || currency?.name || normalizedCode,
        symbol: currency?.symbol || normalizedCode,
        decimals: Number(currency?.decimals ?? 2),
        locale: currency?.locale || "es-MX",
        exchange_rate: Number(currency?.exchange_rate ?? 1),
        is_base: Boolean(currency?.is_base),
        is_default: Boolean(currency?.is_default),
      }
    })
    .filter(Boolean)
}
