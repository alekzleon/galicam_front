import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import AdminCard from "../../components/AdminCard/AdminCard"
import {
  createAdminSettings,
  deleteAdminSettings,
  getAdminAbandonedCartSettings,
  getAdminCurrencySettings,
  getAdminLocalization,
  getAdminMetaPixel,
  getAdminSaleNotificationSettings,
  getAdminSettings,
  getAdminStorefront,
  updateAdminAbandonedCartSettings,
  updateAdminCurrencySettings,
  updateAdminLocalization,
  updateAdminMetaPixel,
  updateAdminSaleNotificationSettings,
  updateAdminStorefront,
} from "../../../services/api/settingsService"
import {
  createAdminContactFaq,
  deleteAdminContactFaq,
  getAdminContactFaqs,
  reorderAdminContactFaqs,
  toggleAdminContactFaq,
  updateAdminContactFaq,
} from "../../../services/api/contactFaqService"
import { normalizeMediaUrl } from "../../../utils/mediaUrl"
import { notifyError, notifySuccess, notifyWarning } from "../../../utils/toast"
import { useSettings } from "../../../context/SettingsContext"
import AdminTranslationsFields from "../../components/AdminTranslationsFields/AdminTranslationsFields"
import useAdminLocalization from "../../hooks/useAdminLocalization"
import {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  compactTranslations,
  normalizeLocalizationSettings,
  normalizeTranslations,
  setTranslationValue,
} from "../../utils/adminTranslations"
import "./SettingsPage.css"

const DEFAULT_SUPPORTED_CURRENCIES = [
  { code: "MXN", name: "Mexican Peso", native_name: "Peso mexicano", symbol: "$", decimals: 2, locale: "es-MX" },
  { code: "USD", name: "US Dollar", native_name: "US Dollar", symbol: "$", decimals: 2, locale: "en-US" },
]

const EMPTY_FORM = {
  id: null,
  site_title: "",
  contact_numbers: ["", ""],
  email: "",
  address: "",
  social_links: {
    instagram: "",
    facebook: "",
    tiktok: "",
  },
  forms_recipient_email: "",
  meta: {
    title: "",
    description: "",
    keywords: "",
  },
  google_analytics_pixel: "",
  meta_pixel_id: "",
  translations: {},
  localization: {
    default_locale: DEFAULT_LOCALE,
    available_locales: SUPPORTED_LOCALES,
  },
  currency: {
    base_currency: "MXN",
    default_currency: "MXN",
    available_currencies: ["MXN"],
    supported_currencies: DEFAULT_SUPPORTED_CURRENCIES,
    exchange_rates: {
      MXN: 1,
    },
    rounding: {
      mode: "round",
      precision: 2,
    },
  },
  loyalty: {
    first_purchase_discount_enabled: false,
    first_purchase_discount_percentage: "",
    cashback_enabled: false,
    cashback_earn_percentage: "",
    cashback_redeem_enabled: false,
    cashback_max_redeem_percentage: "100",
  },
  abandoned_cart: {
    enabled: true,
    abandon_after_minutes: 60,
    recovery_link_expires_hours: 48,
    send_email: true,
    send_whatsapp: true,
  },
  sale_notifications: {
    enabled: true,
    send_email: true,
    send_whatsapp: true,
    admin_email: "",
    admin_whatsapp: "",
  },
  storefront: {
    is_published: false,
    construction_title: "Ecommerce en construcción",
    construction_message: "Estamos preparando la tienda. Vuelve pronto.",
    template: "classic",
    available_home_templates: ["classic"],
    theme: {
      primary_color: "#111827",
      secondary_color: "#2563eb",
      accent_color: "#f59e0b",
      background_color: "#ffffff",
      surface_color: "#f8fafc",
      text_color: "#111827",
      muted_text_color: "#64748b",
      button_text_color: "#ffffff",
    },
  },
  logo: null,
  logo_url: "",
  favicon: null,
  favicon_url: "",
  og_image: null,
  og_image_url: "",
}

const EMPTY_FAQ_FORM = {
  id: null,
  question: "",
  answer: "",
  sort_order: "",
  is_active: true,
  translations: {},
}

const SECTIONS = [
  {
    id: "identity",
    icon: "bi-shop-window",
    title: "Identidad del sitio",
    description: "Nombre, logo, favicon e imagen para compartir.",
  },
  {
    id: "localization",
    icon: "bi-translate",
    title: "Idiomas",
    description: "Idioma principal e idiomas visibles en el ecommerce.",
  },
  {
    id: "currency",
    icon: "bi-currency-exchange",
    title: "Moneda",
    description: "Moneda base, moneda principal y tipos de cambio disponibles.",
  },
  {
    id: "storefront",
    icon: "bi-broadcast",
    title: "Publicación",
    description: "Estado público y mensaje visible cuando la tienda está en construcción.",
  },
  {
    id: "contact",
    icon: "bi-telephone",
    title: "Contacto",
    description: "Teléfonos, correo principal y dirección.",
  },
  {
    id: "social",
    icon: "bi-share",
    title: "Redes sociales",
    description: "Links visibles hacia Instagram, Facebook y TikTok.",
  },
  {
    id: "forms",
    icon: "bi-envelope-paper",
    title: "Formularios",
    description: "Correo que recibe mensajes de contacto y ventas.",
  },
  {
    id: "seo",
    icon: "bi-search",
    title: "SEO",
    description: "Meta título, descripción y palabras clave.",
  },
  {
    id: "tracking",
    icon: "bi-graph-up-arrow",
    title: "Tracking",
    description: "Google Analytics y Meta Pixel.",
  },
  {
    id: "loyalty",
    icon: "bi-stars",
    title: "Fidelidad",
    description: "Primera compra, cashback acumulado y uso en carrito.",
  },
  {
    id: "envios",
    icon: "bi-truck",
    title: "Envíos",
    description: "Opciones de cobertura, tarifas y promociones de entrega.",
  },
  {
    id: "abandoned_cart",
    icon: "bi-cart-x",
    title: "Carrito abandonado",
    description: "Tiempo de abandono, expiración y canales de recuperación.",
  },
  {
    id: "sale_notifications",
    icon: "bi-bell",
    title: "Notificaciones",
    description: "Canales y destinatarios para avisos de ventas procesadas.",
  },
  {
    id: "contact_faqs",
    icon: "bi-question-circle",
    title: "Preguntas frecuentes",
    description: "Dudas visibles en la página de contacto.",
  },
]

const SECTION_IDS = new Set(SECTIONS.map((section) => section.id))

function getValidSectionId(sectionId) {
  return SECTION_IDS.has(sectionId) ? sectionId : ""
}

