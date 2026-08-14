import { useEffect, useMemo, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import {
  getAdminStorefront,
  updateAdminStorefront,
} from "../../../services/api/settingsService"
import { notifyError, notifySuccess } from "../../../utils/toast"
import "./DesignEcommercePage.css"

const DEFAULT_VISUAL_DESIGN = {
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
}

const TEMPLATE_PRESETS = [
  {
    key: "classic",
    name: "Classic",
    description: "Home equilibrado con carrusel, beneficios, categorías, productos y banners de marca.",
    visual_design: DEFAULT_VISUAL_DESIGN,
  },
  {
    key: "minimal",
    name: "Minimal",
    description: "Diseño limpio, ligero y editorial para marcas que prefieren menos ruido visual.",
    visual_design: {
      nav: { variant: "minimal", density: "comfortable", show_top_bar: false },
      home: {
        variant: "minimal",
        hero: "clean",
        category_layout: "simple_grid",
        product_layout: "minimal_cards",
      },
      footer: { variant: "minimal", newsletter_position: "inline" },
    },
  },
  {
    key: "showcase",
    name: "Showcase",
    description: "Diseño más visual para destacar marca, imágenes grandes y productos protagonistas.",
    visual_design: {
      nav: { variant: "showcase", density: "comfortable", show_top_bar: true },
      home: {
        variant: "showcase",
        hero: "visual",
        category_layout: "featured_grid",
        product_layout: "showcase_cards",
      },
      footer: { variant: "showcase", newsletter_position: "block" },
    },
  },
  {
    key: "promo",
    name: "Promo",
    description: "Diseño enfocado en ofertas, promociones y conversión rápida.",
    visual_design: {
      nav: { variant: "promo_dense", density: "compact", show_top_bar: true },
      home: {
        variant: "promo_first",
        hero: "promo_banner",
        category_layout: "compact_grid",
        product_layout: "deal_cards",
      },
      footer: { variant: "promo_links", newsletter_position: "inline" },
    },
  },
  {
    key: "editorial_shop",
    name: "Editorial Shop",
    description: "Diseño editorial con nav amplio, buscador expandible, hero de marca, carruseles y footer con newsletter.",
    visual_design: {
      nav: { variant: "editorial_shop", density: "comfortable", show_top_bar: true },
      home: {
        variant: "editorial_shop",
        hero: "brand_banners",
        category_layout: "editorial_carousel",
        product_layout: "editorial_cards",
      },
      footer: { variant: "editorial_shop", newsletter_position: "featured" },
    },
  },
]

function DesignEcommercePage() {
  const [storefront, setStorefront] = useState(null)
  const [draft, setDraft] = useState({
    active_template: "classic",
    template: "classic",
    available_templates: [],
    available_home_template_options: TEMPLATE_PRESETS,
    visual_design: DEFAULT_VISUAL_DESIGN,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const templateOptions = useMemo(() => getTemplateOptions(draft), [draft])
  const selectedTemplate = getTemplatePreset(draft.active_template || draft.template, {
    key: draft.active_template || draft.template,
    name: draft.active_template || draft.template,
    description: "",
    visual_design: draft.visual_design,
  })

  const isDirty = useMemo(() => {
    if (!storefront) return false

    return JSON.stringify(buildDesignSnapshot(draft)) !== JSON.stringify(buildDesignSnapshot(storefront))
  }, [draft, storefront])

  useEffect(() => {
    loadStorefront()
  }, [])

  async function loadStorefront() {
    try {
      setLoading(true)
      const response = await getAdminStorefront()
      const normalized = normalizeStorefrontResponse(response)
      setStorefront(normalized)
      setDraft(buildDesignSnapshot(normalized))
    } catch (error) {
      console.error("Error al cargar diseño del ecommerce:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar el diseño del ecommerce.")
    } finally {
      setLoading(false)
    }
  }

  function handleTemplateSelect(templateKey) {
    const preset = getTemplatePreset(templateKey)

    if (!preset || draft.active_template === preset.key) return

    setDraft((prev) => ({
      ...prev,
      active_template: preset.key,
      template: preset.key,
      visual_design: normalizeVisualDesign(preset.visual_design),
    }))
  }

  async function handleSave() {
    const payload = buildStorefrontPayload(storefront, draft)

    try {
      setSaving(true)
      const response = await updateAdminStorefront(payload)
      const normalized = normalizeStorefrontResponse(response)
      setStorefront(normalized)
      setDraft(buildDesignSnapshot(normalized))
      notifySuccess("Plantilla del ecommerce guardada correctamente.")
    } catch (error) {
      console.error("Error al guardar plantilla del ecommerce:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar la plantilla.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminCard
      title="Diseña tu ecommerce"
      subtitle="Selecciona la plantilla visual de la tienda."
      right={
        <button
          type="button"
          className="design-ecommerce__save"
          onClick={handleSave}
          disabled={loading || saving || !isDirty}
        >
          {saving ? "Guardando..." : "Guardar plantilla"}
        </button>
      }
    >
      {loading ? (
        <div className="design-ecommerce__loading">Cargando plantillas...</div>
      ) : (
        <div className="design-ecommerce">
          <section className="design-ecommerce__preview">
            <span className="design-ecommerce__preview-label">Plantilla activa</span>
            <h2>{selectedTemplate?.name || draft.active_template}</h2>
            <p>{selectedTemplate?.description || "Plantilla visual disponible para el ecommerce."}</p>

            <TemplateRealPreview templateKey={draft.active_template || draft.template} />
          </section>

          <section className="design-ecommerce__controls">
            <div className="design-ecommerce__block">
              <div className="design-ecommerce__block-head">
                <h3>Plantillas</h3>
                <p>Elige una estructura visual. Los colores y botones no se configuran desde este módulo.</p>
              </div>

              <div className="design-ecommerce__presets">
                {templateOptions.map((template) => (
                  <button
                    key={template.key}
                    type="button"
                    className={`design-ecommerce__preset ${
                      draft.active_template === template.key ? "is-active" : ""
                    }`}
                    onClick={() => handleTemplateSelect(template.key)}
                  >
                    <span className="design-ecommerce__preset-icon">
                      <i className={`bi ${getTemplateIcon(template.key)}`} aria-hidden="true" />
                    </span>
                    <strong>{template.name}</strong>
                    <small>{template.description}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="design-ecommerce__block">
              <label className="design-ecommerce__field">
                <span>Plantilla de home</span>
                <select
                  value={draft.active_template || draft.template}
                  onChange={(event) => handleTemplateSelect(event.target.value)}
                >
                  {templateOptions.map((template) => (
                    <option key={template.key} value={template.key}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        </div>
      )}
    </AdminCard>
  )
}

function TemplateRealPreview({ templateKey }) {
  const normalizedTemplate = templateKey || "classic"
  const previewUrl = `/preview/ecommerce?template=${encodeURIComponent(normalizedTemplate)}`

  return (
    <div className="design-real-preview">
      <div className="design-real-preview__bar">
        <span />
        <span />
        <span />
        <a href={previewUrl} target="_blank" rel="noreferrer">
          Abrir preview
        </a>
      </div>
      <iframe
        key={normalizedTemplate}
        title={`Preview ${normalizedTemplate}`}
        src={previewUrl}
        loading="lazy"
      />
    </div>
  )
}

function normalizeStorefrontResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const construction = data.construction && typeof data.construction === "object"
    ? data.construction
    : {}
  const activeTemplate = data.active_template || data.template || data.home_template || "classic"
  const preset = getTemplatePreset(activeTemplate)
  const visualDesign = data.visual_design && typeof data.visual_design === "object"
    ? data.visual_design
    : preset?.visual_design

  return {
    is_published: Boolean(data.is_published),
    construction_title: data.construction_title || construction.title || "Ecommerce en construcción",
    construction_message:
      data.construction_message ||
      construction.message ||
      "Estamos preparando la tienda. Vuelve pronto.",
    active_template: activeTemplate,
    template: data.template || activeTemplate,
    available_templates: Array.isArray(data.available_templates) ? data.available_templates : [],
    available_home_template_options: Array.isArray(data.available_home_template_options)
      ? data.available_home_template_options
      : TEMPLATE_PRESETS,
    visual_design: normalizeVisualDesign(visualDesign),
  }
}

function buildDesignSnapshot(value) {
  const activeTemplate = value?.active_template || value?.template || value?.home_template || "classic"

  return {
    active_template: activeTemplate,
    template: value?.template || activeTemplate,
    available_templates: Array.isArray(value?.available_templates) ? value.available_templates : [],
    available_home_template_options: Array.isArray(value?.available_home_template_options)
      ? value.available_home_template_options
      : TEMPLATE_PRESETS,
    visual_design: normalizeVisualDesign(value?.visual_design),
  }
}

function buildStorefrontPayload(storefront, draft) {
  return {
    is_published: Boolean(storefront?.is_published),
    construction_title: storefront?.construction_title || "Ecommerce en construcción",
    construction_message:
      storefront?.construction_message || "Estamos preparando la tienda. Vuelve pronto.",
    active_template: draft.active_template || draft.template || "classic",
    template: draft.template || draft.active_template || "classic",
    visual_design: normalizeVisualDesign(draft.visual_design),
  }
}

function normalizeVisualDesign(visualDesign = {}) {
  return {
    nav: {
      ...DEFAULT_VISUAL_DESIGN.nav,
      ...(visualDesign?.nav && typeof visualDesign.nav === "object" ? visualDesign.nav : {}),
    },
    home: {
      ...DEFAULT_VISUAL_DESIGN.home,
      ...(visualDesign?.home && typeof visualDesign.home === "object" ? visualDesign.home : {}),
    },
    footer: {
      ...DEFAULT_VISUAL_DESIGN.footer,
      ...(visualDesign?.footer && typeof visualDesign.footer === "object" ? visualDesign.footer : {}),
    },
  }
}

function getTemplatePreset(templateKey, fallback = null) {
  const preset = TEMPLATE_PRESETS.find((item) => item.key === templateKey)

  if (preset) return preset
  if (!fallback) return null

  return {
    key: fallback.key,
    name: fallback.name || fallback.key,
    description: fallback.description || "",
    visual_design: fallback.visual_design || DEFAULT_VISUAL_DESIGN,
  }
}

function getTemplateOptions(draft) {
  const options = Array.isArray(draft.available_templates) && draft.available_templates.length
    ? draft.available_templates
    : Array.isArray(draft.available_home_template_options) && draft.available_home_template_options.length
    ? draft.available_home_template_options
    : TEMPLATE_PRESETS

  return options.map((option) => {
    const key = option.key || option
    const preset = getTemplatePreset(key)

    return {
      ...(typeof option === "object" ? option : { key }),
      key,
      name: option.name || preset?.name || key,
      description: option.description || preset?.description || "",
      visual_design: option.visual_design || preset?.visual_design || DEFAULT_VISUAL_DESIGN,
    }
  })
}

function getTemplateIcon(templateKey) {
  const icons = {
    classic: "bi-layout-text-window",
    minimal: "bi-layout-sidebar",
    showcase: "bi-images",
    promo: "bi-tags",
    editorial_shop: "bi-newspaper",
  }

  return icons[templateKey] || "bi-window"
}

export default DesignEcommercePage
