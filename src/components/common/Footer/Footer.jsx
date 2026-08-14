import { useEffect, useState } from "react"
import { useAuth } from "../../../context/AuthContext"
import { useLocalization } from "../../../context/LocalizationContext"
import { useSettings } from "../../../context/SettingsContext"
import { sendContactLead } from "../../../services/api/contactService"
import {
  getPublicHomeBenefits,
  updateAdminHomeBenefit,
} from "../../../services/api/settingsService"
import { normalizeMediaUrl } from "../../../utils/mediaUrl"
import { notifyError, notifySuccess, notifyWarning } from "../../../utils/toast"
import AdminTranslationsFields from "../../../admin/components/AdminTranslationsFields/AdminTranslationsFields"
import {
  appendTranslationsToFormData,
  compactTranslations,
  normalizeTranslations,
  setTranslationValue,
} from "../../../admin/utils/adminTranslations"
import "./footer.css"

const DEFAULT_HOME_BENEFITS = [
  {
    benefit: 1,
    title: "Paga con tarjetas de crédito / débito",
    text: "Puedes pagar con cualquier tarjeta de débito, meses sin intereses y comprar las 24 horas, los 7 días de la semana.",
    icon_url: "",
    fallbackIcon: "bi-credit-card-2-front",
  },
  {
    benefit: 2,
    title: "Envío gratis en la compra de $2500",
    text: "Al llegar a esta cantidad aprovecha el envío gratis.",
    icon_url: "",
    fallbackIcon: "bi-truck",
  },
  {
    benefit: 3,
    title: "Compra segura siempre",
    text: "Protegemos tus datos y tu compra en cada paso para que puedas comprar con confianza.",
    icon_url: "",
    fallbackIcon: "bi-shield-check",
  },
]