function SettingsPage() {
  const { refreshSettings } = useSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeSection, setActiveSection] = useState(() => getValidSectionId(searchParams.get("section")) || SECTIONS[0].id)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const canSubmitSection = !["contact_faqs", "envios"].includes(activeSection)
  const canDeleteSettings = ![
    "contact_faqs",
    "storefront",
    "localization",
    "currency",
    "abandoned_cart",
    "sale_notifications",
    "envios",
  ].includes(activeSection)

  const activeSectionMeta = useMemo(() => {
    return SECTIONS.find((section) => section.id === activeSection) || SECTIONS[0]
  }, [activeSection])

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    const sectionFromUrl = getValidSectionId(searchParams.get("section"))

    if (sectionFromUrl && sectionFromUrl !== activeSection) {
      setActiveSection(sectionFromUrl)
    }
  }, [activeSection, searchParams])

  function handleSectionChange(sectionId) {
    setActiveSection(sectionId)

    const nextParams = new URLSearchParams(searchParams)
    if (sectionId === SECTIONS[0].id) {
      nextParams.delete("section")
    } else {
      nextParams.set("section", sectionId)
    }

    setSearchParams(nextParams, { replace: true })
  }

  async function loadSettings() {
    try {
      setLoading(true)
      const [
        settingsResponse,
        metaPixelResponse,
        abandonedCartResponse,
        saleNotificationsResponse,
        storefrontResponse,
        localizationResponse,
        currencyResponse,
      ] = await Promise.allSettled([
        getAdminSettings(),
        getAdminMetaPixel(),
        getAdminAbandonedCartSettings(),
        getAdminSaleNotificationSettings(),
        getAdminStorefront(),
        getAdminLocalization(),
        getAdminCurrencySettings(),
      ])
      const data = settingsResponse.status === "fulfilled"
        ? normalizeSettingsResponse(settingsResponse.value)
        : {}
      const metaPixelId = metaPixelResponse.status === "fulfilled"
        ? normalizeMetaPixelResponse(metaPixelResponse.value)
        : data.meta_pixel_id
      const abandonedCart = abandonedCartResponse.status === "fulfilled"
        ? normalizeAbandonedCartResponse(abandonedCartResponse.value)
        : EMPTY_FORM.abandoned_cart
      const saleNotifications = saleNotificationsResponse.status === "fulfilled"
        ? normalizeSaleNotificationResponse(saleNotificationsResponse.value)
        : EMPTY_FORM.sale_notifications
      const storefront = storefrontResponse.status === "fulfilled"
        ? normalizeStorefrontResponse(storefrontResponse.value)
        : EMPTY_FORM.storefront
      const localization = localizationResponse.status === "fulfilled"
        ? normalizeLocalizationResponse(localizationResponse.value)
        : EMPTY_FORM.localization
      const currency = currencyResponse.status === "fulfilled"
        ? normalizeCurrencyResponse(currencyResponse.value)
        : EMPTY_FORM.currency

      setForm(mapSettingsToForm({
        ...data,
        meta_pixel_id: metaPixelId,
        abandoned_cart: abandonedCart,
        sale_notifications: saleNotifications,
        storefront,
        localization,
        currency,
      }))
    } catch (error) {
      console.error("Error al cargar configuración:", error)
      notifyError(error?.response?.data?.message || "No fue posible cargar la configuración.")
      setForm(EMPTY_FORM)
    } finally {
      setLoading(false)
    }
  }

  function handleFieldChange(event) {
    const { name, value, type, files, checked } = event.target

    if (type === "file") {
      const file = files?.[0] || null
      const previewKey = `${name}_url`

      setForm((prev) => ({
        ...prev,
        [name]: file,
        [previewKey]: file ? URL.createObjectURL(file) : prev[previewKey],
      }))
      return
    }

    if (name.startsWith("social_links.")) {
      const key = name.replace("social_links.", "")
      setForm((prev) => ({
        ...prev,
        social_links: {
          ...prev.social_links,
          [key]: value,
        },
      }))
      return
    }

    if (name.startsWith("meta.")) {
      const key = name.replace("meta.", "")
      setForm((prev) => ({
        ...prev,
        meta: {
          ...prev.meta,
          [key]: value,
        },
      }))
      return
    }

    if (name.startsWith("loyalty.")) {
      const key = name.replace("loyalty.", "")
      setForm((prev) => ({
        ...prev,
        loyalty: {
          ...prev.loyalty,
          [key]: type === "checkbox" ? checked : value,
        },
      }))
      return
    }

    if (name.startsWith("abandoned_cart.")) {
      const key = name.replace("abandoned_cart.", "")
      setForm((prev) => ({
        ...prev,
        abandoned_cart: {
          ...prev.abandoned_cart,
          [key]: type === "checkbox" ? checked : value,
        },
      }))
      return
    }

    if (name.startsWith("sale_notifications.")) {
      const key = name.replace("sale_notifications.", "")
      setForm((prev) => ({
        ...prev,
        sale_notifications: {
          ...prev.sale_notifications,
          [key]: type === "checkbox" ? checked : value,
        },
      }))
      return
    }

    if (name.startsWith("storefront.theme.")) {
      const key = name.replace("storefront.theme.", "")
      setForm((prev) => ({
        ...prev,
        storefront: {
          ...prev.storefront,
          theme: {
            ...prev.storefront.theme,
            [key]: value,
          },
        },
      }))
      return
    }

    if (name.startsWith("storefront.")) {
      const key = name.replace("storefront.", "")
      setForm((prev) => ({
        ...prev,
        storefront: {
          ...prev.storefront,
          [key]: type === "checkbox" ? checked : value,
        },
      }))
      return
    }

    if (name.startsWith("localization.")) {
      const key = name.replace("localization.", "")
      setForm((prev) => ({
        ...prev,
        localization: {
          ...prev.localization,
          [key]: value,
        },
      }))
      return
    }

    if (name.startsWith("currency.rounding.")) {
      const key = name.replace("currency.rounding.", "")
      setForm((prev) => ({
        ...prev,
        currency: {
          ...prev.currency,
          rounding: {
            ...prev.currency.rounding,
            [key]: value,
          },
        },
      }))
      return
    }

    if (name.startsWith("currency.exchange_rates.")) {
      const key = name.replace("currency.exchange_rates.", "").toUpperCase()
      setForm((prev) => ({
        ...prev,
        currency: {
          ...prev.currency,
          exchange_rates: {
            ...prev.currency.exchange_rates,
            [key]: value,
          },
        },
      }))
      return
    }

    if (name.startsWith("currency.")) {
      const key = name.replace("currency.", "")
      setForm((prev) => ({
        ...prev,
        currency: {
          ...prev.currency,
          [key]: String(value).toUpperCase(),
        },
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleContactNumberChange(index, value) {
    setForm((prev) => {
      const nextNumbers = [...prev.contact_numbers]
      nextNumbers[index] = value

      return {
        ...prev,
        contact_numbers: nextNumbers.slice(0, 2),
      }
    })
  }

  function handleTranslationChange(field, locale, value) {
    setForm((prev) => ({
      ...prev,
      translations: setTranslationValue(prev.translations, field, locale, value),
    }))
  }

  function handleLocaleToggle(locale) {
    setForm((prev) => {
      const currentLocales = prev.localization.available_locales || []
      const nextLocales = currentLocales.includes(locale)
        ? currentLocales.filter((item) => item !== locale)
        : [...currentLocales, locale]
      const availableLocales = nextLocales.length ? nextLocales : [locale]
      const defaultLocale = availableLocales.includes(prev.localization.default_locale)
        ? prev.localization.default_locale
        : availableLocales[0]

      return {
        ...prev,
        localization: {
          ...prev.localization,
          available_locales: availableLocales,
          default_locale: defaultLocale,
        },
      }
    })
  }

  function handleCurrencyToggle(currencyCode) {
    const normalizedCurrencyCode = String(currencyCode || "").toUpperCase()
    if (!normalizedCurrencyCode) return

    setForm((prev) => {
      const currentCurrencies = prev.currency.available_currencies || []
      const baseCurrency = prev.currency.base_currency || EMPTY_FORM.currency.base_currency
      const nextCurrencies = currentCurrencies.includes(normalizedCurrencyCode)
        ? currentCurrencies.filter((item) => item !== normalizedCurrencyCode)
        : [...currentCurrencies, normalizedCurrencyCode]
      const availableCurrencies = Array.from(new Set([baseCurrency, ...nextCurrencies]))
      const defaultCurrency = availableCurrencies.includes(prev.currency.default_currency)
        ? prev.currency.default_currency
        : availableCurrencies[0]

      return {
        ...prev,
        currency: {
          ...prev.currency,
          available_currencies: availableCurrencies,
          default_currency: defaultCurrency,
          exchange_rates: {
            ...prev.currency.exchange_rates,
            [normalizedCurrencyCode]: prev.currency.exchange_rates?.[normalizedCurrencyCode] ?? (normalizedCurrencyCode === baseCurrency ? 1 : ""),
          },
        },
      }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const numbers = form.contact_numbers.map((item) => item.trim()).filter(Boolean)

    if (numbers.length > 2) {
      notifyWarning("Solo puedes guardar máximo 2 números de contacto.")
      return
    }

    try {
      setSaving(true)

      if (activeSection === "abandoned_cart") {
        const payload = buildAbandonedCartPayload(form.abandoned_cart)
        const validationMessage = validateAbandonedCartPayload(payload)

        if (validationMessage) {
          notifyWarning(validationMessage)
          return
        }

        const response = await updateAdminAbandonedCartSettings(payload)
        setForm((prev) => ({
          ...prev,
          abandoned_cart: normalizeAbandonedCartResponse(response),
        }))
        notifySuccess("Configuración de carrito abandonado guardada correctamente.")
        return
      }

      if (activeSection === "sale_notifications") {
        const payload = buildSaleNotificationPayload(form.sale_notifications)
        const validationMessage = validateSaleNotificationPayload(payload)

        if (validationMessage) {
          notifyWarning(validationMessage)
          return
        }

        const response = await updateAdminSaleNotificationSettings(payload)
        setForm((prev) => ({
          ...prev,
          sale_notifications: normalizeSaleNotificationResponse(response),
        }))
        notifySuccess("Configuración de notificaciones guardada correctamente.")
        return
      }

      if (activeSection === "storefront") {
        const payload = buildStorefrontPublicationPayload(form.storefront)
        const validationMessage = validateStorefrontPublicationPayload(payload)

        if (validationMessage) {
          notifyWarning(validationMessage)
          return
        }

        const response = await updateAdminStorefront(payload)
        setForm((prev) => ({
          ...prev,
          storefront: normalizeStorefrontResponse(response),
        }))
        refreshSettings()
        notifySuccess("Storefront guardado correctamente.")
        return
      }

      if (activeSection === "localization") {
        const payload = normalizeLocalizationSettings(form.localization)

        if (!payload.available_locales.includes(payload.default_locale)) {
          notifyWarning("El idioma principal debe estar dentro de los idiomas disponibles.")
          return
        }

        const response = await updateAdminLocalization(payload)
        setForm((prev) => ({
          ...prev,
          localization: normalizeLocalizationResponse(response),
        }))
        refreshSettings()
        notifySuccess("Idiomas guardados correctamente.")
        return
      }

      if (activeSection === "currency") {
        const payload = buildCurrencyPayload(form.currency)
        const validationMessage = validateCurrencyPayload(payload)

        if (validationMessage) {
          notifyWarning(validationMessage)
          return
        }

        const response = await updateAdminCurrencySettings(payload)
        setForm((prev) => ({
          ...prev,
          currency: normalizeCurrencyAfterSave(response, payload, prev.currency),
        }))
        notifySuccess("Moneda guardada correctamente.")
        return
      }

      const payload = buildSettingsPayload(form, activeSection)
      if (activeSection === "tracking") {
        const pixelId = String(form.meta_pixel_id || "").trim()

        if (pixelId && !/^\d+$/.test(pixelId)) {
          notifyWarning("El Meta Pixel ID debe contener solo números.")
          return
        }

        await Promise.all([
          createAdminSettings(payload),
          updateAdminMetaPixel(pixelId || null),
        ])
      } else {
        await createAdminSettings(payload)
      }

      const freshResponse = await getAdminSettings()
      const freshMetaPixelResponse = await getAdminMetaPixel()
      const data = normalizeSettingsResponse(freshResponse)
      setForm(mapSettingsToForm({
        ...data,
        meta_pixel_id: normalizeMetaPixelResponse(freshMetaPixelResponse),
        abandoned_cart: form.abandoned_cart,
        sale_notifications: form.sale_notifications,
        localization: form.localization,
        currency: form.currency,
      }))
      refreshSettings()
      notifySuccess("Configuración guardada correctamente.")
    } catch (error) {
      console.error("Error al guardar configuración:", error)
      notifyError(error?.response?.data?.message || "No fue posible guardar la configuración.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!form.id || deleting) return
    if (!window.confirm("¿Eliminar la configuración actual del ecommerce?")) return

    try {
      setDeleting(true)
      await deleteAdminSettings(form.id)
      setForm(EMPTY_FORM)
      notifySuccess("Configuración eliminada correctamente.")
    } catch (error) {
      console.error("Error al eliminar configuración:", error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar la configuración.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminCard
      title="Configuración"
      subtitle="Administra la información pública, SEO, contacto y medición del ecommerce."
      right={canSubmitSection ? (
        <button
          type="submit"
          form="settings-form"
          className="settings-page__save-button"
          disabled={saving || loading}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      ) : null}
    >
      <div className="settings-page">
        <nav className="settings-page__tabs" aria-label="Secciones de configuración">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`settings-page__tab ${activeSection === section.id ? "is-active" : ""}`}
              onClick={() => handleSectionChange(section.id)}
              title={section.description}
            >
              <span className="settings-page__tab-icon">
                <i className={`bi ${section.icon}`} aria-hidden="true" />
              </span>
              <span>{section.title}</span>
            </button>
          ))}
        </nav>

        <form id="settings-form" className="settings-page__panel" onSubmit={handleSubmit}>
          {loading ? (
            <div className="settings-page__loading">Cargando configuración...</div>
          ) : (
            <>
              <div className="settings-page__panel-head">
                <span className="settings-page__panel-icon">
                  <i className={`bi ${activeSectionMeta.icon}`} aria-hidden="true" />
                </span>
                <div>
                  <h3>{activeSectionMeta.title}</h3>
                  <p>{activeSectionMeta.description}</p>
                </div>
              </div>

              {activeSection === "identity" ? (
                <IdentitySection
                  form={form}
                  locales={form.localization.available_locales}
                  onChange={handleFieldChange}
                  onTranslationChange={handleTranslationChange}
                />
              ) : null}

              {activeSection === "localization" ? (
                <LocalizationSection
                  form={form}
                  onChange={handleFieldChange}
                  onLocaleToggle={handleLocaleToggle}
                />
              ) : null}

              {activeSection === "currency" ? (
                <CurrencySection
                  form={form}
                  onChange={handleFieldChange}
                  onCurrencyToggle={handleCurrencyToggle}
                />
              ) : null}

              {activeSection === "storefront" ? (
                <StorefrontSection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "contact" ? (
                <ContactSection
                  form={form}
                  locales={form.localization.available_locales}
                  onChange={handleFieldChange}
                  onContactNumberChange={handleContactNumberChange}
                  onTranslationChange={handleTranslationChange}
                />
              ) : null}

              {activeSection === "social" ? (
                <SocialSection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "forms" ? (
                <FormsSection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "seo" ? (
                <SeoSection
                  form={form}
                  locales={form.localization.available_locales}
                  onChange={handleFieldChange}
                  onTranslationChange={handleTranslationChange}
                />
              ) : null}

              {activeSection === "tracking" ? (
                <TrackingSection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "loyalty" ? (
                <LoyaltySection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "envios" ? (
                <ShippingSection />
              ) : null}

              {activeSection === "abandoned_cart" ? (
                <AbandonedCartSection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "sale_notifications" ? (
                <SaleNotificationsSection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "contact_faqs" ? (
                <ContactFaqsSection />
              ) : null}

              {canSubmitSection ? (
              <div className="settings-page__footer">
                <button type="submit" className="settings-page__save-button" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>

                {form.id && canDeleteSettings ? (
                  <button
                    type="button"
                    className="settings-page__danger-button"
                    onClick={handleDelete}
                    disabled={saving || deleting}
                  >
                    {deleting ? "Eliminando..." : "Eliminar configuración"}
                  </button>
                ) : null}
              </div>
              ) : null}
            </>
          )}
        </form>
      </div>
    </AdminCard>
  )
}

function IdentitySection({ form, locales, onChange, onTranslationChange }) {
  return (
    <section className="settings-page__section">
      <div className="settings-page__grid settings-page__grid--two">
        <Field
          label="Nombre del sitio"
          name="site_title"
          value={form.site_title}
          onChange={onChange}
          placeholder="Mi tienda"
        />
      </div>

      <AdminTranslationsFields
        locales={locales}
        translations={form.translations}
        fields={[
          {
            name: "site_title",
            label: "Nombre del sitio",
            placeholder: "Nombre del sitio traducido",
          },
        ]}
        onChange={onTranslationChange}
      />

      <div className="settings-page__asset-grid">
        <AssetInput
          label="Logo"
          name="logo"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          previewUrl={form.logo_url}
          onChange={onChange}
        />
        <AssetInput
          label="Favicon"
          name="favicon"
          accept=".ico,image/png,image/webp,image/svg+xml"
          previewUrl={form.favicon_url}
          onChange={onChange}
          compact
        />
      </div>
    </section>
  )
}

function LocalizationSection({ form, onChange, onLocaleToggle }) {
  const localization = normalizeLocalizationSettings(form.localization)

  return (
    <section className="settings-page__section">
      <div className="settings-page__grid settings-page__grid--two">
        <label className="settings-page__field">
          <span>Idioma principal</span>
          <select
            name="localization.default_locale"
            value={localization.default_locale}
            onChange={onChange}
          >
            {localization.available_locales.map((locale) => (
              <option key={locale} value={locale}>
                {LOCALE_LABELS[locale] || locale.toUpperCase()}
              </option>
            ))}
          </select>
          <small>Debe estar dentro de los idiomas disponibles.</small>
        </label>
      </div>

      <div className="settings-localization__options">
        {SUPPORTED_LOCALES.map((locale) => (
          <label key={locale} className="settings-page__toggle-field settings-page__toggle-field--compact">
            <input
              type="checkbox"
              checked={localization.available_locales.includes(locale)}
              onChange={() => onLocaleToggle(locale)}
            />
            <span className="settings-page__toggle-control" aria-hidden="true" />
            <span className="settings-page__toggle-copy">
              <strong>{LOCALE_LABELS[locale] || locale.toUpperCase()}</strong>
              <small>{locale}</small>
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}

function CurrencySection({ form, onChange, onCurrencyToggle }) {
  const currency = normalizeCurrencyResponse({ data: { value: form.currency } })
  const availableCurrencies = currency.available_currencies
  const supportedCurrencies = currency.supported_currencies
  const selectedOptions = supportedCurrencies.filter((item) => availableCurrencies.includes(item.code))

  return (
    <section className="settings-page__section">
      <div className="settings-page__grid settings-page__grid--two">
        <label className="settings-page__field">
          <span>Moneda base</span>
          <select
            name="currency.base_currency"
            value={currency.base_currency}
            onChange={onChange}
            disabled
          >
            {supportedCurrencies.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} · {item.native_name || item.name}
              </option>
            ))}
          </select>
          <small>Por ahora la moneda base del sistema debe ser MXN.</small>
        </label>

        <label className="settings-page__field">
          <span>Moneda principal</span>
          <select
            name="currency.default_currency"
            value={currency.default_currency}
            onChange={onChange}
          >
            {selectedOptions.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} · {item.native_name || item.name}
              </option>
            ))}
          </select>
          <small>Debe estar dentro de las monedas disponibles.</small>
        </label>
      </div>

      <div className="settings-currency__options">
        {supportedCurrencies.map((item) => (
          <label key={item.code} className="settings-page__toggle-field settings-page__toggle-field--compact">
            <input
              type="checkbox"
              checked={availableCurrencies.includes(item.code)}
              onChange={() => onCurrencyToggle(item.code)}
              disabled={item.code === currency.base_currency}
            />
            <span className="settings-page__toggle-control" aria-hidden="true" />
            <span className="settings-page__toggle-copy">
              <strong>{item.code}</strong>
              <small>{item.native_name || item.name}</small>
            </span>
          </label>
        ))}
      </div>

      <div className="settings-page__grid settings-page__grid--two">
        {selectedOptions.map((item) => (
          <Field
            key={item.code}
            label={`Tipo de cambio ${item.code}`}
            name={`currency.exchange_rates.${item.code}`}
            type="number"
            value={currency.exchange_rates[item.code] ?? (item.code === currency.base_currency ? 1 : "")}
            onChange={onChange}
            min="0"
            step="0.000001"
            helpText={item.code === currency.base_currency ? "La moneda base debe quedarse en 1." : `Valor de 1 ${currency.base_currency} en ${item.code}.`}
          />
        ))}
      </div>

      <div className="settings-page__grid settings-page__grid--two">
        <label className="settings-page__field">
          <span>Redondeo</span>
          <select
            name="currency.rounding.mode"
            value={currency.rounding.mode}
            onChange={onChange}
          >
            <option value="round">Round</option>
            <option value="ceil">Ceil</option>
            <option value="floor">Floor</option>
          </select>
        </label>

        <Field
          label="Precisión decimal"
          name="currency.rounding.precision"
          type="number"
          value={currency.rounding.precision}
          onChange={onChange}
          min="0"
          max="4"
          step="1"
        />
      </div>
    </section>
  )
}

function StorefrontSection({ form, onChange }) {
  const settings = form.storefront || EMPTY_FORM.storefront

  return (
    <section className="settings-page__section">
      <div className="settings-storefront__status">
        <ToggleField
          label={settings.is_published ? "Ecommerce publicado" : "Ecommerce en construcción"}
          name="storefront.is_published"
          checked={settings.is_published}
          onChange={onChange}
          helpText="Cuando está apagado, la home pública muestra el mensaje de construcción."
        />
      </div>

      <div className="settings-page__grid settings-page__grid--two">
        <Field
          label="Título de construcción"
          name="storefront.construction_title"
          value={settings.construction_title}
          onChange={onChange}
          placeholder="Ecommerce en construcción"
        />

        <label className="settings-page__field">
          <span>Mensaje de construcción</span>
          <textarea
            name="storefront.construction_message"
            value={settings.construction_message}
            onChange={onChange}
            placeholder="Estamos preparando la tienda. Vuelve pronto."
          />
        </label>
      </div>

      <div className="settings-storefront__note">
        <i className="bi bi-shop-window" aria-hidden="true" />
        <span>El ecommerce usa un diseño único para mantener una carga inicial más rápida y estable.</span>
      </div>
    </section>
  )
}

function ContactSection({ form, locales, onChange, onContactNumberChange, onTranslationChange }) {
  return (
    <section className="settings-page__section">
      <div className="settings-page__grid settings-page__grid--two">
        <Field
          label="Correo principal"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          placeholder="contacto@mitienda.com"
        />

        <Field
          label="Dirección"
          name="address"
          value={form.address}
          onChange={onChange}
          placeholder="Av. Principal 123, Guadalajara"
        />
      </div>

      <AdminTranslationsFields
        locales={locales}
        translations={form.translations}
        fields={[
          {
            name: "address",
            label: "Dirección",
            placeholder: "Dirección traducida",
          },
        ]}
        onChange={onTranslationChange}
      />

      <div className="settings-page__phone-box">
        <div>
          <h4>Teléfonos de contacto</h4>
          <p>El backend permite máximo dos números.</p>
        </div>
        <div className="settings-page__grid settings-page__grid--two">
          {[0, 1].map((index) => (
            <label className="settings-page__field" key={index}>
              <span>Teléfono {index + 1}</span>
              <input
                type="tel"
                value={form.contact_numbers[index] || ""}
                onChange={(event) => onContactNumberChange(index, event.target.value)}
                placeholder={index === 0 ? "3312345678" : "3311223344"}
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}

function SocialSection({ form, onChange }) {
  return (
    <section className="settings-page__section">
      <div className="settings-page__grid settings-page__grid--two">
        <Field
          label="Instagram"
          name="social_links.instagram"
          value={form.social_links.instagram}
          onChange={onChange}
          placeholder="https://instagram.com/mitienda"
        />
        <Field
          label="Facebook"
          name="social_links.facebook"
          value={form.social_links.facebook}
          onChange={onChange}
          placeholder="https://facebook.com/mitienda"
        />
        <Field
          label="TikTok"
          name="social_links.tiktok"
          value={form.social_links.tiktok}
          onChange={onChange}
          placeholder="https://tiktok.com/@mitienda"
        />
      </div>
    </section>
  )
}

function FormsSection({ form, onChange }) {
  return (
    <section className="settings-page__section">
      <Field
        label="Correo receptor de formularios"
        name="forms_recipient_email"
        type="email"
        value={form.forms_recipient_email}
        onChange={onChange}
        placeholder="formularios@mitienda.com"
        helpText="Este correo decide a dónde llegan los mensajes de formularios."
      />
    </section>
  )
}

function SeoSection({ form, locales, onChange, onTranslationChange }) {
  return (
    <section className="settings-page__section">
      <Field
        label="Meta título"
        name="meta.title"
        value={form.meta.title}
        onChange={onChange}
        placeholder="Mi tienda"
      />

      <label className="settings-page__field">
        <span>Meta descripción</span>
        <textarea
          name="meta.description"
          rows="4"
          value={form.meta.description}
          onChange={onChange}
          placeholder="Ecommerce de productos tecnológicos."
        />
      </label>

      <Field
        label="Keywords"
        name="meta.keywords"
        value={form.meta.keywords}
        onChange={onChange}
        placeholder="tecnología, ecommerce, computadoras"
        helpText="Escribe las palabras separadas por coma."
      />

      <AdminTranslationsFields
        locales={locales}
        translations={form.translations}
        fields={[
          {
            name: "meta_title",
            label: "Meta título",
            placeholder: "Meta título traducido",
          },
          {
            name: "meta_description",
            label: "Meta descripción",
            type: "textarea",
            placeholder: "Meta descripción traducida",
          },
        ]}
        onChange={onTranslationChange}
      />

      <div className="settings-page__asset-grid settings-page__asset-grid--single">
        <AssetInput
          label="Imagen OG"
          name="og_image"
          accept="image/png,image/jpeg,image/webp"
          previewUrl={form.og_image_url}
          onChange={onChange}
        />
      </div>
    </section>
  )
}

function TrackingSection({ form, onChange }) {
  return (
    <section className="settings-page__section">
      <div className="settings-page__grid settings-page__grid--two">
        <Field
          label="Google Analytics"
          name="google_analytics_pixel"
          value={form.google_analytics_pixel}
          onChange={onChange}
          placeholder="G-XXXXXXXXXX"
        />
        <Field
          label="Meta Pixel ID"
          name="meta_pixel_id"
          value={form.meta_pixel_id}
          onChange={onChange}
          placeholder="123456789012345"
        />
      </div>
    </section>
  )
}

function LoyaltySection({ form, onChange }) {
  return (
    <section className="settings-page__section">
      <div className="settings-page__loyalty-grid">
        <ToggleField
          label="Descuento en primera compra"
          name="loyalty.first_purchase_discount_enabled"
          checked={form.loyalty.first_purchase_discount_enabled}
          onChange={onChange}
          helpText="Si está activo, el backend lo aplicará automáticamente a clientes elegibles."
        />

        <Field
          label="Porcentaje de primera compra"
          name="loyalty.first_purchase_discount_percentage"
          type="number"
          value={form.loyalty.first_purchase_discount_percentage}
          onChange={onChange}
          placeholder="10"
          helpText="Ejemplo: 10 equivale a 10%."
        />

        <ToggleField
          label="Generar cashback"
          name="loyalty.cashback_enabled"
          checked={form.loyalty.cashback_enabled}
          onChange={onChange}
          helpText="Calcula saldo a favor que el cliente ganará por su compra."
        />

        <Field
          label="Porcentaje a ganar"
          name="loyalty.cashback_earn_percentage"
          type="number"
          value={form.loyalty.cashback_earn_percentage}
          onChange={onChange}
          placeholder="5"
        />

        <ToggleField
          label="Permitir usar cashback"
          name="loyalty.cashback_redeem_enabled"
          checked={form.loyalty.cashback_redeem_enabled}
          onChange={onChange}
          helpText="Habilita que el cliente aplique saldo en carrito."
        />

        <Field
          label="Máximo aplicable sobre el total"
          name="loyalty.cashback_max_redeem_percentage"
          type="number"
          value={form.loyalty.cashback_max_redeem_percentage}
          onChange={onChange}
          placeholder="100"
          helpText="100 permite cubrir todo el total permitido por backend."
        />
      </div>
    </section>
  )
}

function AbandonedCartSection({ form, onChange }) {
  const settings = form.abandoned_cart || EMPTY_FORM.abandoned_cart

  return (
    <section className="settings-page__section">
      <div className="settings-page__abandoned-grid">
        <ToggleField
          label="Activar recuperación"
          name="abandoned_cart.enabled"
          checked={settings.enabled}
          onChange={onChange}
          helpText="Permite que el backend detecte y notifique carritos abandonados."
        />

        <ToggleField
          label="Enviar correo"
          name="abandoned_cart.send_email"
          checked={settings.send_email}
          onChange={onChange}
          helpText="Usa el link de recuperación firmado con expiración configurable."
        />

        <ToggleField
          label="Enviar WhatsApp"
          name="abandoned_cart.send_whatsapp"
          checked={settings.send_whatsapp}
          onChange={onChange}
          helpText="Mantiene el canal WhatsApp activo para pruebas del backend."
        />
      </div>

      <div className="settings-page__grid settings-page__grid--two">
        <Field
          label="Minutos para considerar abandono"
          name="abandoned_cart.abandon_after_minutes"
          type="number"
          value={settings.abandon_after_minutes}
          onChange={onChange}
          min="60"
          max="10080"
          step="1"
          helpText="Mínimo 60 minutos. Máximo 10080 minutos."
        />

        <Field
          label="Horas de vigencia del link"
          name="abandoned_cart.recovery_link_expires_hours"
          type="number"
          value={settings.recovery_link_expires_hours}
          onChange={onChange}
          min="1"
          max="720"
          step="1"
          helpText="Mínimo 1 hora. Máximo 720 horas."
        />
      </div>
    </section>
  )
}

function SaleNotificationsSection({ form, onChange }) {
  const settings = form.sale_notifications || EMPTY_FORM.sale_notifications

  return (
    <section className="settings-page__section">
      <div className="settings-page__notifications-grid">
        <ToggleField
          label="Activar notificaciones de venta"
          name="sale_notifications.enabled"
          checked={settings.enabled}
          onChange={onChange}
          helpText="Controla si el backend envía avisos al administrador cuando se procesa una venta."
        />

        <ToggleField
          label="Enviar correo"
          name="sale_notifications.send_email"
          checked={settings.send_email}
          onChange={onChange}
          helpText="Envía el resumen de venta al correo administrador."
        />

        <ToggleField
          label="Enviar WhatsApp"
          name="sale_notifications.send_whatsapp"
          checked={settings.send_whatsapp}
          onChange={onChange}
          helpText="Envía el aviso de venta al WhatsApp administrador."
        />
      </div>

      <div className="settings-page__grid settings-page__grid--two">
        <Field
          label="Correo administrador"
          name="sale_notifications.admin_email"
          type="email"
          value={settings.admin_email}
          onChange={onChange}
          placeholder="ventas@cloudishop.mx"
          required={settings.send_email}
          helpText="Requerido cuando el envío por correo está activo."
        />

        <Field
          label="WhatsApp administrador"
          name="sale_notifications.admin_whatsapp"
          type="tel"
          value={settings.admin_whatsapp}
          onChange={onChange}
          placeholder="9612819842"
          required={settings.send_whatsapp}
          helpText="Requerido cuando WhatsApp está activo. Usa entre 10 y 15 dígitos."
        />
      </div>
    </section>
  )
}

function ShippingSection() {
  return (
    <section className="settings-page__section">
      <div className="settings-shipping__grid">
        <article className="settings-shipping__item">
          <span className="settings-shipping__icon">
            <i className="bi bi-geo-alt" aria-hidden="true" />
          </span>
          <div>
            <h4>Cobertura</h4>
            <p>Zonas, códigos postales y regiones disponibles para entrega.</p>
          </div>
        </article>

        <article className="settings-shipping__item">
          <span className="settings-shipping__icon">
            <i className="bi bi-currency-dollar" aria-hidden="true" />
          </span>
          <div>
            <h4>Tarifas</h4>
            <p>Costos por zona, mínimos de compra y condiciones por pedido.</p>
          </div>
        </article>

        <article className="settings-shipping__item">
          <span className="settings-shipping__icon">
            <i className="bi bi-box-seam" aria-hidden="true" />
          </span>
          <div>
            <h4>Paqueterías</h4>
            <p>Opciones de entrega, tiempos estimados y métodos disponibles.</p>
          </div>
        </article>
      </div>
    </section>
  )
}

function ContactFaqsSection() {
  const [faqs, setFaqs] = useState([])
  const [form, setForm] = useState(EMPTY_FAQ_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const { activeLocales } = useAdminLocalization()

  useEffect(() => {
    loadFaqs()
  }, [])

  async function loadFaqs() {
    try {
      setLoading(true)
      const response = await getAdminContactFaqs()
      const items = normalizeFaqCollection(response)
        .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      setFaqs(items)
    } catch (error) {
      console.error("Error al cargar preguntas frecuentes:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar las preguntas frecuentes.")
      setFaqs([])
    } finally {
      setLoading(false)
    }
  }

  function handleFaqChange(event) {
    const { name, value, type, checked } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  function resetFaqForm() {
    setForm(EMPTY_FAQ_FORM)
  }

  function handleFaqTranslationChange(field, locale, value) {
    setForm((prev) => ({
      ...prev,
      translations: setTranslationValue(prev.translations, field, locale, value),
    }))
  }

  function editFaq(faq) {
    setForm({
      id: faq.id,
      question: faq.question || "",
      answer: faq.answer || "",
      sort_order: faq.sort_order ?? "",
      is_active: Boolean(faq.is_active),
      translations: normalizeTranslations(faq.translations),
    })
  }

  async function saveFaq() {
    const question = form.question.trim()
    const answer = form.answer.trim()

    if (!question || !answer) {
      notifyWarning("Escribe la pregunta y la respuesta.")
      return
    }

    const payload = {
      question,
      answer,
      sort_order: form.sort_order === "" ? null : Number(form.sort_order),
      is_active: Boolean(form.is_active),
      translations: compactTranslations(form.translations),
    }

    try {
      setSaving(true)
      if (form.id) {
        await updateAdminContactFaq(form.id, payload)
        notifySuccess("Pregunta frecuente actualizada.")
      } else {
        await createAdminContactFaq(payload)
        notifySuccess("Pregunta frecuente creada.")
      }
      resetFaqForm()
      await loadFaqs()
    } catch (error) {
      console.error("Error al guardar pregunta frecuente:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar la pregunta frecuente.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteFaq(faq) {
    if (!window.confirm(`¿Eliminar la pregunta "${faq.question}"?`)) return

    try {
      setActionLoadingId(faq.id)
      await deleteAdminContactFaq(faq.id)
      notifySuccess("Pregunta frecuente eliminada.")
      await loadFaqs()
    } catch (error) {
      console.error("Error al eliminar pregunta frecuente:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar la pregunta frecuente.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function toggleFaq(faq) {
    try {
      setActionLoadingId(faq.id)
      await toggleAdminContactFaq(faq.id)
      notifySuccess("Estado actualizado.")
      await loadFaqs()
    } catch (error) {
      console.error("Error al cambiar estado:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el estado.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function moveFaq(faq, direction) {
    const currentIndex = faqs.findIndex((item) => item.id === faq.id)
    const nextIndex = currentIndex + direction

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= faqs.length) return

    const reordered = [...faqs]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(nextIndex, 0, moved)

    const orderedItems = reordered.map((item, index) => ({
      ...item,
      sort_order: index + 1,
    }))

    try {
      setActionLoadingId(faq.id)
      setFaqs(orderedItems)
      await reorderAdminContactFaqs({
        faqs: orderedItems.map((item) => ({
          id: item.id,
          sort_order: item.sort_order,
        })),
      })
      notifySuccess("Orden actualizado.")
      await loadFaqs()
    } catch (error) {
      console.error("Error al reordenar preguntas frecuentes:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el orden.")
      await loadFaqs()
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <section className="settings-page__section">
      <div className="settings-faqs__editor">
        <div className="settings-page__grid settings-page__grid--two">
          <Field
            label="Pregunta"
            name="question"
            value={form.question}
            onChange={handleFaqChange}
            placeholder="¿Hacen entregas a domicilio?"
          />

          <Field
            label="Orden"
            name="sort_order"
            type="number"
            value={form.sort_order}
            onChange={handleFaqChange}
            placeholder="1"
          />
        </div>

        <label className="settings-page__field">
          <span>Respuesta</span>
          <textarea
            name="answer"
            value={form.answer}
            onChange={handleFaqChange}
            placeholder="Sí, entregamos en las zonas disponibles."
          />
        </label>

        <AdminTranslationsFields
          locales={activeLocales}
          translations={form.translations}
          fields={[
            {
              name: "question",
              label: "Pregunta",
              placeholder: "Pregunta traducida",
            },
            {
              name: "answer",
              label: "Respuesta",
              type: "textarea",
              placeholder: "Respuesta traducida",
            },
          ]}
          onChange={handleFaqTranslationChange}
        />

        <div className="settings-faqs__editor-footer">
          <label className="settings-page__toggle-field settings-page__toggle-field--compact">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleFaqChange}
            />
            <span className="settings-page__toggle-control" aria-hidden="true" />
            <span className="settings-page__toggle-copy">
              <strong>Activa</strong>
            </span>
          </label>

          <div className="settings-faqs__editor-actions">
            {form.id ? (
              <button
                type="button"
                className="settings-page__danger-button"
                onClick={resetFaqForm}
                disabled={saving}
              >
                Cancelar
              </button>
            ) : null}

            <button
              type="button"
              className="settings-page__save-button"
              onClick={saveFaq}
              disabled={saving}
            >
              {saving ? "Guardando..." : form.id ? "Actualizar pregunta" : "Agregar pregunta"}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-faqs__list">
        {loading ? (
          <div className="settings-page__loading">Cargando preguntas frecuentes...</div>
        ) : faqs.length ? (
          faqs.map((faq, index) => (
            <article className="settings-faqs__item" key={faq.id}>
              <div className="settings-faqs__content">
                <div className="settings-faqs__question-row">
                  <strong>{faq.question}</strong>
                  <span className={faq.is_active ? "is-active" : ""}>
                    {faq.is_active ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <p>{faq.answer}</p>
              </div>

              <div className="settings-faqs__actions">
                <button
                  type="button"
                  onClick={() => moveFaq(faq, -1)}
                  disabled={index === 0 || actionLoadingId === faq.id}
                >
                  Subir
                </button>
                <button
                  type="button"
                  onClick={() => moveFaq(faq, 1)}
                  disabled={index === faqs.length - 1 || actionLoadingId === faq.id}
                >
                  Bajar
                </button>
                <button type="button" onClick={() => editFaq(faq)} disabled={actionLoadingId === faq.id}>
                  Editar
                </button>
                <button type="button" onClick={() => toggleFaq(faq)} disabled={actionLoadingId === faq.id}>
                  {faq.is_active ? "Desactivar" : "Activar"}
                </button>
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => deleteFaq(faq)}
                  disabled={actionLoadingId === faq.id}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="settings-faqs__empty">Aún no hay preguntas frecuentes cargadas.</div>
        )}
      </div>
    </section>
  )
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  helpText = "",
  min,
  max,
  step,
}) {
  return (
    <label className="settings-page__field">
      <span>
        {label}
        {required ? <b>*</b> : null}
      </span>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
      />
      {helpText ? <small>{helpText}</small> : null}
    </label>
  )
}

function ToggleField({ label, name, checked, onChange, helpText = "" }) {
  return (
    <label className="settings-page__toggle-field">
      <input type="checkbox" name={name} checked={Boolean(checked)} onChange={onChange} />
      <span className="settings-page__toggle-control" aria-hidden="true" />
      <span className="settings-page__toggle-copy">
        <strong>{label}</strong>
        {helpText ? <small>{helpText}</small> : null}
      </span>
    </label>
  )
}

function AssetInput({ label, name, accept, previewUrl, onChange, compact = false }) {
  return (
    <div className="settings-page__asset">
      <div className={`settings-page__asset-preview ${compact ? "is-compact" : ""}`}>
        {previewUrl ? (
          <img src={previewUrl} alt={label} />
        ) : (
          <span>Sin archivo</span>
        )}
      </div>
      <div>
        <strong>{label}</strong>
        <label className="settings-page__file-button">
          Seleccionar archivo
          <input type="file" name={name} accept={accept} onChange={onChange} />
        </label>
      </div>
    </div>
  )
}

function normalizeSettingsResponse(response) {
  if (response?.data?.id || response?.data === null) return response.data || null
  if (response?.data?.data) return response.data.data
  if (response?.id) return response
  return null
}

function normalizeFaqCollection(response) {
  const payload = response?.data ?? response

  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.faqs)) return payload.faqs
  if (Array.isArray(payload?.contact_faqs)) return payload.contact_faqs

  return []
}

function mapSettingsToForm(settings) {
  if (!settings) return EMPTY_FORM

  const numbers = Array.isArray(settings.contact_numbers) ? settings.contact_numbers : []
  const keywords = Array.isArray(settings.meta?.keywords)
    ? settings.meta.keywords.join(", ")
    : settings.meta?.keywords || ""

  return {
    ...EMPTY_FORM,
    id: settings.id || null,
    site_title: settings.site_title || "",
    contact_numbers: [numbers[0] || "", numbers[1] || ""],
    email: settings.email || "",
    address: settings.address || "",
    social_links: {
      instagram: settings.social_links?.instagram || "",
      facebook: settings.social_links?.facebook || "",
      tiktok: settings.social_links?.tiktok || "",
    },
    forms_recipient_email: settings.forms_recipient_email || "",
    meta: {
      title: settings.meta?.title || "",
      description: settings.meta?.description || "",
      keywords,
    },
    google_analytics_pixel: settings.google_analytics_pixel || "",
    meta_pixel_id: settings.meta_pixel_id || settings.meta_pixel || "",
    translations: normalizeTranslations(settings.translations),
    localization: normalizeLocalizationSettings(settings.localization),
    currency: normalizeCurrencyValue(settings.currency),
    loyalty: {
      first_purchase_discount_enabled: Boolean(
        settings.loyalty?.first_purchase_discount_enabled
      ),
      first_purchase_discount_percentage:
        settings.loyalty?.first_purchase_discount_percentage ?? "",
      cashback_enabled: Boolean(settings.loyalty?.cashback_enabled),
      cashback_earn_percentage: settings.loyalty?.cashback_earn_percentage ?? "",
      cashback_redeem_enabled: Boolean(settings.loyalty?.cashback_redeem_enabled),
      cashback_max_redeem_percentage:
        settings.loyalty?.cashback_max_redeem_percentage ?? "100",
    },
    abandoned_cart: normalizeAbandonedCartValue(settings.abandoned_cart),
    sale_notifications: normalizeSaleNotificationValue(settings.sale_notifications),
    storefront: normalizeStorefrontValue(settings.storefront),
    logo: null,
    logo_url: normalizeMediaUrl(settings.logo_url || settings.logo_path),
    favicon: null,
    favicon_url: normalizeMediaUrl(settings.favicon_url || settings.favicon_path),
    og_image: null,
    og_image_url: normalizeMediaUrl(settings.og_image_url || settings.og_image_path),
  }
}

function normalizeMetaPixelResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data

  if (typeof value === "string" || typeof value === "number") return String(value || "").trim()
  if (value && typeof value === "object") return String(value.pixel_id || value.meta_pixel_id || value.meta_pixel || "").trim()

  return ""
}

function normalizeAbandonedCartResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data

  return normalizeAbandonedCartValue(value)
}

function normalizeSaleNotificationResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data

  return normalizeSaleNotificationValue(value)
}

function normalizeStorefrontResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data

  return normalizeStorefrontValue(value)
}

function normalizeLocalizationResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data

  return normalizeLocalizationSettings(value)
}

function normalizeCurrencyResponse(response) {
  return normalizeCurrencyValue(getCurrencyResponseValue(response))
}

function normalizeCurrencyValue(value = {}) {
  const supportedCurrencies = normalizeSupportedCurrencies(value.supported_currencies)
  const supportedCodes = supportedCurrencies.map((currency) => currency.code)
  const baseCurrency = supportedCodes.includes("MXN")
    ? "MXN"
    : String(value.base_currency || EMPTY_FORM.currency.base_currency).toUpperCase()
  const defaultCurrency = String(value.default_currency || baseCurrency).toUpperCase()
  const availableCurrencyCodes = normalizeCurrencyCodes(value.available_currencies)
  const filteredAvailableCurrencies = availableCurrencyCodes.filter((code) => supportedCodes.includes(code))
  const availableCurrencies = Array.from(new Set([
    baseCurrency,
    ...(filteredAvailableCurrencies.length ? filteredAvailableCurrencies : []),
  ]))
  const exchangeRates = { ...EMPTY_FORM.currency.exchange_rates, ...(value.exchange_rates || {}) }

  availableCurrencies.forEach((code) => {
    if (exchangeRates[code] === undefined || exchangeRates[code] === null || exchangeRates[code] === "") {
      exchangeRates[code] = code === baseCurrency ? 1 : ""
    }
  })

  return {
    base_currency: baseCurrency,
    default_currency: availableCurrencies.includes(defaultCurrency) ? defaultCurrency : availableCurrencies[0],
    available_currencies: availableCurrencies,
    supported_currencies: supportedCurrencies,
    exchange_rates: exchangeRates,
    rounding: {
      ...EMPTY_FORM.currency.rounding,
      ...(value.rounding || {}),
      precision: value.rounding?.precision ?? EMPTY_FORM.currency.rounding.precision,
    },
  }
}

function normalizeCurrencyAfterSave(response, payload, previousCurrency) {
  const responseValue = getCurrencyResponseValue(response)
  const hasAvailableCurrencies = Array.isArray(responseValue.available_currencies) && responseValue.available_currencies.length > 0
  const hasSupportedCurrencies = Array.isArray(responseValue.supported_currencies) && responseValue.supported_currencies.length > 0
  const hasExchangeRates = responseValue.exchange_rates && Object.keys(responseValue.exchange_rates).length > 0
  const supportedCurrencies = hasSupportedCurrencies
    ? responseValue.supported_currencies
    : normalizeCurrencyValue(previousCurrency).supported_currencies

  return normalizeCurrencyValue({
    ...responseValue,
    base_currency: payload.base_currency,
    default_currency: payload.default_currency,
    available_currencies: hasAvailableCurrencies ? responseValue.available_currencies : payload.available_currencies,
    supported_currencies: supportedCurrencies,
    exchange_rates: hasExchangeRates ? responseValue.exchange_rates : payload.exchange_rates,
    rounding: responseValue.rounding || payload.rounding,
  })
}

function getCurrencyResponseValue(response) {
  const data = response?.data?.data || response?.data || response || {}
  return data.value || data
}

function normalizeSupportedCurrencies(currencies) {
  const values = Array.isArray(currencies) && currencies.length ? currencies : DEFAULT_SUPPORTED_CURRENCIES

  return values
    .map((currency) => {
      const code = typeof currency === "string" ? currency : currency?.code
      if (!code) return null

      const normalizedCode = String(code).toUpperCase()
      return {
        code: normalizedCode,
        name: currency?.name || normalizedCode,
        native_name: currency?.native_name || currency?.nativeName || currency?.name || normalizedCode,
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

function normalizeCurrencyCodes(currencies) {
  if (!Array.isArray(currencies)) return []

  return currencies
    .map((currency) => {
      const code = typeof currency === "string" ? currency : currency?.code
      return code ? String(code).toUpperCase() : ""
    })
    .filter(Boolean)
}

function normalizeAbandonedCartValue(value = {}) {
  return {
    enabled: booleanOrDefault(value.enabled, EMPTY_FORM.abandoned_cart.enabled),
    abandon_after_minutes: value.abandon_after_minutes ?? EMPTY_FORM.abandoned_cart.abandon_after_minutes,
    recovery_link_expires_hours:
      value.recovery_link_expires_hours ?? EMPTY_FORM.abandoned_cart.recovery_link_expires_hours,
    send_email: booleanOrDefault(value.send_email, EMPTY_FORM.abandoned_cart.send_email),
    send_whatsapp: booleanOrDefault(value.send_whatsapp, EMPTY_FORM.abandoned_cart.send_whatsapp),
  }
}

function normalizeSaleNotificationValue(value = {}) {
  return {
    enabled: booleanOrDefault(value.enabled, EMPTY_FORM.sale_notifications.enabled),
    send_email: booleanOrDefault(value.send_email, EMPTY_FORM.sale_notifications.send_email),
    send_whatsapp: booleanOrDefault(value.send_whatsapp, EMPTY_FORM.sale_notifications.send_whatsapp),
    admin_email: value.admin_email || EMPTY_FORM.sale_notifications.admin_email,
    admin_whatsapp: value.admin_whatsapp || EMPTY_FORM.sale_notifications.admin_whatsapp,
  }
}

function normalizeStorefrontValue(value = {}) {
  const construction = value.construction && typeof value.construction === "object"
    ? value.construction
    : {}
  const theme = value.theme && typeof value.theme === "object" ? value.theme : {}

  return {
    ...EMPTY_FORM.storefront,
    is_published: booleanOrDefault(value.is_published, EMPTY_FORM.storefront.is_published),
    construction_title:
      value.construction_title ||
      construction.title ||
      EMPTY_FORM.storefront.construction_title,
    construction_message:
      value.construction_message ||
      construction.message ||
      EMPTY_FORM.storefront.construction_message,
    template: value.template || value.home_template || EMPTY_FORM.storefront.template,
    available_home_templates: Array.isArray(value.available_home_templates)
      ? value.available_home_templates
      : EMPTY_FORM.storefront.available_home_templates,
    theme: {
      ...EMPTY_FORM.storefront.theme,
      ...theme,
    },
  }
}

function booleanOrDefault(value, fallback) {
  if (value === undefined || value === null) return fallback
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1
  if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase())

  return Boolean(value)
}

function buildAbandonedCartPayload(settings) {
  return {
    enabled: Boolean(settings.enabled),
    abandon_after_minutes: Number(settings.abandon_after_minutes),
    recovery_link_expires_hours: Number(settings.recovery_link_expires_hours),
    send_email: Boolean(settings.send_email),
    send_whatsapp: Boolean(settings.send_whatsapp),
  }
}

function buildSaleNotificationPayload(settings) {
  return {
    enabled: Boolean(settings.enabled),
    send_email: Boolean(settings.send_email),
    send_whatsapp: Boolean(settings.send_whatsapp),
    admin_email: nullableValue(settings.admin_email),
    admin_whatsapp: onlyDigits(settings.admin_whatsapp) || null,
  }
}

function buildStorefrontPublicationPayload(settings) {
  return {
    is_published: Boolean(settings.is_published),
    construction_title: nullableValue(settings.construction_title),
    construction_message: nullableValue(settings.construction_message),
  }
}

function buildCurrencyPayload(settings) {
  const currency = normalizeCurrencyValue(settings)
  const exchangeRates = {}

  currency.available_currencies.forEach((code) => {
    exchangeRates[code] = Number(currency.exchange_rates?.[code] ?? (code === currency.base_currency ? 1 : 0))
  })

  return {
    base_currency: currency.base_currency,
    default_currency: currency.default_currency,
    available_currencies: currency.available_currencies,
    exchange_rates: exchangeRates,
    rounding: {
      mode: currency.rounding.mode || "round",
      precision: Number(currency.rounding.precision ?? 2),
    },
  }
}

function validateAbandonedCartPayload(payload) {
  if (!Number.isInteger(payload.abandon_after_minutes)) {
    return "Los minutos de abandono deben ser un número entero."
  }

  if (payload.abandon_after_minutes < 60 || payload.abandon_after_minutes > 10080) {
    return "Los minutos de abandono deben estar entre 60 y 10080."
  }

  if (!Number.isInteger(payload.recovery_link_expires_hours)) {
    return "Las horas de vigencia deben ser un número entero."
  }

  if (payload.recovery_link_expires_hours < 1 || payload.recovery_link_expires_hours > 720) {
    return "Las horas de vigencia deben estar entre 1 y 720."
  }

  return ""
}

function validateStorefrontPublicationPayload(payload) {
  if (!payload.construction_title) {
    return "Escribe el título de construcción."
  }

  if (!payload.construction_message) {
    return "Escribe el mensaje de construcción."
  }

  return ""
}

function validateCurrencyPayload(payload) {
  if (!payload.available_currencies.length) {
    return "Selecciona al menos una moneda disponible."
  }

  if (!payload.available_currencies.includes(payload.base_currency)) {
    return "La moneda base debe estar dentro de las monedas disponibles."
  }

  if (!payload.available_currencies.includes(payload.default_currency)) {
    return "La moneda principal debe estar dentro de las monedas disponibles."
  }

  const invalidRate = payload.available_currencies.find((code) => {
    const rate = Number(payload.exchange_rates?.[code])
    return !Number.isFinite(rate) || rate <= 0
  })

  if (invalidRate) {
    return `Captura un tipo de cambio válido para ${invalidRate}.`
  }

  if (Number(payload.exchange_rates[payload.base_currency]) !== 1) {
    return "El tipo de cambio de la moneda base debe ser 1."
  }

  if (!["round", "ceil", "floor"].includes(payload.rounding.mode)) {
    return "Selecciona un modo de redondeo válido."
  }

  if (!Number.isInteger(payload.rounding.precision) || payload.rounding.precision < 0 || payload.rounding.precision > 4) {
    return "La precisión debe ser un entero entre 0 y 4."
  }

  return ""
}

function validateSaleNotificationPayload(payload) {
  if (payload.send_email && !payload.admin_email) {
    return "El correo administrador es requerido cuando el envío por correo está activo."
  }

  if (payload.admin_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.admin_email)) {
    return "Escribe un correo administrador válido."
  }

  if (payload.send_whatsapp && !payload.admin_whatsapp) {
    return "El WhatsApp administrador es requerido cuando el envío por WhatsApp está activo."
  }

  if (payload.admin_whatsapp && !/^\d{10,15}$/.test(payload.admin_whatsapp)) {
    return "El WhatsApp administrador debe tener entre 10 y 15 dígitos."
  }

  return ""
}

function buildSettingsPayload(form, section) {
  const numbers = form.contact_numbers.map((item) => item.trim()).filter(Boolean).slice(0, 2)
  const keywords = String(form.meta.keywords || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  const hasFiles =
    (section === "identity" && (form.logo instanceof File || form.favicon instanceof File)) ||
    (section === "seo" && form.og_image instanceof File)

  if (!hasFiles) {
    const payload = {}

    if (section === "identity") {
      payload.site_title = nullableValue(form.site_title)
    }

    if (section === "contact") {
      payload.contact_numbers = numbers
      payload.email = nullableValue(form.email)
      payload.address = nullableValue(form.address)
    }

    if (section === "social") {
      payload.social_links = {
        instagram: nullableValue(form.social_links.instagram),
        facebook: nullableValue(form.social_links.facebook),
        tiktok: nullableValue(form.social_links.tiktok),
      }
    }

    if (section === "forms") {
      payload.forms_recipient_email = nullableValue(form.forms_recipient_email)
    }

    if (section === "seo") {
      payload.meta = {
        title: nullableValue(form.meta.title),
        description: nullableValue(form.meta.description),
        keywords,
      }
    }

    if (section === "tracking") {
      payload.google_analytics_pixel = nullableValue(form.google_analytics_pixel)
    }

    if (section === "loyalty") {
      payload.loyalty = buildLoyaltyPayload(form.loyalty)
    }

    const translations = buildSettingsTranslations(form.translations, section)
    if (Object.keys(translations).length) payload.translations = translations

    return payload
  }

  const payload = new FormData()

  if (section === "identity") {
    appendNullableFormData(payload, "site_title", form.site_title)
    if (form.logo instanceof File) payload.append("logo", form.logo)
    if (form.favicon instanceof File) payload.append("favicon", form.favicon)
  }

  if (section === "contact") {
    numbers.forEach((number, index) => {
      payload.append(`contact_numbers[${index}]`, number)
    })
    appendNullableFormData(payload, "email", form.email)
    appendNullableFormData(payload, "address", form.address)
  }

  if (section === "social") {
    Object.entries(form.social_links).forEach(([key, value]) => {
      appendNullableFormData(payload, `social_links[${key}]`, value)
    })
  }

  if (section === "forms") {
    appendNullableFormData(payload, "forms_recipient_email", form.forms_recipient_email)
  }

  if (section === "seo") {
    appendNullableFormData(payload, "meta[title]", form.meta.title)
    appendNullableFormData(payload, "meta[description]", form.meta.description)
    keywords.forEach((keyword, index) => {
      payload.append(`meta[keywords][${index}]`, keyword)
    })
    if (form.og_image instanceof File) payload.append("og_image", form.og_image)
  }

  if (section === "tracking") {
    appendNullableFormData(payload, "google_analytics_pixel", form.google_analytics_pixel)
  }

  if (section === "loyalty") {
    const loyalty = buildLoyaltyPayload(form.loyalty)
    Object.entries(loyalty).forEach(([key, value]) => {
      payload.append(`loyalty[${key}]`, value)
    })
  }

  const translations = buildSettingsTranslations(form.translations, section)
  if (Object.keys(translations).length) {
    payload.append("translations", JSON.stringify(translations))
  }

  return payload
}

function buildSettingsTranslations(translations, section) {
  const allowedFieldsBySection = {
    identity: ["site_title"],
    contact: ["address"],
    seo: ["meta_title", "meta_description"],
  }
  const allowedFields = allowedFieldsBySection[section] || []
  const compacted = compactTranslations(translations)

  return allowedFields.reduce((items, field) => {
    if (compacted[field]) items[field] = compacted[field]
    return items
  }, {})
}

function nullableValue(value) {
  const normalizedValue = String(value ?? "").trim()

  return normalizedValue || null
}

function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "")
}

function appendNullableFormData(payload, key, value) {
  const normalizedValue = String(value ?? "").trim()

  payload.append(key, normalizedValue)
}

function buildLoyaltyPayload(loyalty) {
  return {
    first_purchase_discount_enabled: Boolean(loyalty.first_purchase_discount_enabled),
    first_purchase_discount_percentage: numericOrNull(
      loyalty.first_purchase_discount_percentage
    ),
    cashback_enabled: Boolean(loyalty.cashback_enabled),
    cashback_earn_percentage: numericOrNull(loyalty.cashback_earn_percentage),
    cashback_redeem_enabled: Boolean(loyalty.cashback_redeem_enabled),
    cashback_max_redeem_percentage:
      numericOrNull(loyalty.cashback_max_redeem_percentage) ?? 100,
  }
}

function numericOrNull(value) {
  const normalizedValue = String(value ?? "").trim()

  if (!normalizedValue) return null

  const numberValue = Number(normalizedValue)

  return Number.isFinite(numberValue) ? numberValue : null
}

export default SettingsPage
