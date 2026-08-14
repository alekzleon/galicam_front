/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  getPublicContactFaqImage,
  getPublicContactMapUrl,
  getPublicGeneralLogo,
  getPublicMetaPixel,
  getPublicNavTitle,
  getPublicSettings,
  getPublicStorefront,
} from "../services/api/settingsService"
import { useLocalization } from "./LocalizationContext"
import { normalizeMediaUrl } from "../utils/mediaUrl"
import { loadMetaPixel } from "../utils/metaPixel"

const DEFAULT_SETTINGS = {
  site_title: "Tienda en línea",
  nav_title: {
    title: "Todo para tu negocio, al mejor precio y con entrega garantizada.",
  },
  general_logo: {
    logo_path: "",
    logo_url: "",
  },
  contact_faq_image: {
    image_path: "",
    image_url: "",
  },
  contact_map_url: "",
  logo_url: "",
  favicon_url: "",
  contact_numbers: [],
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
    keywords: [],
  },
  google_analytics_pixel: "",
  meta_pixel: "",
  meta_pixel_id: "",
  og_image_url: "",
  loyalty: {
    first_purchase_discount_enabled: false,
    first_purchase_discount_percentage: 0,
    cashback_enabled: false,
    cashback_earn_percentage: 0,
    cashback_redeem_enabled: false,
    cashback_max_redeem_percentage: 100,
  },
  storefront: {
    is_published: false,
    construction: {
      title: "Ecommerce en construcción",
      message: "Estamos preparando la tienda. Vuelve pronto.",
    },
    home_template: "classic",
    active_template: "classic",
    available_home_templates: ["classic"],
    available_templates: [],
    available_home_template_options: [
      {
        key: "classic",
        name: "Classic",
        description: "Home equilibrado con carrusel, beneficios, categorías, productos y banners de marca.",
      },
    ],
    visual_design: {
      nav: {
        variant: "classic",
        density: "comfortable",
        show_top_bar: true,
      },
      home: {
        variant: "classic",
        hero: "carousel",
        category_layout: "grid",
        product_layout: "standard",
      },
      footer: {
        variant: "classic",
        newsletter_position: "inline",
      },
    },
    theme: {
      primary_color: "#111827",
      secondary_color: "#2563eb",
      accent_color: "#f59e0b",
      background_color: "#ffffff",
      surface_color: "#f8fafc",
      text_color: "#111827",
      muted_text_color: "#64748b",
      button_text_color: "#ffffff",
      buttons: {
        primary: {
          background_color: "#111827",
          text_color: "#ffffff",
          border_color: "#111827",
          hover_background_color: "#1f2937",
          hover_text_color: "#ffffff",
          hover_border_color: "#1f2937",
        },
        secondary: {
          background_color: "#2563eb",
          text_color: "#ffffff",
          border_color: "#2563eb",
          hover_background_color: "#1d4ed8",
          hover_text_color: "#ffffff",
          hover_border_color: "#1d4ed8",
        },
        outline: {
          background_color: "transparent",
          text_color: "#111827",
          border_color: "#111827",
          hover_background_color: "#111827",
          hover_text_color: "#ffffff",
          hover_border_color: "#111827",
        },
      },
    },
  },
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const { locale } = useLocalization()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  const refreshSettings = async () => {
    try {
      setLoading(true)
      const [
        settingsResponse,
        navTitleResponse,
        generalLogoResponse,
        contactFaqImageResponse,
        contactMapUrlResponse,
        metaPixelResponse,
        storefrontResponse,
      ] = await Promise.allSettled([
        getPublicSettings(),
        getPublicNavTitle(),
        getPublicGeneralLogo(),
        getPublicContactFaqImage(),
        getPublicContactMapUrl(),
        getPublicMetaPixel(),
        getPublicStorefront(),
      ])
      const nextSettings = settingsResponse.status === "fulfilled"
        ? normalizeSettingsResponse(settingsResponse.value)
        : DEFAULT_SETTINGS
      const navTitle = navTitleResponse.status === "fulfilled"
        ? normalizeNavTitleResponse(navTitleResponse.value)
        : DEFAULT_SETTINGS.nav_title
      const generalLogo = generalLogoResponse.status === "fulfilled"
        ? normalizeGeneralLogoResponse(generalLogoResponse.value)
        : nextSettings.general_logo
      const contactFaqImage = contactFaqImageResponse.status === "fulfilled"
        ? normalizeContactFaqImageResponse(contactFaqImageResponse.value)
        : nextSettings.contact_faq_image
      const contactMapUrl = contactMapUrlResponse.status === "fulfilled"
        ? normalizeContactMapUrlResponse(contactMapUrlResponse.value)
        : nextSettings.contact_map_url
      const metaPixelId = metaPixelResponse.status === "fulfilled"
        ? normalizeMetaPixelResponse(metaPixelResponse.value)
        : nextSettings.meta_pixel_id
      const storefront = storefrontResponse.status === "fulfilled"
        ? normalizeStorefrontResponse(storefrontResponse.value)
        : DEFAULT_SETTINGS.storefront

      setSettings({
        ...nextSettings,
        nav_title: navTitle,
        general_logo: generalLogo,
        contact_faq_image: contactFaqImage,
        contact_map_url: contactMapUrl,
        meta_pixel: metaPixelId,
        meta_pixel_id: metaPixelId,
        logo_url: generalLogo.logo_url || nextSettings.logo_url,
        storefront: applyStorefrontPreview(storefront),
      })
    } catch (error) {
      console.error("Error loading public settings:", error)
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshSettings()
  }, [locale])

  useEffect(() => {
    applyDocumentSettings(settings)
    applyTrackingSettings(settings)
    applyStorefrontTheme(settings.storefront?.theme)
  }, [settings])

  const value = useMemo(
    () => ({
      settings,
      loading,
      refreshSettings,
      updateLocalSetting: (key, value) => {
        setSettings((prev) => setSettingValue(prev, key, value))
      },
      brandName: settings.site_title || settings.meta?.title || DEFAULT_SETTINGS.site_title,
      logoUrl: settings.general_logo?.logo_url || settings.logo_url || "",
      faviconUrl: settings.favicon_url || "",
    }),
    [settings, loading],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

function applyStorefrontPreview(storefront) {
  return {
    ...storefront,
    active_template: DEFAULT_SETTINGS.storefront.active_template,
    home_template: DEFAULT_SETTINGS.storefront.home_template,
    template: DEFAULT_SETTINGS.storefront.home_template,
    visual_design: normalizeVisualDesign(DEFAULT_SETTINGS.storefront.visual_design),
  }
}

export function useSettings() {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error("useSettings debe usarse dentro de SettingsProvider")
  }

  return context
}

function normalizeSettingsResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const meta = data.meta && typeof data.meta === "object" ? data.meta : {}
  const socialLinks =
    data.social_links && typeof data.social_links === "object" ? data.social_links : {}
  const loyalty = data.loyalty && typeof data.loyalty === "object" ? data.loyalty : {}

  return {
    ...DEFAULT_SETTINGS,
    ...data,
    site_title: data.site_title || "",
    nav_title: normalizeNavTitleValue(data.nav_title || data.nav_title_value || data.header_tagline),
    general_logo: normalizeGeneralLogoValue(data.general_logo || data.general_logo_value || {
      logo_path: data.logo_path,
      logo_url: data.logo_url,
    }),
    contact_faq_image: normalizeContactFaqImageValue(data.contact_faq_image || data.contact_faq_image_value),
    contact_map_url: data.contact_map_url || data.google_maps_url || "",
    logo_url: normalizeMediaUrl(data.logo_url || data.logo_path),
    favicon_url: normalizeMediaUrl(data.favicon_url || data.favicon_path),
    contact_numbers: Array.isArray(data.contact_numbers) ? data.contact_numbers.slice(0, 2) : [],
    social_links: {
      ...DEFAULT_SETTINGS.social_links,
      ...socialLinks,
    },
    meta: {
      ...DEFAULT_SETTINGS.meta,
      ...meta,
      keywords: Array.isArray(meta.keywords) ? meta.keywords : [],
    },
    og_image_url: normalizeMediaUrl(data.og_image_url || data.og_image_path),
    meta_pixel: normalizeMetaPixelValue(data.meta_pixel || data.meta_pixel_id),
    meta_pixel_id: normalizeMetaPixelValue(data.meta_pixel_id || data.meta_pixel),
    loyalty: {
      ...DEFAULT_SETTINGS.loyalty,
      ...loyalty,
      first_purchase_discount_enabled: Boolean(loyalty.first_purchase_discount_enabled),
      first_purchase_discount_percentage: Number(
        loyalty.first_purchase_discount_percentage ?? 0,
      ),
      cashback_enabled: Boolean(loyalty.cashback_enabled),
      cashback_earn_percentage: Number(loyalty.cashback_earn_percentage ?? 0),
      cashback_redeem_enabled: Boolean(loyalty.cashback_redeem_enabled),
      cashback_max_redeem_percentage: Number(loyalty.cashback_max_redeem_percentage ?? 100),
    },
  }
}