function Footer() {
  const { settings, brandName, logoUrl } = useSettings()
  const { isAuthenticated, isInternal, modules } = useAuth()
  const { locale, t, availableLocales } = useLocalization()
  const [submittingLead, setSubmittingLead] = useState(false)
  const [leadStatus, setLeadStatus] = useState(null)
  const [homeBenefits, setHomeBenefits] = useState(DEFAULT_HOME_BENEFITS)
  const [homeBenefitsLoading, setHomeBenefitsLoading] = useState(true)
  const contactNumbers = Array.isArray(settings.contact_numbers)
    ? settings.contact_numbers.filter(Boolean)
    : []
  const socialLinks = settings.social_links || {}
  const footerDesign = settings.storefront?.visual_design?.footer || {}
  const footerVariant = footerDesign.variant || "classic"
  const newsletterPosition = footerDesign.newsletter_position || "inline"
  const isEditorialShop = settings.storefront?.active_template === "editorial_shop"
  const canEditHomeBenefits =
    isAuthenticated && isInternal && hasModule(modules, "configuracion_ecommerce")

  useEffect(() => {
    loadHomeBenefits()
  }, [locale])

  async function loadHomeBenefits() {
    try {
      setHomeBenefitsLoading(true)
      const response = await getPublicHomeBenefits()
      setHomeBenefits(normalizeHomeBenefitsResponse(response))
    } catch (error) {
      console.error("Error loading home benefits:", error?.response?.data || error)
      setHomeBenefits(DEFAULT_HOME_BENEFITS)
    } finally {
      setHomeBenefitsLoading(false)
    }
  }

  async function handleSaveHomeBenefit(benefitId, payload, options = {}) {
    const response = await updateAdminHomeBenefit(benefitId, payload, options)
    const benefit = normalizeHomeBenefitResponse(response)

    setHomeBenefits((prev) =>
      prev.map((item) => (item.benefit === benefitId ? benefit : item))
    )

    notifySuccess("Beneficio actualizado correctamente.")
  }

  const handleLeadSubmit = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
    }

    try {
      setSubmittingLead(true)
      setLeadStatus(null)

      const response = await sendContactLead(payload)

      setLeadStatus({
        type: "success",
        message: response?.message || "Información enviada correctamente.",
      })
      form.reset()
    } catch (error) {
      setLeadStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "No fue posible enviar tu información. Inténtalo nuevamente.",
      })
    } finally {
      setSubmittingLead(false)
    }
  }

  return (
    <footer className={`new_footer_area bg_color footer--${footerVariant} footer--newsletter-${newsletterPosition}`}>
      {isEditorialShop ? (
        <>
          <HomeBenefitsSection
            loading={homeBenefitsLoading}
            benefits={homeBenefits}
            canEdit={canEditHomeBenefits}
            locales={availableLocales.map((item) => item.code)}
            onSave={handleSaveHomeBenefit}
          />
          <EditorialShopFooter
            socialLinks={socialLinks}
            submittingLead={submittingLead}
            leadStatus={leadStatus}
            onLeadSubmit={handleLeadSubmit}
            t={t}
          />
        </>
      ) : (
        <>
          <HomeBenefitsSection
            loading={homeBenefitsLoading}
            benefits={homeBenefits}
            canEdit={canEditHomeBenefits}
            locales={availableLocales.map((item) => item.code)}
            onSave={handleSaveHomeBenefit}
          />

      <div className="new_footer_top">
        <div className="footer_container">
          <div className="footer_row">
            <div className="footer_col">
              <div
                className="f_widget company_widget wow fadeInLeft"
                data-wow-delay="0.2s"
                style={{
                  visibility: "visible",
                  animationDelay: "0.2s",
                  animationName: "fadeInLeft",
                }}
              >
                <h3 className="f-title f_600 t_color f_size_18">{t("newsletterTitle")}</h3>
                <p>{t("newsletterShortText")}</p>

                <form
                  className="f_subscribe_two mailchimp"
                  onSubmit={handleLeadSubmit}
                >
                  <input
                    type="text"
                    name="name"
                    className="form-control memail"
                    placeholder={t("name")}
                    autoComplete="name"
                    required
                  />
                  <input
                    type="email"
                    name="email"
                    className="form-control memail"
                    placeholder={t("email")}
                    autoComplete="email"
                    required
                  />

                  {leadStatus ? (
                    <p className={`footer_form_status footer_form_status--${leadStatus.type}`}>
                      {leadStatus.message}
                    </p>
                  ) : null}

                  <button
                    className="btn btn_get btn_get_two"
                    type="submit"
                    disabled={submittingLead}
                  >
                    {submittingLead ? t("sending") : t("send")}
                  </button>
                </form>
              </div>
            </div>

            <div className="footer_col">
              <div
                className="f_widget about-widget pl_70 wow fadeInLeft"
                data-wow-delay="0.4s"
                style={{
                  visibility: "visible",
                  animationDelay: "0.4s",
                  animationName: "fadeInLeft",
                }}
              >
                <h3 className="f-title f_600 t_color f_size_18">{t("contact")}</h3>
                <ul className="list-unstyled f_list">
                  {contactNumbers.map((number) => (
                    <li key={number}>
                      <a href={`tel:${number.replace(/\s+/g, "")}`}>{number}</a>
                    </li>
                  ))}
                  {settings.email ? (
                    <li>
                      <a href={`mailto:${settings.email}`}>{settings.email}</a>
                    </li>
                  ) : null}
                  {settings.address ? (
                    <li>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(settings.address)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {settings.address}
                      </a>
                    </li>
                  ) : null}
                  {!contactNumbers.length && !settings.email && !settings.address ? (
                    <li>Configura tus datos de contacto</li>
                  ) : null}
                </ul>
              </div>
            </div>

            <div className="footer_col">
              <div
                className="f_widget about-widget pl_70 wow fadeInLeft"
                data-wow-delay="0.6s"
                style={{
                  visibility: "visible",
                  animationDelay: "0.6s",
                  animationName: "fadeInLeft",
                }}
              >
                <h3 className="f-title f_600 t_color f_size_18">{t("legal")}</h3>
                <ul className="list-unstyled f_list">
                  <li><a href="/aviso-privacidad">Aviso de privacidad</a></li>
                  <li><a href="/terminos-y-condiciones">Términos y condiciones</a></li>
                  <li><a href="/contacto">Contacto</a></li>
                </ul>
              </div>
            </div>

            <div className="footer_col">
              <div
                className="f_widget social-widget pl_70 wow fadeInLeft"
                data-wow-delay="0.8s"
                style={{
                  visibility: "visible",
                  animationDelay: "0.8s",
                  animationName: "fadeInLeft",
                }}
              >
                <h3 className="f-title f_600 t_color f_size_18">{t("socialNetworks")}</h3>

                <div className="f_social_icon">
                  {socialLinks.facebook ? (
                    <a
                      href={socialLinks.facebook}
                      className="fab fa-facebook-f"
                      aria-label="Facebook"
                      target="_blank"
                      rel="noreferrer"
                    ></a>
                  ) : null}
                  {socialLinks.instagram ? (
                    <a
                      href={socialLinks.instagram}
                      className="fab fa-instagram"
                      aria-label="Instagram"
                      target="_blank"
                      rel="noreferrer"
                    ></a>
                  ) : null}
                  {socialLinks.tiktok ? (
                    <a
                      href={socialLinks.tiktok}
                      className="fab fa-tiktok"
                      aria-label="TikTok"
                      target="_blank"
                      rel="noreferrer"
                    ></a>
                  ) : null}
                </div>

                {logoUrl ? (
                  <div style={{ marginTop: "24px" }}>
                    <img
                      src={logoUrl}
                      alt={brandName}
                      style={{ maxWidth: "220px", width: "100%", height: "auto" }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

      </div>
        </>
      )}

      <div className="footer_bottom">
        <div className="footer_container">
          <div className={`footer_bottom_row ${isEditorialShop ? "footer_bottom_row--editorial" : ""}`}>
            {!isEditorialShop ? (
              <div className="footer_bottom_left">
                <p className="mb-0 f_400">todos los derechos reservados de {brandName}</p>
              </div>
            ) : null}

            <div className="footer_bottom_right">
              <p>
                Diseñado por 🚀{" "}
                <a
                  href="https://cloudi.mx"
                  className="footer_cloudi_link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  cloudi
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

function HomeBenefitsSection({ loading, benefits, canEdit, locales, onSave }) {
  return (
    <section className="footer_benefits" aria-label="Beneficios de compra">
      <div className="footer_container">
        <div className="footer_benefits_grid">
          {loading
            ? DEFAULT_HOME_BENEFITS.map((benefit) => (
                <HomeBenefitSkeleton key={benefit.benefit} />
              ))
            : benefits.map((benefit) => (
                <HomeBenefitCard
                  key={benefit.benefit}
                  benefit={benefit}
                  canEdit={canEdit}
                  locales={locales}
                  onSave={onSave}
                />
              ))}
        </div>
      </div>
    </section>
  )
}

function EditorialShopFooter({
  socialLinks,
  submittingLead,
  leadStatus,
  onLeadSubmit,
  t,
}) {
  return (
    <section className="editorial-footer">
      <div className="editorial-footer__newsletter">
        <h2>{t("newsletterTitle")}</h2>
        <p>{t("newsletterText")}</p>
        <form onSubmit={onLeadSubmit}>
          <input type="text" name="name" placeholder={t("name")} autoComplete="name" required />
          <input type="email" name="email" placeholder={t("email")} autoComplete="email" required />
          {leadStatus ? (
            <p className={`footer_form_status footer_form_status--${leadStatus.type}`}>
              {leadStatus.message}
            </p>
          ) : null}
          <button type="submit" disabled={submittingLead}>
            {submittingLead ? t("sending") : t("send")}
          </button>
        </form>
      </div>

      <div className="editorial-footer__links">
        <div>
          <h3>{t("legal")}</h3>
          <a href="/aviso-privacidad">{t("privacyNotice")}</a>
          <a href="/terminos-y-condiciones">{t("terms")}</a>
          <a href="/contacto">{t("contact")}</a>
        </div>
        <div>
          <h3>{t("socialNetworks")}</h3>
          <div className="editorial-footer__socials">
            {socialLinks.instagram ? <a href={socialLinks.instagram} target="_blank" rel="noreferrer"><i className="bi bi-instagram" /></a> : null}
            {socialLinks.facebook ? <a href={socialLinks.facebook} target="_blank" rel="noreferrer"><i className="bi bi-facebook" /></a> : null}
            {socialLinks.tiktok ? <a href={socialLinks.tiktok} target="_blank" rel="noreferrer"><i className="bi bi-tiktok" /></a> : null}
            {!socialLinks.instagram && !socialLinks.facebook && !socialLinks.tiktok ? (
              <>
                <a href="/contacto"><i className="bi bi-pinterest" /></a>
                <a href="/contacto"><i className="bi bi-facebook" /></a>
                <a href="/contacto"><i className="bi bi-instagram" /></a>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="editorial-footer__top"
        aria-label="Volver arriba"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑
      </button>
    </section>
  )
}

function HomeBenefitSkeleton() {
  return (
    <article className="footer_benefit footer_benefit--skeleton" aria-hidden="true">
      <span className="footer_benefit_skeleton_icon" />
      <span className="footer_benefit_skeleton_line is-title" />
      <span className="footer_benefit_skeleton_line" />
      <span className="footer_benefit_skeleton_line is-short" />
    </article>
  )
}

function HomeBenefitCard({ benefit, canEdit, locales, onSave }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(() => getBenefitDraft(benefit))

  useEffect(() => {
    if (!editing) setDraft(getBenefitDraft(benefit))
  }, [benefit, editing])

  function handleChange(event) {
    const { name, value, type, checked, files } = event.target

    setDraft((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "file" ? files?.[0] || null : value,
    }))
  }

  function handleTranslationChange(field, locale, value) {
    setDraft((prev) => ({
      ...prev,
      translations: setTranslationValue(prev.translations, field, locale, value),
    }))
  }

  function handleCancel() {
    setDraft(getBenefitDraft(benefit))
    setEditing(false)
  }

  async function handleSave() {
    const title = draft.title.trim()
    const text = draft.text.trim()

    if (title.length > 120) {
      notifyWarning("El título debe tener máximo 120 caracteres.")
      return
    }

    if (text.length > 300) {
      notifyWarning("El texto debe tener máximo 300 caracteres.")
      return
    }

    try {
      setSaving(true)
      const hasFile = draft.icon instanceof File
      const payload = hasFile
        ? buildHomeBenefitFormData({
            title,
            text,
            icon: draft.icon,
            removeIcon: draft.remove_icon,
            translations: draft.translations,
          })
        : {
            titulo: title,
            texto: text,
            translations: compactTranslations(draft.translations),
            ...(draft.remove_icon ? { remove_icon: true } : {}),
          }

      await onSave(benefit.benefit, payload, { hasFile })
      setEditing(false)
    } catch (error) {
      console.error("Error updating home benefit:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el beneficio.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className={`footer_benefit ${editing ? "is-editing" : ""}`}>
      <span className="footer_benefit_icon" aria-hidden="true">
        {benefit.icon_url && !draft.remove_icon ? (
          <img src={benefit.icon_url} alt="" />
        ) : (
          <i className={`bi ${benefit.fallbackIcon}`} />
        )}
      </span>

      {editing ? (
        <div className="footer_benefit_editor">
          <label>
            <span>Título</span>
            <input
              type="text"
              name="title"
              value={draft.title}
              onChange={handleChange}
              maxLength="120"
              disabled={saving}
            />
          </label>

          <label>
            <span>Texto</span>
            <textarea
              name="text"
              value={draft.text}
              onChange={handleChange}
              maxLength="300"
              disabled={saving}
            />
          </label>

          <AdminTranslationsFields
            locales={locales}
            translations={draft.translations}
            fields={[
              { name: "title", label: "Título", placeholder: "Título traducido" },
              {
                name: "text",
                label: "Texto",
                type: "textarea",
                placeholder: "Texto traducido",
              },
            ]}
            onChange={handleTranslationChange}
          />

          <label>
            <span>Ícono</span>
            <input
              type="file"
              name="icon"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              onChange={handleChange}
              disabled={saving}
            />
          </label>

          {benefit.icon_url ? (
            <label className="footer_benefit_remove">
              <input
                type="checkbox"
                name="remove_icon"
                checked={draft.remove_icon}
                onChange={handleChange}
                disabled={saving}
              />
              <span>Quitar ícono actual</span>
            </label>
          ) : null}

          <div className="footer_benefit_actions">
            <button type="button" onClick={handleCancel} disabled={saving}>
              Cancelar
            </button>
            <button type="button" className="is-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <h3>{benefit.title}</h3>
          <p>{benefit.text}</p>

          {canEdit ? (
            <button
              type="button"
              className="footer_benefit_edit"
              onClick={() => setEditing(true)}
              aria-label={`Editar beneficio ${benefit.benefit}`}
              title="Editar beneficio"
            >
              <i className="bi bi-pencil-square" aria-hidden="true" />
            </button>
          ) : null}
        </>
      )}
    </article>
  )
}

function buildHomeBenefitFormData({ title, text, icon, removeIcon, translations }) {
  const payload = new FormData()
  payload.append("titulo", title)
  payload.append("texto", text)
  if (icon instanceof File) payload.append("icono", icon)
  if (removeIcon) payload.append("remove_icon", "true")
  appendTranslationsToFormData(payload, translations)

  return payload
}

function getBenefitDraft(benefit) {
  return {
    title: benefit.title || "",
    text: benefit.text || "",
    translations: normalizeTranslations(benefit.translations),
    icon: null,
    remove_icon: false,
  }
}

function normalizeHomeBenefitsResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const payload = data.value || data
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
    ? payload.items
    : Object.values(payload || {})

  return DEFAULT_HOME_BENEFITS.map((fallback) => {
    const match = items.find((item) => {
      const value = item?.value || item
      return Number(value?.benefit ?? item?.benefit) === fallback.benefit
    })

    return normalizeHomeBenefitValue(match?.value || match, fallback)
  })
}

function normalizeHomeBenefitResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data
  const fallback = DEFAULT_HOME_BENEFITS.find((item) => item.benefit === Number(value.benefit)) ||
    DEFAULT_HOME_BENEFITS[0]

  return normalizeHomeBenefitValue(value, fallback)
}

function normalizeHomeBenefitValue(value = {}, fallback) {
  return {
    ...fallback,
    benefit: Number(value.benefit || fallback.benefit),
    title: value.title || fallback.title,
    text: value.text || fallback.text,
    translations: normalizeTranslations(value.translations),
    icon_disk: value.icon_disk || "",
    icon_path: value.icon_path || null,
    icon_url: normalizeMediaUrl(value.icon_url || value.icon_path || ""),
  }
}

function hasModule(modules = [], moduleName) {
  return Array.isArray(modules) && modules.some((module) => {
    if (typeof module === "string") return module === moduleName
    return module?.name === moduleName || module?.module === moduleName
  })
}

export default Footer
