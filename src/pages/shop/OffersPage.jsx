import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import ProductListSkeleton from "../../components/product/ProductListSkeleton/ProductListSkeleton"
import { addCartItem } from "../../services/api/cartService"
import { getAllPromotions } from "../../services/api/promotionsService"
import { useAuth } from "../../context/AuthContext"
import { useCurrency } from "../../context/CurrencyContext"
import { useLocalization } from "../../context/LocalizationContext"
import { useSettings } from "../../context/SettingsContext"
import { notifyError, notifySuccess, notifyWarning } from "../../utils/toast"
import { getMoneyFormatted } from "../../utils/money"
import { trackMetaAddToCart } from "../../utils/metaPixel"
import "./offerspage.css"

const OFFERS_PER_PAGE = 24
const PROMOTION_IMAGE_PLACEHOLDER = "https://monocromia.com.mx/cdn/shop/files/Monocromia-04_6366367b-3cd5-4942-89f0-62fac4475a07_2048x.jpg?v=1742501692"
const CART_SUMMARY_STORAGE_KEY = "ecommerce_cart_summary"

function OffersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const { currency } = useCurrency()
  const { locale, t } = useLocalization()
  const { settings } = useSettings()
  const page = Number(searchParams.get("page")) || 1

  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingOfferId, setAddingOfferId] = useState(null)
  const [activeOfferIndex, setActiveOfferIndex] = useState(0)
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: OFFERS_PER_PAGE,
    total: 0,
  })

  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true)
        const response = await getAllPromotions({
          page,
          per_page: OFFERS_PER_PAGE,
        })

        setOffers(normalizePromotions(response?.data || []))
        setMeta({
          current_page: response?.meta?.current_page ?? 1,
          last_page: response?.meta?.last_page ?? 1,
          per_page: response?.meta?.per_page ?? OFFERS_PER_PAGE,
          total: response?.meta?.total ?? 0,
        })
      } catch (error) {
        console.error("Error al cargar ofertas:", error?.response?.data || error)
        notifyError(error?.response?.data?.message || t("offers"))
        setOffers([])
      } finally {
        setLoading(false)
      }
    }

    loadOffers()
  }, [currency, locale, page, t])

  useEffect(() => {
    setActiveOfferIndex(0)
  }, [page])

  const handlePageChange = (nextPage) => {
    const nextParams = new URLSearchParams(searchParams)

    if (nextPage <= 1) {
      nextParams.delete("page")
    } else {
      nextParams.set("page", String(nextPage))
    }

    setSearchParams(nextParams, { replace: true })
  }

  const syncCartSummary = (payload) => {
    const summary = {
      id: payload?.id ?? null,
      items_count: Number(payload?.items_count ?? 0),
      subtotal: Number(payload?.subtotal ?? 0),
      discount: Number(payload?.discount ?? 0),
      tax: Number(payload?.tax ?? 0),
      tax_breakdown: payload?.tax_breakdown ?? null,
      total: Number(payload?.total ?? 0),
    }

    localStorage.setItem(CART_SUMMARY_STORAGE_KEY, JSON.stringify(summary))
    window.dispatchEvent(new CustomEvent("cart:updated", { detail: summary }))
  }

  const handleAddOfferToCart = async (offer) => {
    if (!offer?.id || addingOfferId === offer.id) return

    if (!isAuthenticated) {
      navigate("/login")
      return
    }

    if (!offer.productId) {
      notifyWarning(t("choosePromotionProduct"))
      navigate(getOfferUrl(offer))
      return
    }

    if (isOfferOutOfStock(offer)) {
      notifyError(offer.stockMessage || t("outOfStock"))
      return
    }

    try {
      setAddingOfferId(offer.id)
      const response = await addCartItem({
        product_id: offer.productId,
        quantity: 1,
      })
      const cartSummary =
        response?.data?.cart ||
        response?.data?.summary ||
        response?.cart ||
        response?.summary ||
        response?.data

      if (cartSummary && typeof cartSummary === "object") {
        syncCartSummary(cartSummary)
      }

      trackMetaAddToCart({
        id: offer.productId,
        name: offer.productName || offer.title,
        price: offer.price || 0,
      }, 1)
      notifySuccess(response?.message || t("addedToCart"))
    } catch (error) {
      notifyError(error?.response?.data?.message || t("addToCart"))
    } finally {
      setAddingOfferId(null)
    }
  }

  const isEditorialShop = settings.storefront?.active_template === "editorial_shop"

  return (
    <section className={`offers-page ${isEditorialShop ? "offers-page--editorial" : ""}`}>
      <div className="container-main">
        {!isEditorialShop ? (
          <div className="offers-page__top">
            <div>
              <p className="offers-page__breadcrumbs">{t("home")} &gt; {t("offers")}</p>
              <h1 className="offers-page__title">{t("offers")}</h1>
              <p className="offers-page__results">{meta.total} {t("currentPromotions")}</p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <ProductListSkeleton count={8} />
        ) : offers.length ? (
          <>
            {isEditorialShop ? (
              <EditorialOffersShowcase
                offers={offers}
                activeIndex={activeOfferIndex}
                onActiveIndexChange={setActiveOfferIndex}
              />
            ) : (
              <div className="offers-page__grid">
                {offers.map((offer) => {
                  const isOutOfStock = isOfferOutOfStock(offer)

                  return (
                  <article className="offers-page__card" key={offer.id}>
                    <div className="offers-page__card-media">
                      <img src={offer.image} alt={offer.title} />
                    </div>

                    <div className="offers-page__card-body">
                      <span className="offers-page__badge">{offer.label}</span>
                      <h2>{offer.title}</h2>
                      {offer.productName ? (
                        <h3 className="offers-page__product-name">{offer.productName}</h3>
                      ) : null}
                      {offer.description ? <p>{offer.description}</p> : null}
                      <div className="offers-page__meta">
                        <span>{offer.productsCount} {t("products")}</span>
                        <strong>{offer.typeLabel}</strong>
                      </div>
                      <div className="offers-page__actions">
                        <Link to={getOfferUrl(offer)} className="offers-page__action offers-page__action--secondary">
                          {t("view")}
                        </Link>
                        <button
                          type="button"
                          className="offers-page__action offers-page__action--primary"
                          onClick={() => handleAddOfferToCart(offer)}
                          disabled={addingOfferId === offer.id || isOutOfStock}
                        >
                          {addingOfferId === offer.id
                            ? t("addingToCart")
                            : isOutOfStock
                            ? t("outOfStock")
                            : t("addToCart")}
                        </button>
                      </div>
                    </div>
                  </article>
                  )
                })}
              </div>
            )}

            {meta.last_page > 1 ? (
              <div className="offers-page__pagination">
                <button
                  type="button"
                  className="offers-page__page-btn"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  {t("previousProducts")}
                </button>

                {Array.from({ length: meta.last_page }).map((_, index) => {
                  const pageNumber = index + 1

                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      className={`offers-page__page-number ${page === pageNumber ? "is-active" : ""}`}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  )
                })}

                <button
                  type="button"
                  className="offers-page__page-btn"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === meta.last_page}
                >
                  {t("next")}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="offers-page__empty">
            <h2>{t("noOfferAvailable")}</h2>
            <p>{t("currentPromotions")}</p>
            <Link to="/productos" className="offers-page__empty-action">
              {t("seeProducts")}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

function EditorialOffersShowcase({ offers = [], activeIndex, onActiveIndexChange }) {
  const { t } = useLocalization()
  const activeOffer = offers[activeIndex] || offers[0]
  const visibleOffers = getVisibleEditorialOffers(offers, activeIndex)

  const goToPrevious = () => {
    onActiveIndexChange(activeIndex === 0 ? offers.length - 1 : activeIndex - 1)
  }

  const goToNext = () => {
    onActiveIndexChange(activeIndex >= offers.length - 1 ? 0 : activeIndex + 1)
  }

  if (!activeOffer) return null

  return (
    <div className="editorial-offers-showcase">
      <div className="editorial-offers-showcase__media">
        <button
          type="button"
          className="editorial-offers-showcase__arrow editorial-offers-showcase__arrow--prev"
          onClick={goToPrevious}
          aria-label={t("previousOffers")}
        >
          ‹
        </button>

        {visibleOffers.map(({ offer, sourceIndex }, imageIndex) => (
          <button
            type="button"
            className={`editorial-offers-showcase__panel ${sourceIndex === activeIndex ? "is-active" : ""}`}
            key={`${offer.id}-${imageIndex}`}
            onClick={() => onActiveIndexChange(sourceIndex)}
            aria-label={`${t("viewOffer")} ${offer.title}`}
          >
            <img src={offer.image} alt={offer.productName || offer.title} />
          </button>
        ))}

        <button
          type="button"
          className="editorial-offers-showcase__arrow editorial-offers-showcase__arrow--next"
          onClick={goToNext}
          aria-label={t("offers")}
        >
          ›
        </button>

        <div className="editorial-offers-showcase__info">
          <span>{activeOffer.label}</span>
          <h1>{activeOffer.productName || activeOffer.title}</h1>
          {activeOffer.price > 0 ? <p>{activeOffer.priceFormatted || formatMoney(activeOffer.price)}</p> : null}
          {activeOffer.description ? <small>{activeOffer.description}</small> : null}
          <Link to={getOfferUrl(activeOffer)}>{t("viewOffer")}</Link>
        </div>
      </div>
    </div>
  )
}

function getVisibleEditorialOffers(offers = [], activeIndex = 0) {
  if (!offers.length) return []

  if (offers.length === 1) {
    return Array.from({ length: 3 }).map((_, index) => ({
      offer: offers[0],
      sourceIndex: 0,
      key: index,
    }))
  }

  return [-1, 0, 1].map((offset) => {
    const sourceIndex = (activeIndex + offset + offers.length) % offers.length

    return {
      offer: offers[sourceIndex],
      sourceIndex,
    }
  })
}

function normalizePromotions(items = []) {
  return items.map((item) => ({
    id: item?.id,
    title: item?.name || "Oferta disponible",
    slug: item?.slug || "",
    label: item?.label || formatPromotionType(item?.type),
    description: item?.description || "",
    image: normalizePromotionImage(item?.image_url || item?.image_path),
    productsCount: Number(item?.products_count || 0),
    typeLabel: formatPromotionType(item?.type),
    isFavorite: Boolean(item?.is_favorite),
    productId: getPromotionProductId(item),
    productName: getPromotionProductName(item),
    productSlug: getPromotionProductSlug(item),
    price: getPromotionProductPrice(item),
    priceFormatted: getPromotionPriceFormatted(item),
    stock: getPromotionProductStock(item),
    stockStatus: getPromotionProductStockStatus(item),
    stockMessage: getPromotionProductStockMessage(item),
    productIds: Array.isArray(item?.product_ids) ? item.product_ids : [],
    products: Array.isArray(item?.products) ? item.products : [],
  }))
}

function getOfferUrl(offer) {
  if (offer?.productSlug) return `/producto/${offer.productSlug}`

  const params = new URLSearchParams()

  if (offer?.slug) {
    params.set("promotion", offer.slug)
  } else if (offer?.title) {
    params.set("search", offer.title)
  }

  return `/productos${params.toString() ? `?${params.toString()}` : ""}`
}

function getPromotionProductId(item = {}) {
  return (
    item?.product_id ||
    item?.product?.id ||
    item?.products?.[0]?.id ||
    item?.product_ids?.[0] ||
    item?.config?.product_id ||
    item?.config?.target_product_id ||
    null
  )
}

function getPromotionProductSlug(item = {}) {
  return item?.product?.slug || item?.products?.[0]?.slug || ""
}

function getPromotionProductName(item = {}) {
  return item?.product?.name || item?.products?.[0]?.name || ""
}

function getPromotionProductPrice(item = {}) {
  return Number(
    item?.product?.final_price ||
      item?.product?.default_price ||
      item?.products?.[0]?.final_price ||
      item?.products?.[0]?.default_price ||
      item?.final_price ||
      item?.default_price ||
      0
  )
}

function getPromotionPriceFormatted(item = {}) {
  return (
    getMoneyFormatted(item?.price_money) ||
    getMoneyFormatted(item?.config_money?.promotional_price) ||
    getMoneyFormatted(item?.product?.price_money) ||
    getMoneyFormatted(item?.products?.[0]?.price_money)
  )
}

function getPromotionProductStock(item = {}) {
  return item?.stock ?? item?.product?.stock ?? item?.products?.[0]?.stock ?? null
}

function getPromotionProductStockStatus(item = {}) {
  return (
    item?.stock_status ||
    item?.stockStatus ||
    item?.product?.stock_status ||
    item?.product?.stockStatus ||
    item?.products?.[0]?.stock_status ||
    item?.products?.[0]?.stockStatus ||
    "untracked"
  )
}

function getPromotionProductStockMessage(item = {}) {
  return (
    item?.stock_message ||
    item?.stockMessage ||
    item?.product?.stock_message ||
    item?.product?.stockMessage ||
    item?.products?.[0]?.stock_message ||
    item?.products?.[0]?.stockMessage ||
    ""
  )
}

function isOfferOutOfStock(offer = {}) {
  const stockStatus = offer?.stockStatus || offer?.stock_status || "untracked"
  const hasNoStockValue = offer?.stock === null || offer?.stock === undefined || offer?.stock === ""

  return stockStatus === "out_of_stock" || hasNoStockValue || Number(offer.stock) <= 0
}

function normalizePromotionImage(value) {
  const image = String(value || "").trim()

  if (!image) return PROMOTION_IMAGE_PLACEHOLDER

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

function formatPromotionType(type) {
  const labels = {
    bundle_pay_x_take_y: "Lleva X y paga Y",
    buy_x_get_y: "Compra X y llévate Y",
    buy_x_get_discount: "Compra X y obtén descuento",
    direct_percentage: "Descuento directo",
    strikethrough_price: "Precio especial",
  }

  if (labels[type]) return labels[type]

  return String(type || "Promoción")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export default OffersPage
