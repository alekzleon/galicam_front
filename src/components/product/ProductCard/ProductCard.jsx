import { useEffect, useRef, useState } from "react"
import "./productcard.css"
import { Link, useNavigate } from "react-router-dom"
import { addCartItem } from "../../../services/api/cartService"
import { toggleAccountFavorite } from "../../../services/api/accountService"
import { useAuth } from "../../../context/AuthContext"
import { useLocalization } from "../../../context/LocalizationContext"
import { getProductCompareMoney, getProductPriceMoney } from "../../../utils/money"
import { notifySuccess, notifyError } from "../../../utils/toast"
import { trackMetaAddToCart } from "../../../utils/metaPixel"
import WishlistModal from "../../wishlist/WishlistModal"

const CART_SUMMARY_STORAGE_KEY = "ecommerce_cart_summary"
const PRICE_UNAVAILABLE_SOURCE = "precios_articulos_default_missing"

function ProductCard({ product, onFavoriteChange }) {
  const [favorite, setFavorite] = useState(Boolean(product?.isFavorite || product?.is_favorite))
  const [togglingFavorite, setTogglingFavorite] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const wishlistButtonRef = useRef(null)

  const navigate = useNavigate()
  const { isAuthenticated, sessionReady } = useAuth()
  const { t } = useLocalization()

  const productSlug = product?.slug || ""
  const productImage =
    product?.image || "https://via.placeholder.com/400x400?text=Producto"
  const productName = product?.name || t("productWithoutName")
  const productRating = product?.rating ?? 0
  const productSold = product?.sold || ""
  const productOldPrice = Number(product?.oldPrice ?? 0)
  const productPrice = Number(product?.price ?? 0)
  const productPriceFormatted = product?.priceMoneyFormatted || getProductPriceMoney(product)
  const productOldPriceFormatted = product?.oldPriceMoneyFormatted || getProductCompareMoney(product)
  const productDiscountLabel = product?.discountLabel || ""
  const productBrand = product?.brand || "Sin marca"
  const productShipping = product?.shipping || ""
  const stockStatus = product?.stockStatus || product?.stock_status || "untracked"
  const stockMessage = product?.stockMessage || product?.stock_message || ""
  const hasNoStockValue = product?.stock === null || product?.stock === undefined || product?.stock === ""
  const blocksByStock = stockStatus === "out_of_stock" || hasNoStockValue || Number(product.stock) <= 0
  const effectiveStockStatus = blocksByStock ? "out_of_stock" : stockStatus
  const productBadges = Array.isArray(product?.badges) ? product.badges : []
  const productPromotionMessage = product?.promotionMessage || ""
  const productPriceInfo = product?.priceInfo || product?.price_info || {}
  const canShowPrices = sessionReady && isAuthenticated
  const hasAvailablePrice =
    Boolean(productPriceFormatted) ||
    (productPrice > 0 && productPriceInfo.source !== PRICE_UNAVAILABLE_SOURCE)

  useEffect(() => {
    setFavorite(Boolean(product?.isFavorite || product?.is_favorite))
  }, [product?.isFavorite, product?.is_favorite])

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

    window.dispatchEvent(
      new CustomEvent("cart:updated", {
        detail: summary,
      })
    )
  }

  const handleAddToCart = async () => {
    if (!product?.id || addingToCart || !isAuthenticated) {
      return
    }

    if (!hasAvailablePrice) {
      notifyError(t("priceUnavailable"))
      return
    }

    if (blocksByStock) {
      notifyError(stockMessage || t("outOfStock"))
      return
    }

    try {
      setAddingToCart(true)

      const response = await addCartItem({
        product_id: product.id,
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

      trackMetaAddToCart(product, 1)
      notifySuccess(
        response?.message || t("addedToCart")
      )
    } catch (error) {
      notifyError(getApiErrorMessage(error, t("addToCart")))
      console.error("Error al agregar al carrito:", error?.response?.data || error)
    } finally {
      setAddingToCart(false)
    }
  }

  const handleGoToLogin = () => {
    navigate("/login")
  }

  const handleToggleFavorite = async () => {
    if (!product?.id || togglingFavorite) return

    if (!isAuthenticated) {
      navigate("/login")
      return
    }

    const previousFavorite = favorite
    const nextFavorite = !previousFavorite

    try {
      setTogglingFavorite(true)
      setFavorite(nextFavorite)

      const response = await toggleAccountFavorite(product.id)
      const isFavorite = Boolean(response?.data?.is_favorite)

      setFavorite(isFavorite)
      onFavoriteChange?.(product.id, isFavorite, response?.data)
      notifySuccess(response?.message || (isFavorite ? t("addedToFavorites") : t("removedFromFavorites")))
    } catch (error) {
      setFavorite(previousFavorite)
      notifyError(error?.response?.data?.message || t("favorites"))
      console.error("Error al actualizar favorito:", error?.response?.data || error)
    } finally {
      setTogglingFavorite(false)
    }
  }

  const handleOpenWishlist = (event) => {
    event?.preventDefault()
    event?.stopPropagation()

    if (!isAuthenticated) {
      navigate("/login")
      return
    }

    setWishlistOpen((prev) => !prev)
  }

  return (
    <article className="product-card">
      <div className="product-card__media">
        <button
          ref={wishlistButtonRef}
          type="button"
          className="product-card__wishlist"
          onClick={handleOpenWishlist}
          disabled={!sessionReady}
          aria-label={t("addToWishlist")}
        >
          <i className="bi bi-three-dots-vertical" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`product-card__favorite ${favorite ? "is-active" : ""}`}
          onClick={handleToggleFavorite}
          disabled={togglingFavorite || !sessionReady}
          aria-label={favorite ? t("removeFavorite") : t("addFavorite")}
          aria-pressed={favorite}
        >
          <i className={`bi ${favorite ? "bi-heart-fill" : "bi-heart"}`} aria-hidden="true" />
        </button>

        {productBadges.length ? (
          <div className="product-card__badges">
            {productBadges.slice(0, 2).map((badge) => (
              <span
                key={badge}
                className={`product-card__badge product-card__badge--${String(
                  badge
                ).toLowerCase()}`}
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}

        <Link to={`/producto/${productSlug}`}>
          <img
            src={productImage}
            alt={productName}
            className="product-card__image"
            loading="lazy"
            decoding="async"
          />
        </Link>
      </div>

      <div className="product-card__body">
        <Link to={`/producto/${productSlug}`} className="product-card__title-link">
          <h3 className="product-card__title">{productName}</h3>
        </Link>

        {productPromotionMessage ? (
          <div className="product-card__promo-line">{productPromotionMessage}</div>
        ) : null}

        <div className="product-card__meta">
          <span className="product-card__rating">★ {productRating}</span>
          <span className="product-card__sold">{productSold}</span>
        </div>

        {canShowPrices && hasAvailablePrice ? (
          <>
            {productOldPrice > productPrice ? (
              <div className="product-card__old-price">
                {productOldPriceFormatted || `$${productOldPrice.toLocaleString("es-MX")}`}
              </div>
            ) : null}

            <div className="product-card__price-row">
              <span className="product-card__price">
                {productPriceFormatted || `$${productPrice.toLocaleString("es-MX")}`}
              </span>
              <span className="product-card__discount">{productDiscountLabel}</span>
            </div>
          </>
        ) : (
          <div className="product-card__price-login">
            {canShowPrices ? t("priceUnavailable") : t("loginToSeePrices")}
          </div>
        )}

        <div className="product-card__brand">{productBrand}</div>

        <div className="product-card__shipping">{productShipping}</div>

        {effectiveStockStatus !== "untracked" ? (
          <div className={`product-card__stock product-card__stock--${effectiveStockStatus}`}>
            {stockMessage || formatStockMessage(effectiveStockStatus, t)}
          </div>
        ) : null}

        {!sessionReady ? (
          <button
            type="button"
            className="product-card__login-required"
            disabled
          >
            {t("loading")}
          </button>
        ) : isAuthenticated ? (
          <button
            type="button"
            className="product-card__add-to-cart"
            onClick={handleAddToCart}
            disabled={addingToCart || !hasAvailablePrice || blocksByStock}
          >
            {addingToCart
              ? t("addingToCart")
              : blocksByStock
              ? t("outOfStock")
              : hasAvailablePrice
              ? t("addToCart")
              : t("priceUnavailable")}
          </button>
        ) : (
          <button
            type="button"
            className="product-card__login-required"
            onClick={handleGoToLogin}
          >
            {t("loginToBuy")}
          </button>
        )}
      </div>
      <WishlistModal
        isOpen={wishlistOpen}
        product={product}
        triggerRef={wishlistButtonRef}
        onClose={() => setWishlistOpen(false)}
      />
    </article>
  )
}

function formatStockMessage(status, t) {
  const messages = {
    out_of_stock: t("outOfStock"),
    low_stock: t("lowStock"),
    in_stock: t("inStock"),
  }

  return messages[status] || ""
}

function getApiErrorMessage(error, fallbackMessage) {
  const payload = error?.response?.data
  const errors = payload?.errors

  if (errors && typeof errors === "object") {
    const preferredKeys = ["attribute_value_ids", "quantity", "product_id"]

    for (const key of preferredKeys) {
      const message = extractValidationMessage(errors[key])
      if (message) return message
    }

    for (const value of Object.values(errors)) {
      const message = extractValidationMessage(value)
      if (message) return message
    }
  }

  return payload?.message || fallbackMessage
}

function extractValidationMessage(value) {
  if (Array.isArray(value)) return value.find(Boolean) || ""
  if (typeof value === "string") return value
  return ""
}

export default ProductCard