function normalizeContactFaqImageValue(value) {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS.contact_faq_image

  return {
    image_path: value.image_path || value.path || "",
    image_url: normalizeMediaUrl(value.image_url || value.url || value.image_path || value.path),
  }
}

function normalizeContactFaqImageResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  return normalizeContactFaqImageValue(data.value || data)
}

function normalizeContactMapUrlResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data

  if (typeof value === "string") return value
  if (value && typeof value === "object") return value.url || ""

  return ""
}

function normalizeMetaPixelResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  return normalizeMetaPixelValue(data.value || data)
}

function normalizeMetaPixelValue(value) {
  if (typeof value === "string" || typeof value === "number") return String(value || "").trim()
  if (value && typeof value === "object") return String(value.pixel_id || value.meta_pixel_id || value.meta_pixel || "").trim()

  return ""
}

function normalizeGeneralLogoResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  return normalizeGeneralLogoValue(data.value || data)
}

function normalizeGeneralLogoValue(value) {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS.general_logo

  return {
    logo_path: value.logo_path || "",
    logo_url: normalizeMediaUrl(value.logo_url || value.logo_path),
  }
}

function normalizeNavTitleResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  return normalizeNavTitleValue(data.value || data)
}

function normalizeNavTitleValue(value) {
  if (typeof value === "string") {
    return { title: value || DEFAULT_SETTINGS.nav_title.title }
  }

  if (value && typeof value === "object") {
    return {
      title: value.title || DEFAULT_SETTINGS.nav_title.title,
    }
  }

  return DEFAULT_SETTINGS.nav_title
}

function normalizeStorefrontResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const construction = data.construction && typeof data.construction === "object"
    ? data.construction
    : {}
  const theme = data.theme && typeof data.theme === "object" ? data.theme : {}
  return {
    ...DEFAULT_SETTINGS.storefront,
    ...data,
    is_published: Boolean(data.is_published),
    construction: {
      ...DEFAULT_SETTINGS.storefront.construction,
      ...construction,
      title: construction.title || data.construction_title || DEFAULT_SETTINGS.storefront.construction.title,
      message:
        construction.message ||
        data.construction_message ||
        DEFAULT_SETTINGS.storefront.construction.message,
    },
    home_template: DEFAULT_SETTINGS.storefront.home_template,
    active_template: DEFAULT_SETTINGS.storefront.active_template,
    template: DEFAULT_SETTINGS.storefront.home_template,
    available_home_templates: Array.isArray(data.available_home_templates)
      ? data.available_home_templates
      : DEFAULT_SETTINGS.storefront.available_home_templates,
    available_templates: Array.isArray(data.available_templates)
      ? data.available_templates
      : DEFAULT_SETTINGS.storefront.available_templates,
    available_home_template_options: Array.isArray(data.available_home_template_options)
      ? data.available_home_template_options
      : DEFAULT_SETTINGS.storefront.available_home_template_options,
    visual_design: normalizeVisualDesign(DEFAULT_SETTINGS.storefront.visual_design),
    theme: {
      ...DEFAULT_SETTINGS.storefront.theme,
      ...theme,
      buttons: normalizeThemeButtons(theme.buttons),
    },
  }
}

function normalizeVisualDesign(visualDesign = {}) {
  const defaultVisualDesign = DEFAULT_SETTINGS.storefront.visual_design

  return {
    nav: {
      ...defaultVisualDesign.nav,
      ...(visualDesign.nav && typeof visualDesign.nav === "object" ? visualDesign.nav : {}),
    },
    home: {
      ...defaultVisualDesign.home,
      ...(visualDesign.home && typeof visualDesign.home === "object" ? visualDesign.home : {}),
    },
    footer: {
      ...defaultVisualDesign.footer,
      ...(visualDesign.footer && typeof visualDesign.footer === "object" ? visualDesign.footer : {}),
    },
  }
}

function normalizeThemeButtons(buttons = {}) {
  const defaultButtons = DEFAULT_SETTINGS.storefront.theme.buttons
  const nextButtons = {}

  Object.entries(defaultButtons).forEach(([buttonKey, defaultValue]) => {
    const buttonValue = buttons?.[buttonKey] && typeof buttons[buttonKey] === "object"
      ? buttons[buttonKey]
      : {}

    nextButtons[buttonKey] = {
      ...defaultValue,
      ...buttonValue,
    }
  })

  return nextButtons
}

