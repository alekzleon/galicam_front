import { DEFAULT_LOCALE, LOCALE_LABELS, SUPPORTED_LOCALES } from "../../utils/localization"

export { DEFAULT_LOCALE, LOCALE_LABELS, SUPPORTED_LOCALES }

export function normalizeTranslations(value) {
  if (!value || Array.isArray(value) || typeof value !== "object") return {}

  return Object.entries(value).reduce((fields, [field, locales]) => {
    if (!locales || Array.isArray(locales) || typeof locales !== "object") return fields

    const nextLocales = Object.entries(locales).reduce((items, [locale, text]) => {
      if (!SUPPORTED_LOCALES.includes(locale)) return items
      items[locale] = String(text ?? "")
      return items
    }, {})

    if (Object.keys(nextLocales).length) fields[field] = nextLocales
    return fields
  }, {})
}

export function getTranslationValue(translations, field, locale) {
  return normalizeTranslations(translations)?.[field]?.[locale] || ""
}

export function setTranslationValue(translations, field, locale, value) {
  if (!SUPPORTED_LOCALES.includes(locale)) return normalizeTranslations(translations)

  return {
    ...normalizeTranslations(translations),
    [field]: {
      ...(normalizeTranslations(translations)[field] || {}),
      [locale]: value,
    },
  }
}

export function compactTranslations(translations) {
  return Object.entries(normalizeTranslations(translations)).reduce((fields, [field, locales]) => {
    const nextLocales = Object.entries(locales).reduce((items, [locale, text]) => {
      const normalizedText = String(text ?? "").trim()
      if (normalizedText) items[locale] = normalizedText
      return items
    }, {})

    if (Object.keys(nextLocales).length) fields[field] = nextLocales
    return fields
  }, {})
}

export function appendTranslationsToFormData(formData, translations) {
  formData.append("translations", JSON.stringify(compactTranslations(translations)))
}

export function getActiveLocaleCodes(localization) {
  const rawLocales = localization?.available_locales || localization?.supported_locales || SUPPORTED_LOCALES
  const codes = rawLocales
    .map((locale) => (typeof locale === "string" ? locale : locale?.code))
    .filter((locale) => SUPPORTED_LOCALES.includes(locale))

  return codes.length ? codes : SUPPORTED_LOCALES
}

export function normalizeLocalizationSettings(value = {}) {
  const availableLocales = getActiveLocaleCodes(value)
  const defaultLocale = availableLocales.includes(value.default_locale)
    ? value.default_locale
    : DEFAULT_LOCALE

  return {
    default_locale: availableLocales.includes(defaultLocale) ? defaultLocale : availableLocales[0],
    available_locales: availableLocales,
  }
}
