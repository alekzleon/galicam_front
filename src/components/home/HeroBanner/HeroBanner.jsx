import { useEffect, useState } from "react"
import {
  getBannerMediaType,
  getBanners,
  normalizeBannerMediaUrl,
} from "../../../services/api/bannerService"
import "./herobanner.css"

function HeroBanner() {
  const [banners, setBanners] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadBanners() {
      try {
        setLoading(true)
        const response = await getBanners({ without_pagination: true })
        const rows = normalizeCollectionResponse(response)
        const homeBanners = rows
          .filter((banner) => {
            const section = banner?.metadata?.section || "home"
            return section === "home" && Boolean(banner?.is_active)
          })
          .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
          .map(normalizeHeroBanner)
          .filter((banner) => banner.file)

        if (!isMounted) return

        setBanners(homeBanners)
        setActiveIndex(0)
      } catch (error) {
        console.error("Error al cargar banners de inicio:", error?.response?.data || error)
        if (isMounted) {
          setBanners([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadBanners()

    return () => {
      isMounted = false
    }
  }, [])

  const activeBanner = banners[activeIndex]

  const goPrev = () => {
    setActiveIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1))
  }

  const goNext = () => {
    setActiveIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1))
  }

  if (loading) {
    return <section className="hero-banner hero-banner--loading" />
  }

  if (!activeBanner) {
    return null
  }

  const hasTextContent = activeBanner.title || activeBanner.subtitle
  const hasButton = hasTextContent && activeBanner.buttonText && activeBanner.buttonUrl
  const hasMultipleBanners = banners.length > 1

  return (
    <section className="hero-banner">
      <div className="hero-banner__media">
        {activeBanner.type === "video" ? (
          <video
            className="hero-banner__video"
            src={activeBanner.file}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img
            className="hero-banner__image"
            src={activeBanner.file}
            alt={activeBanner.title || "Banner"}
          />
        )}

        <div
          className="hero-banner__overlay"
          style={{
            background: `rgba(0,0,0,${activeBanner.overlay})`,
          }}
        />

        {hasTextContent && (
          <div className="hero-banner__content container-main">
            <div
              className={`hero-banner__text hero-banner__text--${activeBanner.align}`}
            >
              {activeBanner.title && (
                <h1 className="hero-banner__title">{activeBanner.title}</h1>
              )}

              {activeBanner.subtitle && (
                <p className="hero-banner__subtitle">{activeBanner.subtitle}</p>
              )}

              {hasButton && (
                <div className="hero-banner__actions">
                  <a
                    href={activeBanner.buttonUrl}
                    className="hero-banner__button"
                  >
                    {activeBanner.buttonText}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {hasMultipleBanners && (
          <>
            <button
              type="button"
              className="hero-banner__nav hero-banner__nav--prev"
              onClick={goPrev}
              aria-label="Banner anterior"
            >
              ‹
            </button>

            <button
              type="button"
              className="hero-banner__nav hero-banner__nav--next"
              onClick={goNext}
              aria-label="Banner siguiente"
            >
              ›
            </button>

            <div className="hero-banner__dots">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  className={`hero-banner__dot ${
                    index === activeIndex ? "is-active" : ""
                  }`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Ir al banner ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function normalizeHeroBanner(banner) {
  return {
    id: banner.id,
    type: getBannerMediaType(banner),
    file: normalizeBannerMediaUrl(banner),
    title: banner.title || "",
    subtitle: banner.subtitle || banner.description || "",
    buttonText: banner.button_text || "",
    buttonUrl: banner.link_url || "",
    align: banner.metadata?.align || "left",
    overlay: Number(banner.metadata?.overlay ?? 0.34),
    sortOrder: Number(banner.sort_order ?? 0),
  }
}

function normalizeCollectionResponse(response) {
  const payload = response?.data ?? response

  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.banners)) return payload.banners

  return []
}

export default HeroBanner
