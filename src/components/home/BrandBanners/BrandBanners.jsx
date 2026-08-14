import { useEffect, useMemo, useState } from "react"
import {
  getBrandBannerMediaType,
  getBrandBanners,
  normalizeBrandBannerMediaUrl,
} from "../../../services/api/brandBannerService.js"
import "./brandbanners.css"

const ROTATION_INTERVAL = 5000

const MOCK_BANNERS = [
  {
    id: "brand-fallback-1",
    type: "image",
    src: "https://placehold.co/1320x280/f8fafc/13426b?text=Banner+de+marcas",
    alt: "Banner de marcas",
    poster: "",
    linkUrl: "",
  },
]

function BrandBanners() {
  const [banners, setBanners] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadBanners() {
      try {
        setLoading(true)
        const response = await getBrandBanners({ limit: 10 })
        const items = normalizeCollectionResponse(response)
          .filter((banner) => Boolean(banner?.is_active ?? true))
          .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
          .map(normalizeBrandBanner)
          .filter((banner) => banner.src)

        if (!isMounted) return

        setBanners(items)
        setActiveIndex(0)
      } catch (error) {
        console.error("Error al cargar banners de marcas:", error?.response?.data || error)
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

  const visibleBanners = useMemo(() => {
    if (loading) return []
    return banners.length ? banners : MOCK_BANNERS
  }, [banners, loading])

  const activeBanner = visibleBanners[activeIndex]
  const hasMultipleBanners = visibleBanners.length > 1

  useEffect(() => {
    if (!hasMultipleBanners || isPaused) return undefined

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % visibleBanners.length)
    }, ROTATION_INTERVAL)

    return () => window.clearInterval(timer)
  }, [hasMultipleBanners, isPaused, visibleBanners.length])

  function goPrev() {
    setActiveIndex((prev) => (prev === 0 ? visibleBanners.length - 1 : prev - 1))
  }

  function goNext() {
    setActiveIndex((prev) => (prev + 1) % visibleBanners.length)
  }

  if (loading) {
    return (
      <section className="brand-banners">
        <div className="container-main">
          <div className="brand-banners__frame brand-banners__frame--loading" />
        </div>
      </section>
    )
  }

  if (!activeBanner) return null

  const media = (
    <div className="brand-banners__media">
      {activeBanner.type === "video" ? (
        <video
          className="brand-banners__asset"
          src={activeBanner.src}
          poster={activeBanner.poster}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <img className="brand-banners__asset" src={activeBanner.src} alt={activeBanner.alt} />
      )}
    </div>
  )

  return (
    <section className="brand-banners" aria-label="Banners de marcas">
      <div className="container-main">
        <div
          className="brand-banners__frame"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {activeBanner.linkUrl ? (
            <a className="brand-banners__link" href={activeBanner.linkUrl}>
              {media}
            </a>
          ) : (
            media
          )}

          {hasMultipleBanners ? (
            <>
              <button
                type="button"
                className="brand-banners__arrow brand-banners__arrow--prev"
                onClick={goPrev}
                aria-label="Banner anterior"
              >
                ‹
              </button>

              <button
                type="button"
                className="brand-banners__arrow brand-banners__arrow--next"
                onClick={goNext}
                aria-label="Banner siguiente"
              >
                ›
              </button>

              <div className="brand-banners__dots">
                {visibleBanners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    className={`brand-banners__dot ${index === activeIndex ? "is-active" : ""}`}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Ir al banner ${index + 1}`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function normalizeBrandBanner(banner) {
  const title = banner?.title || banner?.brand_name || "Banner de marcas"

  return {
    id: banner?.id,
    type: getBrandBannerMediaType(banner),
    src: normalizeBrandBannerMediaUrl(banner),
    alt: banner?.alt || title,
    poster: normalizeBrandBannerMediaUrl({ media_url: banner?.poster_url, media_path: banner?.poster_path }),
    linkUrl: banner?.link_url || banner?.link || banner?.url || "",
  }
}

function normalizeCollectionResponse(response) {
  const payload = response?.data ?? response

  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.banners)) return payload.banners
  if (Array.isArray(payload?.brand_banners)) return payload.brand_banners
  if (Array.isArray(payload?.brandBanners)) return payload.brandBanners

  return []
}

export default BrandBanners
