import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../../context/AuthContext"
import { useCurrency } from "../../../context/CurrencyContext"
import { useLocalization } from "../../../context/LocalizationContext"
import { toggleAccountFavorite } from "../../../services/api/accountService"
import { getRecentPurchases } from "../../../services/api/productService"
import { normalizeMediaUrl } from "../../../utils/mediaUrl"
import { getProductPriceMoney } from "../../../utils/money"
import { getRecentSearchTerms } from "../../../utils/recentSearchTerms"
import { notifyError, notifySuccess } from "../../../utils/toast"
import "./artisanselection.css"

const PRODUCT_IMAGE_PLACEHOLDER = "https://via.placeholder.com/400x400?text=Producto"
const PRICE_UNAVAILABLE_SOURCE = "precios_articulos_default_missing"
const ARTISAN_SELECTION_LIMIT = 10

function ArtisanSelection() {
  const navigate = useNavigate()
  const { isAuthenticated, sessionReady } = useAuth()
  const { locale, t } = useLocalization()
  const { currency } = useCurrency()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(getVisibleCount)
  const [startIndex, setStartIndex] = useState(0)
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null)
  const canShowPrices = sessionReady && isAuthenticated

  useEffect(() => {
    let isMounted = true

    async function fetchProducts() {
      try {
        setLoading(true)
        const response = await getRecentPurchases({
          limit: ARTISAN_SELECTION_LIMIT,
          search_terms: getRecentSearchTerms().join(","),
        })

        if (!isMounted) return

        setProducts(normalizeProducts(response?.data || []))
        setStartIndex(0)
      } catch (error) {
        if (!isMounted) return
        console.error("Error al cargar selección de artesanos:", error?.response?.data || error)
        setProducts([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchProducts()

    return () => {
      isMounted = false
    }
  }, [currency, locale])

  useEffect(() => {
    function handleResize() {
      setVisibleCount(getVisibleCount())
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const maxIndex = Math.max(products.length - visibleCount, 0)
  const safeStartIndex = Math.min(startIndex, maxIndex)
  const visibleProducts = products.slice(safeStartIndex, safeStartIndex + visibleCount)

  function goPrev() {
    setStartIndex((prev) => Math.max(prev - visibleCount, 0))
  }

  function goNext() {
    setStartIndex((prev) => Math.min(prev + visibleCount, maxIndex))
  }

  async function handleToggleFavorite(product) {
    if (!product?.id || favoriteLoadingId === product.id) return

    if (!isAuthenticated) {
      navigate("/login")
      return
    }

    const previousProducts = products

    try {
      setFavoriteLoadingId(product.id)
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, isFavorite: !item.isFavorite } : item
        )
      )

      const response = await toggleAccountFavorite(product.id)
      const isFavorite = Boolean(response?.data?.is_favorite)
      setProducts((prev) =>
        prev.map((item) => (item.id === product.id ? { ...item, isFavorite } : item))
      )
      notifySuccess(response?.message || (isFavorite ? t("addedToFavorites") : t("removedFromFavorites")))
    } catch (error) {
      setProducts(previousProducts)
      notifyError(error?.response?.data?.message || t("favorites"))
    } finally {
      setFavoriteLoadingId(null)
    }
  }

  return (
    <section className="artisan-selection">
      <div className="container-main">
        <div className="artisan-selection__shell">
          <header className="artisan-selection__header">
            <h2>{t("artisanSelectionTitle")}</h2>
            <Link to="/productos">{t("viewMore")}</Link>
          </header>

          {loading ? (
            <div className="artisan-selection__grid" style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}>
              {Array.from({ length: visibleCount }).map((_, index) => (
                <article className="artisan-product artisan-product--loading" key={index}>
                  <span className="artisan-product__image" />
                  <span className="artisan-product__line" />
                  <span className="artisan-product__line artisan-product__line--short" />
                </article>
              ))}
            </div>
          ) : products.length ? (
            <div className="artisan-selection__carousel">
              <button
                type="button"
                className="artisan-selection__arrow artisan-selection__arrow--prev"
                onClick={goPrev}
                disabled={safeStartIndex === 0}
                aria-label={t("previousProducts")}
              >
                ‹
              </button>

              <div className="artisan-selection__grid" style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}>
                {visibleProducts.map((product) => (
                  <article className="artisan-product" key={product.id}>
                    <button
                      type="button"
                      className={`artisan-product__favorite ${product.isFavorite ? "is-active" : ""}`}
                      onClick={() => handleToggleFavorite(product)}
                      disabled={!sessionReady || favoriteLoadingId === product.id}
                      aria-label={product.isFavorite ? t("removeFavorite") : t("addFavorite")}
                      aria-pressed={product.isFavorite}
                    >
                      <i className={`bi ${product.isFavorite ? "bi-heart-fill" : "bi-heart"}`} aria-hidden="true" />
                    </button>

                    <Link className="artisan-product__image" to={`/producto/${product.slug}`}>
                      <img src={product.image} alt={product.name} />
                    </Link>

                    <Link className="artisan-product__name" to={`/producto/${product.slug}`}>
                      {product.name}
                    </Link>

                    {canShowPrices && product.hasAvailablePrice ? (
                      <strong className="artisan-product__price">{product.price}</strong>
                    ) : (
                      <span className="artisan-product__price-note">
                        {canShowPrices ? t("priceUnavailable") : t("loginToSeePrices")}
                      </span>
                    )}
                  </article>
                ))}
              </div>

              <button
                type="button"
                className="artisan-selection__arrow artisan-selection__arrow--next"
                onClick={goNext}
                disabled={safeStartIndex >= maxIndex}
                aria-label={t("products")}
              >
                ›
              </button>
            </div>
          ) : (
            <div className="artisan-selection__empty">{t("emptyRecentProducts")}</div>
          )}
        </div>
      </div>
    </section>
  )
}

function getVisibleCount() {
  if (typeof window === "undefined") return 5
  if (window.innerWidth <= 575) return 2
  if (window.innerWidth <= 767) return 2
  if (window.innerWidth <= 991) return 3
  if (window.innerWidth <= 1199) return 4
  return 5
}

function normalizeProducts(items = []) {
  return items.map((item) => {
    const price = Number(item?.default_price ?? 0)
    const priceInfo = item?.price_info ?? null

    return {
      id: item?.id ?? null,
      name: item?.name ?? "Producto sin nombre",
      slug: item?.slug ?? "",
      image: normalizeProductImage(item?.image_url || item?.image_path),
      price: getProductPriceMoney(item) || formatMoney(price),
      hasAvailablePrice: price > 0 && priceInfo?.source !== PRICE_UNAVAILABLE_SOURCE,
      isFavorite: Boolean(item?.is_favorite),
    }
  })
}

function normalizeProductImage(value) {
  const image = String(value || "").trim()
  if (!image) return PRODUCT_IMAGE_PLACEHOLDER

  const nestedUrlMatch = image.match(/https?:\/\/.+?(https?:\/\/.+)$/)
  if (nestedUrlMatch?.[1]) return nestedUrlMatch[1]

  return normalizeMediaUrl(image) || PRODUCT_IMAGE_PLACEHOLDER
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export default ArtisanSelection
