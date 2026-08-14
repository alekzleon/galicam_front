import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { getAccountFavorites, toggleAccountFavorite } from "../../../services/api/accountService"
import { getRecentPurchases } from "../../../services/api/productService"
import { useAuth } from "../../../context/AuthContext"
import { useCurrency } from "../../../context/CurrencyContext"
import { useLocalization } from "../../../context/LocalizationContext"
import { notifyError, notifySuccess } from "../../../utils/toast"
import { normalizeMediaUrl } from "../../../utils/mediaUrl"
import { getProductPriceMoney } from "../../../utils/money"
import { getRecentSearchTerms } from "../../../utils/recentSearchTerms"
import "./latestpurchases.css"

const PRODUCT_IMAGE_PLACEHOLDER = "https://via.placeholder.com/400x400?text=Producto"
const PRICE_UNAVAILABLE_SOURCE = "precios_articulos_default_missing"
const RECENT_PURCHASES_LIMIT = 10

function LatestPurchases({ source = "recent" }) {
  const navigate = useNavigate()
  const { isAuthenticated, sessionReady } = useAuth()
  const { locale, t } = useLocalization()
  const { currency } = useCurrency()
  const isFavoritesSource = source === "favorites"

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(getVisibleCount)
  const [startIndex, setStartIndex] = useState(0)
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null)

  useEffect(() => {
    if (!sessionReady) return undefined

    if (isFavoritesSource && !isAuthenticated) {
      setProducts([])
      setLoading(false)
      return undefined
    }

    let isMounted = true

    const fetchProducts = async () => {
      try {
        setLoading(true)
        const response = isFavoritesSource
          ? await getAccountFavorites({
              page: 1,
              per_page: RECENT_PURCHASES_LIMIT,
            })
          : await getRecentPurchases({
              limit: RECENT_PURCHASES_LIMIT,
              search_terms: getRecentSearchTerms().join(","),
            })

        if (!isMounted) return

        setProducts(normalizeProducts(response?.data || [], { defaultFavorite: isFavoritesSource }))
        setStartIndex(0)
      } catch (error) {
        if (!isMounted) return

        console.error(
          isFavoritesSource ? "Error al cargar favoritos:" : "Error al cargar últimos productos:",
          error?.response?.data || error
        )
        notifyError(
          error?.response?.data?.message ||
            (isFavoritesSource
              ? t("favorites")
              : t("emptyRecentProducts"))
        )
        setProducts([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchProducts()

    return () => {
      isMounted = false
    }
  }, [currency, isAuthenticated, isFavoritesSource, locale, sessionReady])

  useEffect(() => {
    const handleResize = () => {
      setVisibleCount(getVisibleCount())
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const maxIndex = Math.max(products.length - visibleCount, 0)
  const safeStartIndex = Math.min(startIndex, maxIndex)
  const visibleProducts = products.slice(safeStartIndex, safeStartIndex + visibleCount)
  const canShowPrices = sessionReady && isAuthenticated
  const sectionTitle = isFavoritesSource
    ? t("favorites")
    : canShowPrices
      ? t("recentPurchases")
      : t("interestedProducts")

  const handleToggleFavorite = async (product) => {
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
        isFavoritesSource && !isFavorite
          ? prev.filter((item) => item.id !== product.id)
          : prev.map((item) =>
              item.id === product.id ? { ...item, isFavorite } : item
            )
      )
      notifySuccess(response?.message || (isFavorite ? t("addedToFavorites") : t("removedFromFavorites")))
    } catch (error) {
      setProducts(previousProducts)
      notifyError(error?.response?.data?.message || t("favorites"))
    } finally {
      setFavoriteLoadingId(null)
    }
  }

  if (isFavoritesSource && (!sessionReady || !isAuthenticated || (!loading && products.length === 0))) {
    return null
  }

  return (
    <section className="latest-purchases">
      <div className="container-main">
        <div className="latest-purchases__wrapper">
          <div className="latest-purchases__header">
            <div className="latest-purchases__intro">
              <h2 className="latest-purchases__title">{sectionTitle}</h2>
              {!isFavoritesSource ? (
                <p className="latest-purchases__subtitle">{t("personalProductsSubtitle")}</p>
              ) : null}
            </div>

            <Link className="latest-purchases__view-all" to="/productos">
              {t("viewFullCollection")}
            </Link>
          </div>

          {loading ? (
            <div className="latest-purchases__viewport">
              <div
                className="latest-purchases__track"
                style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: visibleCount }).map((_, index) => (
                  <div className="purchase-card purchase-card--loading" key={index}>
                    <div className="purchase-card__image-wrap" />
                    <div className="purchase-card__skeleton-line" />
                    <div className="purchase-card__skeleton-line is-short" />
                  </div>
                ))}
              </div>
            </div>
          ) : products.length ? (
            <div className="latest-purchases__viewport">
              <div
                className="latest-purchases__track"
                style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}
              >
                {visibleProducts.map((product) => (
                  <article
                    className="purchase-card"
                    key={product.id}
                  >
                    <button
                      type="button"
                      className={`purchase-card__favorite ${product.isFavorite ? "is-active" : ""}`}
                      onClick={() => handleToggleFavorite(product)}
                      disabled={!sessionReady || favoriteLoadingId === product.id}
                      aria-label={product.isFavorite ? t("removeFavorite") : t("addFavorite")}
                      aria-pressed={product.isFavorite}
                    >
                      <i className={`bi ${product.isFavorite ? "bi-heart-fill" : "bi-heart"}`} aria-hidden="true" />
                    </button>

                    <Link className="purchase-card__image-wrap" to={`/producto/${product.slug}`}>
                      <img
                        src={product.image}
                        alt={product.name}
                        className="purchase-card__image"
                      />
                    </Link>

                    <div className="purchase-card__body">
                      <Link className="purchase-card__title-link" to={`/producto/${product.slug}`}>
                        <h3 className="purchase-card__title">{product.name}</h3>
                      </Link>

                      {canShowPrices && product.hasAvailablePrice ? (
                        <>
                          <div className="purchase-card__old-price">
                            {product.oldPrice}
                          </div>

                          <div className="purchase-card__price-row">
                            <span className="purchase-card__price">{product.price}</span>
                            {product.discount ? (
                              <span className="purchase-card__discount">
                                {product.discount}
                              </span>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <div className="purchase-card__price-login">
                          {canShowPrices ? t("priceUnavailable") : t("loginToSeePrices")}
                        </div>
                      )}

                      <div className="purchase-card__tags">
                        {product.tags.map((tag) => (
                          <span className="purchase-card__tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="latest-purchases__empty">
              {t("emptyRecentProducts")}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function getVisibleCount() {
  if (typeof window === "undefined") return 6
  if (window.innerWidth <= 575) return 2
  if (window.innerWidth <= 767) return 2
  if (window.innerWidth <= 991) return 3
  if (window.innerWidth <= 1199) return 4
  return 6
}

function normalizeProducts(items = [], options = {}) {
  return items.map((item) => {
    const price = Number(item?.default_price ?? 0)
    const priceInfo = item?.price_info ?? null
    const activePromotions = Array.isArray(item?.active_promotions)
      ? item.active_promotions
      : []
    const mainPromotion = activePromotions[0] || null
    const promotionMessage =
      mainPromotion?.message ||
      mainPromotion?.label ||
      mainPromotion?.name ||
      ""

    return {
      id: item?.id ?? null,
      name: item?.name ?? "Producto sin nombre",
      slug: item?.slug ?? "",
      image: normalizeProductImage(item?.image_url || item?.image_path),
      oldPrice: "",
      price: getProductPriceMoney(item) || formatMoney(price),
      priceInfo,
      hasAvailablePrice: price > 0 && priceInfo?.source !== PRICE_UNAVAILABLE_SOURCE,
      discount: promotionMessage,
      isFavorite: Boolean(item?.is_favorite ?? options.defaultFavorite),
      tags: [
        item?.brand ? String(item.brand) : "",
      ].filter(Boolean),
    }
  })
}

function normalizeProductImage(value) {
  const image = String(value || "").trim()

  if (!image) return PRODUCT_IMAGE_PLACEHOLDER

  const nestedUrlMatch = image.match(/https?:\/\/.+?(https?:\/\/.+)$/)

  if (nestedUrlMatch?.[1]) {
    return nestedUrlMatch[1]
  }

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

export default LatestPurchases
