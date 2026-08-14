import { useEffect, useState } from "react"
import contactImage from "../../assets/images/contact-faq-delivery.png"
import InlineImageSettingEditor from "../../components/common/InlineImageSettingEditor/InlineImageSettingEditor"
import InlineSettingEditor from "../../components/common/InlineSettingEditor/InlineSettingEditor"
import { useAuth } from "../../context/AuthContext"
import { useLocalization } from "../../context/LocalizationContext"
import { useSettings } from "../../context/SettingsContext"
import { sendContactMessage } from "../../services/api/contactService"
import { getContactFaqs } from "../../services/api/contactFaqService"
import {
  updateAdminContactFaqImage,
  updateAdminContactMapUrl,
} from "../../services/api/settingsService"
import { normalizeMediaUrl } from "../../utils/mediaUrl"
import "./contactpage.css"

const faqs = [
  {
    question: "¿Cómo me registro como nuevo cliente?",
    answer: "Dale click en el botón “REGISTRO” y completa el formulario.",
  },
  {
    question: "¿Puedo hacer pedidos sin estar registrado?",
    answer: "Para realizar cualquier pedido, es necesario estar registrado previamente.",
  },
  {
    question: "¿Cómo guardo mis pedidos frecuentes?",
    answer:
      "Tus pedidos frecuentes se guardan automáticamente en el sistema. Si agregas un nuevo producto asegúrate de seleccionar el icono del corazón de esta manera aparecerá en tus frecuentes la próxima vez.",
  },
  {
    question: "¿Cómo elimino un producto de mis pedidos frecuentes?",
    answer:
      "Para eliminar un producto de tu lista de pedidos frecuentes, dale click en el icono del corazón así lo estarás quitando de tu lista de frecuentes.",
  },
  {
    question: "¿Cómo elimino un producto de mi pedido pero no de mis pedidos frecuentes?",
    answer:
      "Puedes seleccionar la cantidad que deseas de un producto, si no quieres recibir ese producto en tu pedido, dale click en el “X”.",
  },
  {
    question: "¿Cómo puedo saber la fecha de entrega de mi pedido?",
    answer: "Al hacer tu pedido, te llegará un correo electrónico con la fecha de entrega.",
  },
  {
    question:
      "Si no recibí mi pedido cuando decía el correo de confirmación de pedido, ¿cómo puedo rastrearlo?",
    answer: "Si aún no recibes tu pedido, por favor ponte en contacto con nosotros.",
  },
]

