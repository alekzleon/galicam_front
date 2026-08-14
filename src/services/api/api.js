import axios from "axios"
import { getAuthToken, clearAuthSession } from "../storage/authStorage"
import { getCurrentLocale, isLocalizableApiPath } from "../../utils/localization"
import { getCurrentCurrency, isCurrencyAwareApiPath } from "../../utils/currency"

const API_BASE_URL  = `${import.meta.env.VITE_API_URL}/api/v1`

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, 
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use(
  (config) => {
    const token = getAuthToken()

    //  console.log("TOKEN ACTUAL:", token)
    // console.log("URL REQUEST:", `${config.baseURL}${config.url}`)

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (isLocalizableApiPath(config.url)) {
      const locale = getCurrentLocale()
      const params = new URLSearchParams(config.params || {})

      if (!params.has("locale")) {
        params.set("locale", locale)
      }

      config.params = params
      config.headers["X-Locale"] = locale
      config.headers["Accept-Language"] = locale
    }

    if (isCurrencyAwareApiPath(config.url)) {
      const currency = getCurrentCurrency()
      const params = new URLSearchParams(config.params || {})

      if (!params.has("currency")) {
        params.set("currency", currency)
      }

      config.params = params
      config.headers["X-Currency"] = currency
    }

    if (config.data instanceof FormData) {
      if (typeof config.headers?.delete === "function") {
        config.headers.delete("Content-Type")
      } else if (config.headers) {
        delete config.headers["Content-Type"]
        delete config.headers["content-type"]
      }
    }

    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status

    if (status === 401) {
      clearAuthSession()
    }

    return Promise.reject(error)
  }
)

export default api
