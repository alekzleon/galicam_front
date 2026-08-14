import { useEffect, useMemo, useState } from "react"
import { getAdminLocalization } from "../../services/api/settingsService"
import {
  getActiveLocaleCodes,
  normalizeLocalizationSettings,
} from "../utils/adminTranslations"

function useAdminLocalization() {
  const [localization, setLocalization] = useState(() => normalizeLocalizationSettings())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadLocalization() {
      try {
        setLoading(true)
        const response = await getAdminLocalization()
        const data = response?.data?.data || response?.data || response || {}
        if (mounted) setLocalization(normalizeLocalizationSettings(data))
      } catch (error) {
        console.error("Error al cargar idiomas del admin:", error?.response?.data || error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadLocalization()

    return () => {
      mounted = false
    }
  }, [])

  const activeLocales = useMemo(() => getActiveLocaleCodes(localization), [localization])

  return {
    localization,
    activeLocales,
    loading,
    setLocalization,
  }
}

export default useAdminLocalization
