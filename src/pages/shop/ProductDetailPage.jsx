import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { getProductDetail } from "../../services/api/productService"
import { addCartItem } from "../../services/api/cartService"
import { toggleAccountFavorite } from "../../services/api/accountService"
import { useAuth } from "../../context/AuthContext"
import { useCurrency } from "../../context/CurrencyContext"
import { useLocalization } from "../../context/LocalizationContext"
import { useSettings } from "../../context/SettingsContext"
import { notifySuccess, notifyError } from "../../utils/toast"
import { normalizeMediaUrl } from "../../utils/mediaUrl"
import { getMoneyFormatted, getProductCompareMoney, getProductPriceMoney } from "../../utils/money"
import { trackMetaAddToCart, trackMetaViewContent } from "../../utils/metaPixel"
import WishlistModal from "../../components/wishlist/WishlistModal"
import "./productdetailpage.css"

const CART_SUMMARY_STORAGE_KEY = "ecommerce_cart_summary"
const PRICE_UNAVAILABLE_SOURCE = "precios_articulos_default_missing"

function ProductDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, sessionReady } = useAuth()
  const { locale, t } = useLocalization()
  const { currency } = useCurrency()
  const { settings } = useSettings()

  const [productData, setProductData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [togglingFavorite, setTogglingFavorite] = useState(false)
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const wishlistButtonRef = useRef(null)
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [selectedAttributeValueIds, setSelectedAttributeValueIds] = useState({})

  const product = useMemo(() => {
    if (!productData) return null

    const mainImage = normalizeMediaUrl(productData.image_url || productData.image_path)
    const galleryItems = Array.isArray(productData.gallery)
      ? productData.gallery
          .filter((item) => Boolean(item.is_active ?? true))
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
          .map((item) => ({
            id: `gallery-${item.id}`,
            type: item.media_type || "image",
            url: normalizeMediaUrl(item.media_url || item.media_path),
            title: item.title || productData.name,
          }))
          .filter((item) => item.url)
      : []
    const mediaItems = [
      ...(mainImage
        ? [
            {
              id: "main-image",
              type: "image",
              url: mainImage,
              title: productData.name,
            },
          ]
        : []),
      ...galleryItems,
    ].filter((item, index, items) => {
      return items.findIndex((candidate) => candidate.url === item.url) === index
    })
    const variants = Array.isArray(productData.variants)
      ? productData.variants
          .filter((variant) => Boolean(variant.is_active ?? true))
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      : []
    const variantOptions =
      Array.isArray(productData.variant_attributes) &&
      Array.isArray(productData.variant_attribute_values)
        ? buildVariantOptionsFromAttributes(
            productData.variant_attributes,
            productData.variant_attribute_values
          )
        : Array.isArray(productData.variant_options)
        ? normalizeVariantOptions(productData.variant_options)
        : buildVariantOptions(variants)
    const defaultPrice = Number(productData.default_price || 0)
    const activePromotions = Array.isArray(productData.active_promotions)
      ? productData.active_promotions
      : []
    const priceScales = normalizePromotionScales(productData.price_scales)
    const hasActivePromotions = Boolean(productData.has_active_promotions) || activePromotions.length > 0
    const activePromotionsCount = Number(
      productData.active_promotions_count ?? activePromotions.length
    )

    return {
      id: productData.id,
      name: productData.name,
      slug: productData.slug,
      brand: productData.brand || t("notAvailable"),
      sku: productData.sku || "",
      image: mainImage,
      mediaItems,
      images: mediaItems.filter((item) => item.type === "image").map((item) => item.url),
      price: defaultPrice,
      oldPrice: defaultPrice,
      priceMoneyFormatted: getProductPriceMoney(productData),
      oldPriceMoneyFormatted: getProductCompareMoney(productData),
      price_money: productData.price_money ?? null,
      compare_price_money: productData.compare_price_money ?? null,
      priceInfo: productData.price_info ?? null,
      stock: productData.stock ?? null,
      stockStatus: productData.stock_status || "untracked",
      stockMessage: productData.stock_message || "",
      discountLabel: "",
      category: productData.category?.name || t("products"),
      family: productData.family?.name || "",
      shortDescription:
        productData.short_description ||
        "",
      description:
        productData.description ||
        "",
      descriptionHtml: sanitizeDescriptionHtml(
        productData.description ||
          ""
      ),
      hasActivePromotions,
      activePromotionsCount,
      activePromotions,
      priceScales,
      variants,
      variantOptions,
      technicalSpecs: [
        { label: t("brand"), value: productData.brand || t("notAvailable") },
        { label: "SKU", value: productData.sku || t("notAvailable") },
        { label: t("category"), value: productData.category?.name || t("notAvailable") },
        { label: t("family"), value: productData.family?.name || t("notAvailable") },
        { label: t("keyword"), value: productData.keyword || t("notAvailable") },
        { label: t("status"), value: productData.is_active ? t("active") : t("inactive") },
      ],
      rating: 4.8,
      sold: "Alta rotación",
      badges: [],
      isFavorite: Boolean(productData.is_favorite),
    }
  }, [productData, t])

  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [selectedColorPreviewUrl, setSelectedColorPreviewUrl] = useState("")
  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return null

    return product.variants.find((variant) => Number(variant.id) === Number(selectedVariantId)) || null
  }, [product, selectedVariantId])
  const displayPrice = Number(product?.price ?? 0)
  const comparePrice = Number(product?.oldPrice ?? 0)
  const displayPriceFormatted =
    getMoneyFormatted(selectedVariant?.price_money) ||
    product?.priceMoneyFormatted ||
    getProductPriceMoney(product)
  const comparePriceFormatted =
    getMoneyFormatted(selectedVariant?.compare_price_money) ||
    product?.oldPriceMoneyFormatted ||
    getProductCompareMoney(product)
  const selectedVariantStock = selectedVariant?.stock
  const selectedVariantHasTrackedStock = selectedVariantStock !== null && selectedVariantStock !== undefined && selectedVariantStock !== ""
  const canShowPrices = sessionReady && isAuthenticated
  const hasAvailablePrice =
    Boolean(displayPriceFormatted) ||
    (displayPrice > 0 && product?.priceInfo?.source !== PRICE_UNAVAILABLE_SOURCE)
  const hasVariantAttributes = Boolean(product?.variantOptions?.length)
  const hasSelectedAllVariantAttributes =
    !hasVariantAttributes ||
    product.variantOptions.every((option) => selectedAttributeValueIds[option.attribute.id])
  const missingVariantSelection = hasVariantAttributes && !hasSelectedAllVariantAttributes
  const isEditorialShop = settings.storefront?.active_template === "editorial_shop"

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        const response = await getProductDetail(slug)
        setProductData(response.data)
        setIsFavorite(Boolean(response.data?.is_favorite))
      } catch (error) {
        console.error(error)
        setProductData(null)
        setIsFavorite(false)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [currency, locale, slug])

  useEffect(() => {
    if (product?.mediaItems?.length) {
      setActiveMediaIndex(0)
      setLightboxIndex(0)
      setSelectedColorPreviewUrl("")
    }
  }, [product])

  useEffect(() => {
    if (!product?.variants?.length) {
      setSelectedVariantId(null)
      setSelectedAttributeValueIds({})
      return
    }

    setSelectedVariantId(null)
    setSelectedAttributeValueIds({})
  }, [product])

  useEffect(() => {
    if (product?.id) {
      trackMetaViewContent(product)
    }
  }, [product])

  const hasNoStockValue = product?.stock === null || product?.stock === undefined || product?.stock === ""
  const isOutOfStock = product?.stockStatus === "out_of_stock" || hasNoStockValue || Number(product?.stock) <= 0
  const effectiveStockStatus = isOutOfStock ? "out_of_stock" : product?.stockStatus
  const isSelectedVariantOutOfStock =
    !hasVariantAttributes &&
    Boolean(selectedVariant) &&
    (!selectedVariantHasTrackedStock || Number(selectedVariantStock) <= 0)
  const hasInvalidStockQuantity =
    !isOutOfStock && Number(product?.stock) > 0 && quantity > Number(product.stock)
  const increaseQty = () =>
    setQuantity((prev) => {
      if (!isOutOfStock && Number(product?.stock) > 0) {
        return Math.min(prev + 1, Number(product.stock))
      }

      return prev + 1
    })
  const decreaseQty = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1))

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

  const handleAddToCart = async () => {
    if (!product?.id || addingToCart) return

    if (!isAuthenticated) {
      navigate("/login")
      return
    }

    if (!hasAvailablePrice) {
      notifyError(t("priceUnavailable"))
      return
    }

    if (missingVariantSelection) {
      notifyError(t("selectAttributesBeforeCart"))
      return
    }

    if (isOutOfStock || isSelectedVariantOutOfStock) {
      notifyError(product.stockMessage || t("outOfStock"))
      return
    }

    if (hasInvalidStockQuantity) {
      notifyError(t("onlyAvailableCount", { count: product.stock }))
      return
    }

    try {
      setAddingToCart(true)
      const payload = {
        product_id: product.id,
        quantity,
        ...(hasVariantAttributes
          ? { attribute_value_ids: Object.values(selectedAttributeValueIds).map(Number).filter(Boolean) }
          : {}),
      }
      const response = await addCartItem(payload)
      const cartSummary =
        response?.data?.cart ||
        response?.data?.summary ||
        response?.cart ||
        response?.summary ||
        response?.data

      if (cartSummary && typeof cartSummary === "object") {
        syncCartSummary(cartSummary)
      }

      trackMetaAddToCart(product, quantity)
      notifySuccess(response?.message || t("addedToCart"))
    } catch (error) {
      notifyError(getApiErrorMessage(error, t("addToCart")))
    } finally {
      setAddingToCart(false)
    }
  }

  const handleVariantOptionSelect = (attributeId, valueId) => {
    if (!valueId) {
      const nextSelected = { ...selectedAttributeValueIds }
      delete nextSelected[attributeId]
      setSelectedAttributeValueIds(nextSelected)
      setSelectedVariantId(null)
      syncColorPreview(attributeId, "")
      return
    }

    const nextSelected = {
      ...selectedAttributeValueIds,
      [attributeId]: valueId,
    }
    const selectedIds = Object.values(nextSelected)
    const nextVariant = findVariantForSelection(product.variants, selectedIds)

    setSelectedAttributeValueIds(nextSelected)
    syncColorPreview(attributeId, valueId)

    if (nextVariant) {
      setSelectedVariantId(nextVariant.id)
      setSelectedAttributeValueIds(buildSelectedMapFromVariant(nextVariant))
    } else {
      setSelectedVariantId(null)
    }
  }

  const syncColorPreview = (attributeId, valueId) => {
    const option = product?.variantOptions?.find((item) => {
      return Number(item.attribute.id) === Number(attributeId)
    })

    if (!option || !isColorAttribute(option.attribute)) return

    if (!valueId) {
      setSelectedColorPreviewUrl("")
      return
    }

    const value = option.values.find((item) => Number(item.id) === Number(valueId))
    const imageUrl = getVariantValueImage(value, product.variants, "")

    if (!imageUrl) {
      setSelectedColorPreviewUrl("")
      return
    }
    setSelectedColorPreviewUrl(imageUrl)

    const mediaIndex = product.mediaItems.findIndex((media) => media.url === imageUrl)

    if (mediaIndex >= 0) {
      setActiveMediaIndex(mediaIndex)
      setLightboxIndex(mediaIndex)
      return
    }

    setActiveMediaIndex(0)
    setLightboxIndex(0)
  }

  const handleMediaSelect = (index) => {
    setSelectedColorPreviewUrl("")
    setActiveMediaIndex(index)
    setLightboxIndex(index)
  }

  const handleToggleFavorite = async () => {
    if (!product?.id || togglingFavorite) return

    if (!isAuthenticated) {
      navigate("/login")
      return
    }

    const previousFavorite = isFavorite
    const nextFavorite = !previousFavorite

    try {
      setTogglingFavorite(true)
      setIsFavorite(nextFavorite)

      const response = await toggleAccountFavorite(product.id)
      const favoriteFromApi = Boolean(response?.data?.is_favorite)

      setIsFavorite(favoriteFromApi)
      notifySuccess(
        response?.message ||
          (favoriteFromApi ? t("addedToFavorites") : t("removedFromFavorites"))
      )
    } catch (error) {
      setIsFavorite(previousFavorite)
      notifyError(error?.response?.data?.message || t("favorites"))
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

  const handleMouseMove = (e) => {
    if (window.innerWidth < 992) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setZoomPosition({ x, y })
  }

  const openLightbox = (index = 0) => {
    setLightboxIndex(index)
    setIsLightboxOpen(true)
  }

  const closeLightbox = () => {
    setIsLightboxOpen(false)
  }

  const goPrevLightbox = () => {
    setLightboxIndex((prev) =>
      prev === 0 ? product.mediaItems.length - 1 : prev - 1
    )
  }

  const goNextLightbox = () => {
    setLightboxIndex((prev) =>
      prev === product.mediaItems.length - 1 ? 0 : prev + 1
    )
  }

  if (loading) {
    return (
      <section className="product-detail-page">
        <div className="container-main">
          <div className="product-detail-page__not-found">
            <h1>{t("productLoading")}</h1>
          </div>
        </div>
      </section>
    )
  }

  if (!product) {
    return (
      <section className="product-detail-page">
        <div className="container-main">
          <div className="product-detail-page__not-found">
            <h1>{t("productNotFound")}</h1>
            <p>{t("productNotFoundText")}</p>
            <Link to="/productos" className="product-detail__primary-btn">
              {t("seeProducts")}
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const activeMedia = selectedColorPreviewUrl
    ? {
        id: "selected-color-preview",
        type: "image",
        url: selectedColorPreviewUrl,
        title: product.name,
      }
    : product.mediaItems[activeMediaIndex] || product.mediaItems[0]
  const promotionMessages = buildPromotionMessages(product.activePromotions)

  if (isEditorialShop) {
    return (
      <section className="product-detail-page product-detail-page--editorial">
        {promotionMessages.length ? (
          <div className="editorial-product-promo-marquee" aria-label={t("productPromotions")}>
            <div>
              {Array.from({ length: 6 }).flatMap((_, groupIndex) =>
                promotionMessages.map((message, index) => (
                  <span key={`${groupIndex}-${index}`}>
                    {message}
                  </span>
                ))
              )}
            </div>
          </div>
        ) : null}

        <div className="editorial-product-show container-main">
          <div className="editorial-product-show__gallery">
            <button
              type="button"
              className="editorial-product-show__main-media"
              onClick={() => openLightbox(activeMediaIndex)}
              aria-label={t("viewFullImage")}
            >
              {activeMedia?.type === "video" ? (
                <video src={activeMedia.url} controls />
              ) : (
                <img src={activeMedia?.url || product.image} alt={product.name} />
              )}
            </button>

            {product.mediaItems.length > 1 ? (
              <div className="editorial-product-show__thumbs">
                {product.mediaItems.map((media, index) => (
                  <button
                    key={media.id}
                    type="button"
                    className={`editorial-product-show__thumb ${activeMediaIndex === index ? "is-active" : ""}`}
                    onClick={() => handleMediaSelect(index)}
                  >
                    {media.type === "video" ? (
                      <video src={media.url} muted />
                    ) : (
                      <img src={media.url} alt={`${product.name} ${index + 1}`} />
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="editorial-product-show__info">
            <div className="editorial-product-show__title-row">
              <h1>{product.name}</h1>
              <button
                type="button"
                className={`editorial-product-show__favorite ${isFavorite ? "is-active" : ""}`}
                onClick={handleToggleFavorite}
                disabled={togglingFavorite || !sessionReady}
                aria-label={isFavorite ? t("removeFavorite") : t("addFavorite")}
                aria-pressed={isFavorite}
              >
                <i className={`bi ${isFavorite ? "bi-heart-fill" : "bi-heart"}`} aria-hidden="true" />
              </button>
            </div>

            <div className="editorial-product-show__price">
              {canShowPrices && hasAvailablePrice ? (
                <>
                  <span>{displayPriceFormatted || formatMoney(displayPrice)}</span>
                  {comparePrice > displayPrice ? <del>{comparePriceFormatted || formatMoney(comparePrice)}</del> : null}
                </>
              ) : (
                <span className="is-note">
                  {canShowPrices ? t("priceUnavailable") : t("loginToSeePrices")}
                </span>
              )}
            </div>

            {product.variantOptions.length ? (
              <div className="editorial-product-show__variants">
                {product.variantOptions.map((option) => {
                  const isColor = isColorAttribute(option.attribute)
                  const selectedValueId = selectedAttributeValueIds[option.attribute.id] || ""
                  const selectedValue = option.values.find((value) => Number(value.id) === Number(selectedValueId))

                  return (
                    <div className="editorial-product-show__variant" key={option.attribute.id}>
                      <label htmlFor={`editorial-variant-${option.attribute.id}`}>
                        {option.attribute.name}: <strong>{selectedValue?.value || t("selectOption")}</strong>
                      </label>
                      {isColor ? (
                        <div className="editorial-product-show__swatches">
                          {option.values.map((value) => {
                            const selected = Number(selectedValueId) === Number(value.id)
                            const imageUrl = getVariantValueImage(value, product.variants, product.image)

                            return (
                              <button
                                type="button"
                                key={value.id}
                                className={selected ? "is-selected" : ""}
                                onClick={() => handleVariantOptionSelect(option.attribute.id, value.id)}
                                disabled={!isVariantValueAvailable(option.values, value.id)}
                                aria-label={`${option.attribute.name}: ${value.value}`}
                              >
                                {imageUrl ? <img src={imageUrl} alt="" /> : <span />}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <select
                          id={`editorial-variant-${option.attribute.id}`}
                          value={selectedValueId}
                          onChange={(event) => handleVariantOptionSelect(option.attribute.id, event.target.value)}
                        >
                          <option value="">{t("selectOption")}</option>
                          {option.values.map((value) => (
                            <option
                              key={value.id}
                              value={value.id}
                              disabled={!isVariantValueAvailable(option.values, value.id)}
                            >
                              {value.value}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : null}

            <div className="editorial-product-show__purchase">
              <label>{t("quantity")}</label>
              <div className="editorial-product-show__purchase-row">
                <div className="editorial-product-show__qty">
                  <button type="button" onClick={decreaseQty}>−</button>
                  <span>{quantity}</span>
                  <button type="button" onClick={increaseQty}>+</button>
                </div>
                {!sessionReady ? (
                  <button type="button" className="editorial-product-show__cart" disabled>
                    {t("loading")}
                  </button>
                ) : isAuthenticated ? (
                  <button
                    type="button"
                    className="editorial-product-show__cart"
                    onClick={handleAddToCart}
                    disabled={
                      addingToCart ||
                      !hasAvailablePrice ||
                      isOutOfStock ||
                      isSelectedVariantOutOfStock ||
                      hasInvalidStockQuantity ||
                      missingVariantSelection ||
                      (!hasVariantAttributes && product.variants.length > 0 && !selectedVariant)
                    }
                  >
                    {addingToCart
                      ? t("addingToCart")
                      : missingVariantSelection
                      ? t("selectAttributes")
                      : isOutOfStock || isSelectedVariantOutOfStock
                      ? t("outOfStock")
                      : t("addToCart")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="editorial-product-show__cart"
                    onClick={() => navigate("/login")}
                  >
                    {t("loginToBuy")}
                  </button>
                )}
              </div>
            </div>

            <div className="editorial-product-show__tools">
              <button ref={wishlistButtonRef} type="button" onClick={handleOpenWishlist} disabled={!sessionReady}>
                <i className="bi bi-list-ul" /> {t("addToWishlist")}
              </button>
              <Link to="/contacto"><i className="bi bi-question-circle" /> {t("askQuestion")}</Link>
              <button type="button" onClick={() => navigator.share?.({ title: product.name, url: window.location.href })}>
                <i className="bi bi-share" /> {t("share")}
              </button>
            </div>

            <div className="editorial-product-show__delivery">
              <div><i className="bi bi-truck" /> <strong>{t("deliveryAvailable")}:</strong> {t("shippingByCoverage")}</div>
              <div><i className="bi bi-box-seam" /> <strong>{t("shippingAndReturns")}:</strong> {t("checkConditionsAtPurchase")}</div>
            </div>

            <div className="editorial-product-show__checkout">
              <div>
                <span>VISA</span>
                <span>MC</span>
                <span>AMEX</span>
                <span>SPEI</span>
              </div>
              <strong>{t("secureCheckout")}</strong>
            </div>
          </div>

          <div className="editorial-product-show__description">
            <div className="editorial-product-show__tabs">
              <span>{t("productDescription")}</span>
            </div>
            <p>{product.shortDescription}</p>
            <div
              className="editorial-product-show__html"
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
            />
          </div>
        </div>

        {isLightboxOpen && (
          <div className="product-lightbox" onClick={closeLightbox}>
            <div className="product-lightbox__dialog" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="product-lightbox__close" onClick={closeLightbox} aria-label={t("closeFullView")}>
                ×
              </button>
              <div className="product-lightbox__image-wrap">
                {product.mediaItems[lightboxIndex]?.type === "video" ? (
                  <video src={product.mediaItems[lightboxIndex].url} controls className="product-lightbox__image" />
                ) : (
                  <img
                    src={product.mediaItems[lightboxIndex]?.url}
                    alt={`${product.name} vista ${lightboxIndex + 1}`}
                    className="product-lightbox__image"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        <WishlistModal
          isOpen={wishlistOpen}
          product={product}
          triggerRef={wishlistButtonRef}
          onClose={() => setWishlistOpen(false)}
        />
      </section>
    )
  }

  return (
    <section className="product-detail-page">
      <div className="container-main">
        <div className="product-detail-page__breadcrumbs">
          Inicio &gt; Productos &gt; {product.category} &gt; {product.name}
        </div>

        <div className="shop-product-detail">
          <div className="product-detail__gallery-card">
            <div className="product-detail__gallery">
              <div className="product-detail__thumbs">
                {product.mediaItems.map((media, index) => (
                  <button
                    key={media.id}
                    type="button"
                    className={`product-detail__thumb ${
                      activeMediaIndex === index ? "is-active" : ""
                    }`}
                    onClick={() => handleMediaSelect(index)}
                  >
                    {media.type === "video" ? (
                      <>
                        <video src={media.url} muted />
                        <span className="product-detail__thumb-play">▶</span>
                      </>
                    ) : (
                      <img src={media.url} alt={`${product.name} ${index + 1}`} />
                    )}
                  </button>
                ))}
              </div>

              <div
                className={`product-detail__main-image ${isZoomed ? "is-zoomed" : ""}`}
                onMouseEnter={() => {
                  if (window.innerWidth >= 992) setIsZoomed(true)
                }}
                onMouseLeave={() => setIsZoomed(false)}
                onMouseMove={handleMouseMove}
                onClick={() =>
                  openLightbox(activeMediaIndex)
                }
              >
                {activeMedia?.type === "video" ? (
                  <video src={activeMedia.url} controls />
                ) : (
                  <img
                    src={activeMedia?.url}
                    alt={product.name}
                    style={{
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="product-detail__info-card">
            <div className="product-detail__topline">
              <span className="product-detail__category">{product.category}</span>
              <button
                type="button"
                className={`product-detail__favorite ${isFavorite ? "is-active" : ""}`}
                onClick={handleToggleFavorite}
                disabled={togglingFavorite || !sessionReady}
                aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                aria-pressed={isFavorite}
              >
                <i className={`bi ${isFavorite ? "bi-heart-fill" : "bi-heart"}`} aria-hidden="true" />
              </button>
            </div>

            {product.badges?.length ? (
              <div className="product-detail__badges">
                {product.badges.map((badge) => (
                  <span
                    key={badge}
                    className={`product-detail__badge product-detail__badge--${badge.toLowerCase()}`}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            ) : null}

            {product.hasActivePromotions ? (
              <div className="product-detail__promo-badges">
                <span className="product-detail__promo-badge">
                  {product.activePromotionsCount > 1
                    ? `${product.activePromotionsCount} ${t("currentPromotions")}`
                    : t("currentPromotion")}
                </span>
              </div>
            ) : null}

            <h1 className="product-detail__title">{product.name}</h1>

            <div className="product-detail__meta-row">
              <span className="product-detail__brand">{t("brand")}: {product.brand}</span>
              {product.family ? <span>{product.family}</span> : null}
              <span>{product.sku ? `${t("baseSku")}: ${product.sku}` : t("noBaseSku")}</span>
            </div>

            <div className="product-detail__price-block">
              {canShowPrices && hasAvailablePrice ? (
                <>
                  {comparePrice > displayPrice ? (
                    <div className="product-detail__old-price">
                      {comparePriceFormatted || `$${comparePrice.toLocaleString("es-MX")}`}
                    </div>
                  ) : null}

                  <div className="product-detail__price-row">
                    <span className="product-detail__price">
                      {displayPriceFormatted || `$${displayPrice.toLocaleString("es-MX")}`}
                    </span>
                    <span className="product-detail__discount">{product.discountLabel}</span>
                  </div>
                </>
              ) : (
                <div className="product-detail__price-login">
                  {canShowPrices ? t("priceUnavailable") : t("loginToSeePrices")}
                </div>
              )}
              {selectedVariant ? (
                <div className="product-detail__variant-summary">
                  <span>{selectedVariant.name || selectedVariant.sku}</span>
                  <span>SKU: {selectedVariant.sku}</span>
                  {selectedVariantStock !== null && selectedVariantStock !== undefined ? (
                    <span>{Number(selectedVariantStock) > 0 ? t("stockAvailableCount", { count: selectedVariantStock }) : t("noStock")}</span>
                  ) : null}
                </div>
              ) : null}
              {effectiveStockStatus !== "untracked" ? (
                <div className={`product-detail__stock product-detail__stock--${effectiveStockStatus}`}>
                  {product.stockMessage || formatStockMessage(effectiveStockStatus, t)}
                  {product.stock !== null && product.stock !== undefined && effectiveStockStatus !== "out_of_stock"
                    ? ` ${t("stock")}: ${product.stock}`
                    : ""}
                </div>
              ) : null}
            </div>

            {product.priceScales.length ? (
              <div className="product-detail__scale">
                <h3 className="product-detail__box-title">{t("wholesaleScales")}</h3>
                <div className="product-detail__scale-table">
                  {product.priceScales.map((scale, index) => (
                    <div
                      className="product-detail__scale-row"
                      key={`${scale.from_quantity}-${scale.to_quantity ?? "inf"}-${index}`}
                    >
                      <span>{formatScaleRange(scale.from_quantity, scale.to_quantity, t)}</span>
                  <strong>{formatScaleDiscount(scale.discount_percentage, t)}</strong>
                      <small>{t("automaticInCart")}</small>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {product.variantOptions.length ? (
              <div className="product-detail__variants-box">
                <h3 className="product-detail__box-title">{t("attributes")}</h3>
                {product.variantOptions.map((option) => {
                  const isColor = isColorAttribute(option.attribute)
                  const selectedValueId = selectedAttributeValueIds[option.attribute.id] || ""
                  const selectedValue = option.values.find((value) => {
                    return Number(value.id) === Number(selectedValueId)
                  })

                  return (
                    <div
                      className={`product-detail__variant-option ${
                        isColor ? "is-color" : "is-select"
                      }`}
                      key={option.attribute.id}
                    >
                      {isColor ? (
                        <>
                          <div className="product-detail__variant-option-title">
                            <span>{option.attribute.name}:</span>{" "}
                            <strong>{selectedValue?.value || t("selectOption")}</strong>
                          </div>
                          <div className="product-detail__variant-color-list">
                            {option.values.map((value) => {
                              const selected = Number(selectedValueId) === Number(value.id)
                              const available = isVariantValueAvailable(
                                option.values,
                                value.id
                              )
                              const imageUrl = getVariantValueImage(value, product.variants, product.image)

                              return (
                                <button
                                  type="button"
                                  key={value.id}
                                  className={`product-detail__variant-color ${
                                    selected ? "is-selected" : ""
                                  }`}
                                  onClick={() => handleVariantOptionSelect(option.attribute.id, value.id)}
                                  disabled={!available}
                                  title={value.value}
                                  aria-label={`${option.attribute.name}: ${value.value}`}
                                >
                                  {imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={value.value}
                                      onError={(event) => {
                                        event.currentTarget.style.display = "none"
                                      }}
                                    />
                                  ) : value.metadata?.hex ? (
                                    <span
                                      className="product-detail__variant-color-swatch"
                                      style={{ backgroundColor: value.metadata.hex }}
                                    />
                                  ) : (
                                    <span className="product-detail__variant-color-empty" />
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </>
                      ) : (
                        <>
                          <label
                            className="product-detail__variant-option-title"
                            htmlFor={`variant-option-${option.attribute.id}`}
                          >
                            <span>{option.attribute.name}:</span>{" "}
                            <strong>{selectedValue?.value || t("selectOption")}</strong>
                          </label>
                          <select
                            id={`variant-option-${option.attribute.id}`}
                            className="product-detail__variant-select"
                            value={selectedValueId}
                            onChange={(event) =>
                              handleVariantOptionSelect(option.attribute.id, event.target.value)
                            }
                          >
                            <option value="">{t("selectOption")}</option>
                            {option.values.map((value) => {
                              const available = isVariantValueAvailable(
                                option.values,
                                value.id
                              )

                              return (
                                <option key={value.id} value={value.id} disabled={!available}>
                                  {value.value}
                                </option>
                              )
                            })}
                          </select>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : product.variants.length ? (
              <div className="product-detail__variants-box">
                <h3 className="product-detail__box-title">{t("attributes")}</h3>
                <div className="product-detail__variant-card-list">
                  {product.variants.map((variant) => (
                    <button
                      type="button"
                      key={variant.id}
                      className={`product-detail__variant-card ${
                        Number(selectedVariantId) === Number(variant.id) ? "is-selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedVariantId(variant.id)
                        setSelectedAttributeValueIds(buildSelectedMapFromVariant(variant))
                      }}
                    >
                      <strong>{variant.name || variant.sku}</strong>
                      <span>{variant.sku}</span>
                      {canShowPrices && hasAvailablePrice ? (
                        <small>{getMoneyFormatted(variant.price_money) || displayPriceFormatted || `$${displayPrice.toLocaleString("es-MX")}`}</small>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="product-detail__purchase-box">
              <div className="product-detail__qty-row">
                <span className="product-detail__qty-label">{t("quantity")}</span>

                <div className="product-detail__qty-control">
                  <button type="button" onClick={decreaseQty}>
                    −
                  </button>
                  <span>{quantity}</span>
                  <button type="button" onClick={increaseQty}>
                    +
                  </button>
                </div>
              </div>

              <div className="product-detail__actions">
                {!sessionReady ? (
                  <button type="button" className="product-detail__primary-btn" disabled>
                    {t("loading")}
                  </button>
                ) : isAuthenticated ? (
                  <button
                    type="button"
                    className="product-detail__primary-btn"
                    onClick={handleAddToCart}
                    disabled={
                      addingToCart ||
                      !hasAvailablePrice ||
                      isOutOfStock ||
                      isSelectedVariantOutOfStock ||
                      hasInvalidStockQuantity ||
                      missingVariantSelection ||
                      (!hasVariantAttributes && product.variants.length > 0 && !selectedVariant)
                    }
                  >
                    {addingToCart
                      ? t("addingToCart")
                      : missingVariantSelection
                      ? t("selectAttributes")
                      : isOutOfStock || isSelectedVariantOutOfStock
                      ? t("outOfStock")
                      : hasAvailablePrice
                      ? t("addToCart")
                      : t("priceUnavailable")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="product-detail__primary-btn"
                    onClick={() => navigate("/login")}
                  >
                    {t("loginToBuy")}
                  </button>
                )}

                <button
                  ref={wishlistButtonRef}
                  type="button"
                  className="product-detail__secondary-btn"
                  onClick={handleOpenWishlist}
                  disabled={!sessionReady}
                >
                  {t("addToWishlist")}
                </button>
              </div>
            </div>

            <div className="product-detail__promo-box">
              <h3 className="product-detail__box-title">{t("productPromotions")}</h3>
              <ul className="product-detail__promo-list">
                {product.hasActivePromotions && product.activePromotions.length > 0 ? (
                  product.activePromotions.map((promotion) => (
                    <li key={promotion.id}>
                      <span className="product-detail__promo-icon">%</span>
                      <span>
                        <strong>{promotion.message || promotion.name}</strong>
                        {promotion.description ? (
                          <small>{promotion.description}</small>
                        ) : null}
                        {promotion.type === "price_scale_percentage" ? (
                          <PromotionScaleList promotion={promotion} />
                        ) : null}
                      </span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span className="product-detail__promo-icon">%</span>
                    <span>{t("noOfferAvailable")}</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="product-detail__scale">
              <h3 className="product-detail__box-title">{t("purchaseInformation")}</h3>
              <div className="product-detail__specs">
                <div className="product-detail__spec-row">
                  <span>{t("activePromotions")}</span>
                  <strong>{product.hasActivePromotions ? product.activePromotionsCount : 0}</strong>
                </div>
                <div className="product-detail__spec-row">
                  <span>{t("appliesPromotions")}</span>
                  <strong>{selectedVariant ? (selectedVariant.applies_promotions ? t("yes") : t("no")) : t("yes")}</strong>
                </div>
              </div>
            </div>

            <div className="product-detail__content-section">
              <h2>{t("description")}</h2>
              <p>{product.shortDescription}</p>
              <div
                className="product-detail__html-description"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            </div>

            <div className="product-detail__content-section">
              <h2>{t("technicalSheet")}</h2>
              <div className="product-detail__specs">
                {product.technicalSpecs.map((spec) => (
                  <div className="product-detail__spec-row" key={spec.label}>
                    <span>{spec.label}</span>
                    <strong>{spec.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLightboxOpen && (
        <div className="product-lightbox" onClick={closeLightbox}>
          <div
            className="product-lightbox__dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="product-lightbox__close"
              onClick={closeLightbox}
              aria-label={t("closeFullView")}
            >
              ×
            </button>

            {product.mediaItems.length > 1 && (
              <>
                <button
                  type="button"
                  className="product-lightbox__nav product-lightbox__nav--prev"
                  onClick={goPrevLightbox}
                  aria-label={t("previousImage")}
                >
                  ‹
                </button>

                <button
                  type="button"
                  className="product-lightbox__nav product-lightbox__nav--next"
                  onClick={goNextLightbox}
                  aria-label={t("nextImage")}
                >
                  ›
                </button>
              </>
            )}

            <div className="product-lightbox__image-wrap">
              {product.mediaItems[lightboxIndex]?.type === "video" ? (
                <video
                  src={product.mediaItems[lightboxIndex].url}
                  controls
                  className="product-lightbox__image"
                />
              ) : (
                <img
                  src={product.mediaItems[lightboxIndex]?.url}
                  alt={`${product.name} vista ${lightboxIndex + 1}`}
                  className="product-lightbox__image"
                />
              )}
            </div>

            {product.mediaItems.length > 1 && (
              <div className="product-lightbox__thumbs">
                {product.mediaItems.map((media, index) => (
                  <button
                    key={media.id}
                    type="button"
                    className={`product-lightbox__thumb ${
                      lightboxIndex === index ? "is-active" : ""
                    }`}
                    onClick={() => handleMediaSelect(index)}
                  >
                    {media.type === "video" ? (
                      <video src={media.url} muted />
                    ) : (
                      <img src={media.url} alt={`${product.name} miniatura ${index + 1}`} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <WishlistModal
        isOpen={wishlistOpen}
        product={product}
        triggerRef={wishlistButtonRef}
        onClose={() => setWishlistOpen(false)}
      />
    </section>
  )
}

export default ProductDetailPage

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

function PromotionScaleList({ promotion }) {
  const { t } = useLocalization()
  const scales = normalizePromotionScales(promotion?.config?.scales)

  if (!scales.length) return null

  return (
    <div className="product-detail__promo-scales">
      {scales.map((scale, index) => (
        <div
          className="product-detail__promo-scale"
          key={`${scale.from_quantity}-${scale.to_quantity ?? "inf"}-${index}`}
        >
          <span>{formatScaleRange(scale.from_quantity, scale.to_quantity, t)}</span>
          <strong>{formatScaleDiscount(scale.discount_percentage, t)}</strong>
        </div>
      ))}
    </div>
  )
}

function normalizePromotionScales(scales) {
  if (!Array.isArray(scales)) return []

  return scales
    .filter((scale) => Boolean(scale?.is_active ?? true))
    .map((scale) => ({
      from_quantity: Number(scale.from_quantity || 0),
      to_quantity:
        scale.to_quantity === null || scale.to_quantity === "" || scale.to_quantity === undefined
          ? null
          : Number(scale.to_quantity),
      discount_percentage: Number(scale.discount_percentage || 0),
    }))
    .filter((scale) => scale.from_quantity > 0 && scale.discount_percentage > 0)
    .sort((a, b) => a.from_quantity - b.from_quantity)
}

function formatScaleRange(fromQuantity, toQuantity, t) {
  if (!toQuantity) return t("fromPieces", { from: fromQuantity })
  if (Number(fromQuantity) === Number(toQuantity)) return t("pieces", { count: fromQuantity })
  return t("piecesRange", { from: fromQuantity, to: toQuantity })
}

function formatScaleDiscount(value, t) {
  const numberValue = Number(value || 0)
  const formattedValue = Number.isInteger(numberValue)
    ? String(numberValue)
    : numberValue.toFixed(2)

  return `${formattedValue}% ${t("discountSuffix")}`
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function buildPromotionMessages(promotions = []) {
  if (!Array.isArray(promotions)) return []

  return promotions
    .map((promotion) => {
      return (
        promotion?.message ||
        promotion?.label ||
        promotion?.name ||
        promotion?.description ||
        ""
      )
    })
    .map((message) => String(message).trim())
    .filter(Boolean)
}

function formatStockMessage(status, t) {
  const messages = {
    out_of_stock: t("outOfStock"),
    low_stock: t("lowStock"),
    in_stock: t("inStock"),
  }

  return messages[status] || ""
}

function buildVariantOptions(variants = []) {
  const optionMap = new Map()

  variants.forEach((variant) => {
    const values = Array.isArray(variant.attribute_values) ? variant.attribute_values : []

    values.forEach((attributeValue) => {
      const attribute = normalizeVariantAttribute(attributeValue)

      if (!attribute?.id) return

      if (!optionMap.has(attribute.id)) {
        optionMap.set(attribute.id, {
          attribute,
          values: new Map(),
        })
      }

      optionMap.get(attribute.id).values.set(attributeValue.id, attributeValue)
    })
  })

  return Array.from(optionMap.values()).map((option) => ({
    attribute: option.attribute,
    values: Array.from(option.values.values()),
  }))
}

function normalizeVariantOptions(options = []) {
  return options.map((option) => ({
    attribute: {
      id: option.id,
      name: option.name,
      slug: option.slug,
    },
    values: Array.isArray(option.values) ? option.values : [],
  }))
}

function buildVariantOptionsFromAttributes(attributes = [], values = []) {
  return attributes
    .filter((attribute) => Boolean(attribute.is_active ?? true))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((attribute) => ({
      attribute,
      values: values
        .filter((value) => {
          return (
            Number(value.variant_attribute_id) === Number(attribute.id) &&
            Boolean(value.is_active ?? true)
          )
        })
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)),
    }))
    .filter((option) => option.values.length > 0)
}

function buildSelectedMapFromVariant(variant) {
  const selected = {}
  const values = Array.isArray(variant?.attribute_values) ? variant.attribute_values : []

  values.forEach((attributeValue) => {
    const attribute = normalizeVariantAttribute(attributeValue)
    const attributeId = attribute?.id || attributeValue.variant_attribute_id

    if (attributeId) {
      selected[attributeId] = attributeValue.id
    }
  })

  return selected
}

function findVariantForSelection(variants = [], selectedValueIds = []) {
  const selectedIds = selectedValueIds.map(Number).filter(Boolean)

  return variants.find((variant) => {
    const variantIds = getVariantAttributeValueIds(variant)

    return selectedIds.every((valueId) => variantIds.includes(valueId))
  })
}

function isVariantValueAvailable(values = [], valueId) {
  const value = values.find((item) => Number(item.id) === Number(valueId))

  return Boolean(value?.is_active ?? true)
}

function getVariantAttributeValueIds(variant = {}) {
  if (Array.isArray(variant.attribute_value_ids) && variant.attribute_value_ids.length) {
    return variant.attribute_value_ids.map(Number).filter(Boolean)
  }

  if (Array.isArray(variant.attribute_values)) {
    return variant.attribute_values.map((value) => Number(value.id)).filter(Boolean)
  }

  return []
}

function isColorAttribute(attribute = {}) {
  const normalizedName = `${attribute.name || ""} ${attribute.slug || ""}`
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  return normalizedName.includes("color")
}

function getVariantValueImage(value = {}, variants = [], fallbackImage = "") {
  const directImage = normalizeMediaUrl(
    value.color_image?.url ||
      value.color_image?.path ||
      value.image_url ||
      value.image_path ||
      value.thumbnail_url ||
      value.thumbnail_path ||
      value.media_url ||
      value.media_path ||
      value.metadata?.image_url ||
      value.metadata?.image_path ||
      value.metadata?.thumbnail_url ||
      value.metadata?.thumbnail_path
  )

  if (directImage) return directImage

  const relatedVariant = variants.find((variant) => {
    const ids = getVariantAttributeValueIds(variant)
    return ids.includes(Number(value.id))
  })

  return (
    normalizeMediaUrl(
      relatedVariant?.image_url ||
        relatedVariant?.image_path ||
        relatedVariant?.media_url ||
        relatedVariant?.media_path ||
        relatedVariant?.thumbnail_url ||
        relatedVariant?.thumbnail_path
    ) || fallbackImage
  )
}

function normalizeVariantAttribute(attributeValue = {}) {
  if (attributeValue.attribute?.id) return attributeValue.attribute

  if (attributeValue.variant_attribute?.id) return attributeValue.variant_attribute

  const id =
    attributeValue.variant_attribute_id ||
    attributeValue.attribute_id ||
    attributeValue.attribute?.id

  if (!id) return null

  return {
    id,
    name:
      attributeValue.attribute_name ||
      attributeValue.variant_attribute_name ||
      attributeValue.attribute?.name ||
      `Opción ${id}`,
    slug:
      attributeValue.attribute_slug ||
      attributeValue.variant_attribute_slug ||
      attributeValue.attribute?.slug ||
      `opcion-${id}`,
  }
}

function sanitizeDescriptionHtml(html = "") {
  const template = document.createElement("template")
  template.innerHTML = html

  template.content.querySelectorAll("script, iframe, object, embed").forEach((node) => {
    node.remove()
  })

  template.content.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value || ""

      if (name.startsWith("on")) {
        node.removeAttribute(attribute.name)
        return
      }

      if ((name === "href" || name === "src") && value.trim().toLowerCase().startsWith("javascript:")) {
        node.removeAttribute(attribute.name)
      }
    })
  })

  return template.innerHTML
}
