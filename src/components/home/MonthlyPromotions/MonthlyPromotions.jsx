import { useEffect, useState } from "react"
import { useCurrency } from "../../../context/CurrencyContext"
import { useLocalization } from "../../../context/LocalizationContext"
import { getMonthlyPromotions } from "../../../services/api/monthlyPromotionsService"
import "./monthlypromotions.css"

function MonthlyPromotions() {
  const { currency } = useCurrency()
  const { locale, t } = useLocalization()
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPromotions = async () => {
      try {
        setLoading(true)
        const response = await getMonthlyPromotions({ limit: 2 })
        setPromotions(normalizePromotions(response?.data || [], t))
      } catch (error) {
        console.error("Error al cargar promociones del mes:", error?.response?.data || error)
        setPromotions([])
      } finally {
        setLoading(false)
      }
    }

    loadPromotions()
  }, [currency, locale, t])

  if (!loading && promotions.length === 0) return null

  return (
    <section className="monthly-promotions">
      <div className="container-main">
        <div className="monthly-promotions__header">
          <h2 className="monthly-promotions__title">{t("monthlyPromotions")}</h2>
          <p className="monthly-promotions__subtitle">
            {t("monthlyPromotionsSubtitle")}
          </p>
        </div>

        <div className="monthly-promotions__grid">
          {loading
            ? Array.from({ length: 2 }).map((_, index) => (
              <article className="promo-card promo-card--loading" key={index} />
            ))
            : promotions.map((promo, index) => (
              <article className={`promo-card ${index % 2 === 0 ? "promo-card--violet" : "promo-card--light"}`} key={promo.id}>
                <div className="promo-card__media">
                  <img
                    src={promo.image}
                    alt={promo.title}
                    className="promo-card__image"
                  />
                </div>

                <div className="promo-card__content">
                  <span className="promo-card__eyebrow">{t("currentPromotion")}</span>

                  <h3 className="promo-card__title">{promo.title}</h3>

                  {promo.description ? (
                    <p className="promo-card__description">{promo.description}</p>
                  ) : null}

                  {promo.linkUrl ? (
                    <a href={promo.linkUrl} className="promo-card__button">
                      {promo.buttonText}
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
        </div>
      </div>
    </section>
  )
}

function normalizePromotions(items = [], t) {
  return items.map((item) => ({
    id: item?.id,
    title: item?.title || t("monthlyPromotions"),
    description: item?.description || "",
    image: normalizePromotionImage(item?.image_url || item?.image_path),
    linkUrl: item?.link_url || "",
    buttonText: item?.button_text || t("showAllOffers"),
  }))
}

function normalizePromotionImage(value) {
  const image = String(value || "").trim()

  if (!image) return "https://via.placeholder.com/900x520?text=Promocion"

  const nestedUrlMatch = image.match(/https?:\/\/.+?(https?:\/\/.+)$/)
  const cleanImage = nestedUrlMatch?.[1] || image
  const mediaBaseUrl = getMediaBaseUrl()

  if (/^https?:\/\//i.test(cleanImage)) {
    try {
      const parsedUrl = new URL(cleanImage)
      return `${mediaBaseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
    } catch {
      return cleanImage
    }
  }

  return `${mediaBaseUrl}/${cleanImage.replace(/^\/+/, "")}`
}

function getMediaBaseUrl() {
  return String(
    import.meta.env.VITE_MEDIA_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      ""
  )
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/+$/, "")
}

export default MonthlyPromotions