function setSettingValue(settings, key, value) {
  const parts = String(key || "").split(".").filter(Boolean)
  if (!parts.length) return settings

  const next = { ...settings }
  let cursor = next

  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      cursor[part] = value
      return
    }

    cursor[part] = {
      ...(cursor[part] && typeof cursor[part] === "object" ? cursor[part] : {}),
    }
    cursor = cursor[part]
  })

  return next
}

function applyDocumentSettings(settings) {
  const title = settings.meta?.title || settings.site_title || DEFAULT_SETTINGS.site_title
  const description = settings.meta?.description || ""
  const keywords = Array.isArray(settings.meta?.keywords) ? settings.meta.keywords.join(", ") : ""

  document.title = title
  setMetaTag("description", description)
  setMetaTag("keywords", keywords)
  setMetaProperty("og:title", title)
  setMetaProperty("og:description", description)
  setMetaProperty("og:image", settings.og_image_url || settings.logo_url || "")

  if (settings.favicon_url) {
    let favicon = document.querySelector("link[rel='icon']")

    if (!favicon) {
      favicon = document.createElement("link")
      favicon.setAttribute("rel", "icon")
      document.head.appendChild(favicon)
    }

    favicon.setAttribute("href", settings.favicon_url)
  }
}

function setMetaTag(name, content) {
  if (!content) return

  let meta = document.querySelector(`meta[name='${name}']`)

  if (!meta) {
    meta = document.createElement("meta")
    meta.setAttribute("name", name)
    document.head.appendChild(meta)
  }

  meta.setAttribute("content", content)
}

function setMetaProperty(property, content) {
  if (!content) return

  let meta = document.querySelector(`meta[property='${property}']`)

  if (!meta) {
    meta = document.createElement("meta")
    meta.setAttribute("property", property)
    document.head.appendChild(meta)
  }

  meta.setAttribute("content", content)
}

function applyTrackingSettings(settings) {
  removeManagedTrackingNodes()

  if (settings.google_analytics_pixel) {
    const gaScript = document.createElement("script")
    gaScript.async = true
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      settings.google_analytics_pixel,
    )}`
    gaScript.dataset.settingsTracking = "google-analytics"
    document.head.appendChild(gaScript)

    const gaInline = document.createElement("script")
    gaInline.dataset.settingsTracking = "google-analytics-inline"
    gaInline.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${settings.google_analytics_pixel}');
    `
    document.head.appendChild(gaInline)
  }

  loadMetaPixel(settings.meta_pixel_id || settings.meta_pixel)
}

function applyStorefrontTheme(theme = {}) {
  const nextTheme = {
    ...DEFAULT_SETTINGS.storefront.theme,
    ...(theme && typeof theme === "object" ? theme : {}),
  }
  const buttons = normalizeThemeButtons(nextTheme.buttons)
  const root = document.documentElement

  root.style.setProperty("--color-primary", nextTheme.primary_color)
  root.style.setProperty("--color-secondary", nextTheme.secondary_color)
  root.style.setProperty("--color-accent", nextTheme.accent_color)
  root.style.setProperty("--color-warning", nextTheme.accent_color)
  root.style.setProperty("--color-background", nextTheme.background_color)
  root.style.setProperty("--color-surface", nextTheme.surface_color)
  root.style.setProperty("--color-card", nextTheme.surface_color)
  root.style.setProperty("--color-text-primary", nextTheme.text_color)
  root.style.setProperty("--color-price", nextTheme.text_color)
  root.style.setProperty("--color-text-secondary", nextTheme.muted_text_color)
  root.style.setProperty("--color-text-muted", nextTheme.muted_text_color)
  root.style.setProperty("--color-text-inverse", nextTheme.button_text_color)

  Object.entries(buttons).forEach(([buttonKey, buttonTheme]) => {
    root.style.setProperty(`--button-${buttonKey}-bg`, buttonTheme.background_color)
    root.style.setProperty(`--button-${buttonKey}-text`, buttonTheme.text_color)
    root.style.setProperty(`--button-${buttonKey}-border`, buttonTheme.border_color)
    root.style.setProperty(`--button-${buttonKey}-hover-bg`, buttonTheme.hover_background_color)
    root.style.setProperty(`--button-${buttonKey}-hover-text`, buttonTheme.hover_text_color)
    root.style.setProperty(`--button-${buttonKey}-hover-border`, buttonTheme.hover_border_color)
  })
}

function removeManagedTrackingNodes() {
  document.querySelectorAll("[data-settings-tracking]").forEach((node) => {
    node.remove()
  })
}