function ContactPage() {
  const { isAuthenticated, isInternal, modules } = useAuth()
  const { locale, t } = useLocalization()
  const { settings, loading: settingsLoading, brandName, updateLocalSetting } = useSettings()
  const [openFaq, setOpenFaq] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [formStatus, setFormStatus] = useState(null)
  const [faqImagePreviewUrl, setFaqImagePreviewUrl] = useState("")
  const [remoteFaqs, setRemoteFaqs] = useState(null)
  const contactEmail = settings.email || settings.forms_recipient_email || ""
  const address = settings.address || ""
  const canEditContactSettings = isAuthenticated && isInternal && hasModule(modules, "configuracion_ecommerce")
  const faqImageUrl = faqImagePreviewUrl || settings.contact_faq_image?.image_url || contactImage
  const mapUrl = settings.contact_map_url || ""
  const mapSrc = mapUrl || `https://www.google.com/maps?q=${encodeURIComponent(address || brandName)}&output=embed`
  const baseFaqs = Array.isArray(remoteFaqs) ? remoteFaqs : faqs
  const faqItems = [
    ...baseFaqs,
    {
      question: "¿Cómo puedo ser proveedor?",
      answer: contactEmail
        ? `Envíanos un correo electrónico a ${contactEmail}.`
        : "Envíanos un mensaje desde el formulario de contacto.",
      email: contactEmail,
    },
  ]

  useEffect(() => {
    let isMounted = true

    async function loadFaqs() {
      try {
        const response = await getContactFaqs()
        const items = normalizeFaqCollection(response)
          .filter((faq) => faq.question && faq.answer)
          .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))

        if (isMounted) setRemoteFaqs(items)
      } catch (error) {
        console.error("Error al cargar preguntas frecuentes:", error?.response?.data || error)
        if (isMounted) setRemoteFaqs(faqs)
      }
    }

    loadFaqs()

    return () => {
      isMounted = false
    }
  }, [locale])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const form = event.currentTarget

    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    }

    try {
      setSubmitting(true)
      setFormStatus(null)

      const response = await sendContactMessage(payload)

      setFormStatus({
        type: "success",
        message: response?.message || "Mensaje enviado correctamente.",
      })
      form.reset()
    } catch (error) {
      setFormStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "No fue posible enviar el mensaje. Inténtalo nuevamente.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="contact-page">
      <div className="container-main">
        <div className="contact-page__hero">
          <div className="contact-page__header">
            <p className="contact-page__breadcrumbs">{t("home")} &gt; {t("contact")}</p>
            <h1>{t("contact")}</h1>
            <p>{t("contactIntro")}</p>
          </div>
        </div>

        <div className="contact-page__grid">
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-section-title">
              <span />
              <h2>{t("sendMessage")}</h2>
            </div>

            <label className="contact-form__field">
              <span>{t("nameRequired")}</span>
              <input type="text" name="name" autoComplete="name" required />
            </label>

            <label className="contact-form__field">
              <span>{t("emailRequired")}</span>
              <input type="email" name="email" autoComplete="email" required />
            </label>

            <label className="contact-form__field">
              <span>{t("messageRequired")}</span>
              <textarea name="message" rows="7" required />
            </label>

            {formStatus ? (
              <p className={`contact-form__status contact-form__status--${formStatus.type}`}>
                {formStatus.message}
              </p>
            ) : null}

            <button type="submit" className="contact-form__submit" disabled={submitting}>
              {submitting ? t("sending") : t("send")}
            </button>
          </form>

          <div className="contact-map">
            <div className="contact-section-title contact-section-title--soft">
              <span />
              <h2>{t("contactLocation")}</h2>
            </div>

            {settingsLoading ? (
              <div className="contact-map__skeleton" aria-hidden="true" />
            ) : (
              <iframe
                title={`Ubicación de ${brandName}`}
                src={mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}

            {canEditContactSettings ? (
              <div className="contact-map__editor">
                <InlineSettingEditor
                  settingKey="contact_map_url"
                  value={mapUrl}
                  canEdit
                  onSaveValue={updateAdminContactMapUrl}
                  onSaved={(value) => updateLocalSetting("contact_map_url", value || "")}
                  inputLabel={t("editGoogleMapsLink")}
                  allowEmpty
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="contact-faq-layout">
          <div className="contact-faq">
            <div className="contact-section-title">
              <span />
              <h2>{t("faqs")}</h2>
            </div>

            <p className="contact-faq__intro">
              Información oportuna que ponemos a su consideración.
            </p>

            <div className="contact-faq__accordion">
              {faqItems.map((faq, index) => {
                const isOpen = openFaq === index

                return (
                  <div className="contact-faq__item" key={faq.question}>
                    <button
                      type="button"
                      className={`contact-faq__trigger ${isOpen ? "is-open" : ""}`}
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      aria-expanded={isOpen}
                    >
                      <span className="contact-faq__icon">⌄</span>
                      <span>{faq.question}</span>
                    </button>

                    {isOpen ? (
                      <div className="contact-faq__answer">
                        {faq.email ? (
                          <p>
                            Envíanos un correo electrónico a{" "}
                            <a href={`mailto:${faq.email}`}>{faq.email}</a>.
                          </p>
                        ) : (
                          <p>{faq.answer}</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <figure className="contact-photo">
            {settingsLoading ? (
              <div className="contact-photo__skeleton" aria-hidden="true" />
            ) : (
              <>
                <img src={faqImageUrl} alt={brandName} />
                <InlineImageSettingEditor
                  canEdit={canEditContactSettings}
                  uploadImage={updateAdminContactFaqImage}
                  onPreviewChange={setFaqImagePreviewUrl}
                  onSaved={(response) => {
                    const image = normalizeContactFaqImageResponse(response)
                    updateLocalSetting("contact_faq_image", image)
                  }}
                  editLabel="Editar imagen de preguntas frecuentes"
                />
              </>
            )}
          </figure>
        </div>
      </div>
    </section>
  )
}

function hasModule(modules = [], moduleName) {
  return Array.isArray(modules) && modules.some((module) => {
    if (typeof module === "string") return module === moduleName
    return module?.name === moduleName || module?.module === moduleName
  })
}

function normalizeContactFaqImageResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data

  return {
    image_path: value.image_path || value.path || "",
    image_url: normalizeMediaUrl(value.image_url || value.url || value.image_path || value.path),
  }
}

function normalizeFaqCollection(response) {
  const payload = response?.data ?? response

  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.faqs)) return payload.faqs
  if (Array.isArray(payload?.contact_faqs)) return payload.contact_faqs

  return []
}

export default ContactPage
