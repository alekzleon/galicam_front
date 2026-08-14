import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  addCartPromotionGiftProduct,
  applyCartCoupon,
  applyCartCashback,
  clearCartCoupon,
  clearCartCashback,
  clearCartPromotionGiftSelection,
  clearCart,
  getCart,
  removeCartItem,
  selectCartPromotionGift,
  updateCartItem,
} from "../../services/api/cartService.js"
import { restoreRecoverableOrderCart } from "../../services/api/checkoutService.js"
import { useLocalization } from "../../context/LocalizationContext.jsx"
import { notifyError, notifySuccess, notifyWarning } from "../../utils/toast.js"
import { normalizeMediaUrl } from "../../utils/mediaUrl.js"
import "./cart.css"

const CART_SUMMARY_STORAGE_KEY = "ecommerce_cart_summary"
const STRIPE_SUCCESS_RETURN_STORAGE_KEY = "ecommerce_stripe_success_return"
const DEBUG_RECOVERABLE_CART = true

const emptyCartState = {
  id: null,
  status: "",
  currency: "MXN",
  items_count: 0,
  subtotal: 0,
  discount: 0,
  tax: 0,
  tax_breakdown: {
    total: 0,
    items: [],
  },
  total: 0,
  loyalty: null,
  coupon: null,
  last_activity_at: null,
  promotionsApplied: [],
  regionalSplits: [],
  items: [],
}

function CartPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { locale, t } = useLocalization()
  const [cart, setCart] = useState(emptyCartState)
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [processingClear, setProcessingClear] = useState(false)
  const [processingRemoveSelected, setProcessingRemoveSelected] = useState(false)
  const [itemLoadingMap, setItemLoadingMap] = useState({})
  const [promotionLoadingMap, setPromotionLoadingMap] = useState({})
  const [cashbackAmount, setCashbackAmount] = useState("")
  const [cashbackLoading, setCashbackLoading] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const restoringRecoverableRef = useRef(false)
  const recoveredNoticeShownRef = useRef(false)

  const syncCartSummary = (cartData) => {
    const summary = {
      id: cartData?.id ?? null,
      items_count: Number(cartData?.items_count ?? 0),
      subtotal: Number(cartData?.subtotal ?? 0),
      discount: Number(cartData?.discount ?? 0),
      tax: Number(cartData?.tax ?? 0),
      tax_breakdown: normalizeTaxBreakdown(cartData?.tax_breakdown),
      total: Number(cartData?.total ?? 0),
    }

    localStorage.setItem(CART_SUMMARY_STORAGE_KEY, JSON.stringify(summary))

    window.dispatchEvent(
      new CustomEvent("cart:updated", {
        detail: summary,
      })
    )
  }

  const getCartPayload = useCallback((payload) => {
    const data = payload?.data ?? payload ?? emptyCartState

    return data?.cart ?? data?.summary?.cart ?? data
  }, [])

  const getRecoverableOrder = (payload) => {
    const data = payload?.data ?? payload ?? {}
    const recoverableOrder = data?.recoverable_order ?? data?.summary?.recoverable_order ?? null

    if (DEBUG_RECOVERABLE_CART) {
      console.log("[recoverable-cart][cart] normalized data:", data)
      console.log("[recoverable-cart][cart] detected recoverable_order:", recoverableOrder)
    }

    return recoverableOrder
  }

  const shouldTryImplicitRecover = useCallback((payload) => {
    if (hasRecentStripeSuccessReturn()) {
      if (DEBUG_RECOVERABLE_CART) {
        console.log("[recoverable-cart][cart] skipping implicit restore: recent Stripe success return")
      }

      return false
    }

    const cartData = getCartPayload(payload)
    const hasNoItems = Number(cartData?.items_count ?? 0) === 0
    const hasNoLines = !Array.isArray(cartData?.items) || cartData.items.length === 0
    const isActiveCart = cartData?.status === "active"

    return Boolean(isActiveCart && hasNoItems && hasNoLines)
  }, [getCartPayload])

  const normalizeCart = useCallback((payload) => {
    const cartData = getCartPayload(payload)
    const items = Array.isArray(cartData?.items) ? cartData.items : []
    const promotionsApplied = Array.isArray(
      cartData?.promotions_applied ?? cartData?.promotionsApplied
    )
      ? cartData?.promotions_applied ?? cartData?.promotionsApplied
      : []

    const normalizedItems = items.map((item) => {
      const baseUnitPrice = Number(
        item.base_unit_price ??
          item.base_unit_price_snapshot ??
          item.price ??
          item.price_snapshot ??
          0
      )

      const finalUnitPrice = Number(
        item.final_unit_price ??
          item.final_unit_price_snapshot ??
          item.price ??
          item.price_snapshot ??
          baseUnitPrice
      )

      const lineDiscount = Number(
        item.line_discount ??
          item.line_discount_snapshot ??
          item.discount_amount ??
          0
      )

      const lineSubtotal = Number(
        item.line_subtotal ??
          item.line_subtotal_snapshot ??
          finalUnitPrice * Number(item.quantity ?? 0)
      )

      const hasPromotion =
        Boolean(item.promotion_id) ||
        Boolean(item.promotion_type) ||
        Boolean(item.promotion_name_snapshot) ||
        Boolean(item.promotion)

      const promotionData = item.promotion
        ? item.promotion
        : hasPromotion
        ? {
            id: item.promotion_id ?? null,
            type: item.promotion_type ?? null,
            name: item.promotion_name_snapshot ?? null,
            snapshot: item.promotion_snapshot ?? null,
          }
        : null

      const percentOff =
        baseUnitPrice > 0 && finalUnitPrice < baseUnitPrice
          ? Math.round(((baseUnitPrice - finalUnitPrice) / baseUnitPrice) * 100)
          : 0

      const availablePromotions = Array.isArray(item.available_promotions)
        ? item.available_promotions
        : Array.isArray(item.availablePromotions)
        ? item.availablePromotions
        : []

      return {
        id: item.id ?? item.cart_item_id ?? item.product_id,
        productId: item.product_id,
        image: normalizeCartItemImage(item),
        name: item.name || item.name_snapshot || "Producto sin nombre",
        brand: item.brand || item.brand_snapshot || "Sin marca",
        presentation: item.presentation || item.sku || item.sku_snapshot || "",
        price: finalUnitPrice,
        oldPrice: baseUnitPrice > finalUnitPrice ? baseUnitPrice : null,
        baseUnitPrice,
        discount: percentOff,
        discountAmount: lineDiscount,
        quantity: item.quantity ?? 0,
        available: null,
        lineSubtotal,
        status: item.status || "",
        stock: normalizeCartItemStock(item),
        sku: item.sku || item.sku_snapshot || "",
        category: item.category || item.category_snapshot || "",
        family: item.family || item.family_snapshot || "",
        promotion: promotionData,
        selectedAttributes: normalizeSelectedAttributes(item.selected_attributes ?? item.metadata?.selected_attributes),
        availablePromotions,
        giftUnits: Number(item.gift_units ?? item.giftUnits ?? 0),
        giftItemUnits: Number(
          item.gift_item_units ??
            item.giftItemUnits ??
            promotionData?.snapshot?.gift_item_units ??
            0
        ),
        giftItems: normalizeGiftItems(
          item.gift_items ?? item.giftItems ?? promotionData?.snapshot?.gift_items
        ),
        giftUnitAccountingPrice: Number(
          item.gift_unit_accounting_price ??
            item.giftUnitAccountingPrice ??
            0
        ),
        giftLineTotal: Number(item.gift_line_total ?? item.giftLineTotal ?? 0),
        taxableBase: Number(item.taxable_base ?? item.taxableBase ?? 0),
        tax: Number(item.tax ?? item.tax_amount ?? 0),
        taxes: normalizeTaxes(item.taxes),
        regionalCatalog: normalizeRegionalCatalog(
          item.regional_catalog ?? item.metadata?.regional_catalog
        ),
        marketplace: normalizeMarketplaceSnapshot(
          item.marketplace ?? item.metadata?.marketplace
        ),
      }
    })

    const fallbackSubtotal = normalizedItems.reduce(
      (sum, item) => sum + Number(item.baseUnitPrice || 0) * Number(item.quantity || 0),
      0
    )
    const fallbackDiscount = normalizedItems.reduce(
      (sum, item) => sum + Number(item.discountAmount || 0),
      0
    )
    const fallbackTotal = normalizedItems.reduce(
      (sum, item) => sum + Number(item.lineSubtotal || 0),
      0
    )

    return {
      id: cartData?.id ?? cartData?.cart_id ?? null,
      status: cartData?.status ?? "",
      currency: cartData?.currency ?? "MXN",
      items_count: Number(cartData?.items_count ?? normalizedItems.length),
      subtotal: Number(
        cartData?.subtotal ??
          cartData?.subtotal_snapshot ??
          cartData?.totals?.subtotal ??
          fallbackSubtotal
      ),
      discount: Number(
        cartData?.discount ??
          cartData?.discount_snapshot ??
          cartData?.totals?.discount ??
          fallbackDiscount
      ),
      tax: Number(
        cartData?.tax ?? cartData?.tax_snapshot ?? cartData?.totals?.tax ?? 0
      ),
      tax_breakdown: normalizeTaxBreakdown(
        cartData?.tax_breakdown ?? cartData?.totals?.tax_breakdown
      ),
      total: Number(
        cartData?.total ??
          cartData?.total_snapshot ??
          cartData?.totals?.total ??
          fallbackTotal
      ),
      loyalty: normalizeLoyalty(cartData?.loyalty),
      coupon: normalizeCoupon(cartData?.coupon ?? cartData?.totals?.coupon),
      last_activity_at: cartData?.last_activity_at ?? null,
      promotionsApplied: promotionsApplied.map((promotion) => ({
        id: promotion.id ?? null,
        type: promotion.type ?? "",
        name: promotion.name ?? "Promoción aplicada",
        totalDiscount: Number(
          promotion.total_discount ?? promotion.totalDiscount ?? 0
        ),
        itemsCount: Number(promotion.items_count ?? promotion.itemsCount ?? 0),
        giftUnits: Number(promotion.gift_units ?? promotion.giftUnits ?? 0),
        giftItemUnits: Number(
          promotion.gift_item_units ??
            promotion.giftItemUnits ??
            promotion.snapshot?.gift_item_units ??
            0
        ),
        giftItems: normalizeGiftItems(
          promotion.gift_items ??
            promotion.giftItems ??
            promotion.snapshot?.gift_items
        ),
        giftLineTotal: Number(
          promotion.gift_line_total ?? promotion.giftLineTotal ?? 0
        ),
        snapshot: promotion.snapshot ?? null,
      })),
      regionalSplits: normalizeRegionalSplits(
        cartData?.regional_splits ?? cartData?.regionalSplits ?? cartData?.metadata?.regional_splits
      ),
      items: normalizedItems,
    }
  }, [getCartPayload])
    

  const applyCartResponse = useCallback((payload, options = {}) => {
    const normalized = normalizeCart(payload)

    setCart(normalized)
    setProducts(normalized.items)
    syncCartSummary(normalized)

    if (options.keepSelected) {
      setSelected((prev) =>
        prev.filter((selectedId) =>
          normalized.items.some((item) => item.id === selectedId)
        )
      )
    } else {
      setSelected(normalized.items.map((item) => item.id))
    }

    return normalized
  }, [normalizeCart])

  const fetchCartData = useCallback(async ({ keepSelected = false } = {}) => {
    try {
      setLoading(true)

      const response = await getCart()
      if (DEBUG_RECOVERABLE_CART) {
        console.log("[recoverable-cart][cart] GET /cart response:", response)
      }

      const recoverableOrder = getRecoverableOrder(response)

      if (recoverableOrder && !restoringRecoverableRef.current) {
        restoringRecoverableRef.current = true
        if (DEBUG_RECOVERABLE_CART) {
          console.log("[recoverable-cart][cart] restoring order:", recoverableOrder)
        }

        const restoreResponse = await restoreRecoverableOrderCart({
          order_id: recoverableOrder.id,
          reason: "user_returned_to_cart",
        })
        if (DEBUG_RECOVERABLE_CART) {
          console.log("[recoverable-cart][cart] restore response:", restoreResponse)
        }

        applyCartResponse(restoreResponse, { keepSelected: false })
        notifySuccess(restoreResponse?.message || t("cartRecovered"))
        return
      }

      if (!recoverableOrder && shouldTryImplicitRecover(response) && !restoringRecoverableRef.current) {
        restoringRecoverableRef.current = true
        if (DEBUG_RECOVERABLE_CART) {
          console.log("[recoverable-cart][cart] trying implicit restore without order_id")
        }

        try {
          const restoreResponse = await restoreRecoverableOrderCart({
            reason: "user_returned_to_cart",
          })
          if (DEBUG_RECOVERABLE_CART) {
            console.log("[recoverable-cart][cart] implicit restore response:", restoreResponse)
          }

          if (restoreResponse?.data?.cart) {
            applyCartResponse(restoreResponse, { keepSelected: false })
            notifySuccess(restoreResponse?.message || t("cartRecovered"))
            return
          }
        } catch (restoreError) {
          if (DEBUG_RECOVERABLE_CART) {
            console.log(
              "[recoverable-cart][cart] implicit restore failed:",
              restoreError?.response?.data || restoreError
            )
          }
        }
      }

      applyCartResponse(response, { keepSelected })
    } catch (error) {
      console.error("Error al cargar carrito:", error?.response?.data || error)
      notifyError(
        error?.response?.data?.message ||
          "No fue posible cargar el carrito."
      )
    } finally {
      restoringRecoverableRef.current = false
      setLoading(false)
    }
  }, [applyCartResponse, shouldTryImplicitRecover])

  useEffect(() => {
    fetchCartData()
  }, [fetchCartData])

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)

    if (searchParams.get("recovered") !== "1" || recoveredNoticeShownRef.current) return

    recoveredNoticeShownRef.current = true
    notifySuccess(t("cartRecovered"))
    searchParams.delete("recovered")

    navigate(
      {
        pathname: location.pathname,
        search: searchParams.toString(),
      },
      { replace: true }
    )
  }, [location.pathname, location.search, navigate])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return products

    return products.filter((product) => {
      const searchable = [
        product.name,
        product.brand,
        product.presentation,
        product.sku,
        product.category,
        product.family,
      ]
        .join(" ")
        .toLowerCase()

      return searchable.includes(term)
    })
  }, [products, search])

  const formatMoney = (value) => {
    return new Intl.NumberFormat(getLocaleTag(locale), {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0))
  }

  const getLineTotal = (product) => {
    if (product.lineSubtotal !== null && product.lineSubtotal !== undefined) {
      return Number(product.lineSubtotal || 0)
    }

    return Number(product.price || 0) * Number(product.quantity || 0)
  }

  const getGiftAccountingText = ({ giftUnits, giftUnitAccountingPrice, giftLineTotal }) => {
    const units = Number(giftUnits || 0)

    if (units <= 0) return ""

    const unitPrice = Number(giftUnitAccountingPrice || 0)
    const lineTotal = Number(giftLineTotal || 0)

    return t("cartGiftAccounting", {
      units,
      unitPrice: formatMoney(unitPrice),
      lineTotal: formatMoney(lineTotal),
    })
  }

  const getGiftItemsText = (giftItems = [], giftItemUnits = 0) => {
    const units = Number(giftItemUnits || 0)
    const names = normalizeGiftItems(giftItems)
      .map((item) => item.name)
      .filter(Boolean)

    if (units <= 0 && names.length === 0) return ""

    const unitText = units > 0 ? units : t("cartGiftAvailable")
    const namesText = names.length ? `: ${names.join(", ")}` : ""

    return units > 0
      ? t("cartGiftItems", { units: unitText, names: namesText })
      : `${unitText}${namesText}`
  }

  const handleApplyCashback = async (event) => {
    event.preventDefault()

    const amount = Number(cashbackAmount)

    if (!amount || amount <= 0) {
      notifyWarning(t("validCashbackAmount"))
      return
    }

    try {
      setCashbackLoading(true)
      const response = await applyCartCashback({ amount })
      applyCartResponse(response, { keepSelected: true })
      setCashbackAmount("")
      notifySuccess(response?.message || "Cashback aplicado correctamente.")
    } catch (error) {
      console.error("Error al aplicar cashback:", error?.response?.data || error)
      notifyError(
        error?.response?.data?.message || "No fue posible aplicar el cashback."
      )
    } finally {
      setCashbackLoading(false)
    }
  }

  const handleClearCashback = async () => {
    try {
      setCashbackLoading(true)
      const response = await clearCartCashback()
      applyCartResponse(response, { keepSelected: true })
      setCashbackAmount("")
      notifySuccess(response?.message || "Cashback removido correctamente.")
    } catch (error) {
      console.error("Error al quitar cashback:", error?.response?.data || error)
      notifyError(
        error?.response?.data?.message || "No fue posible quitar el cashback."
      )
    } finally {
      setCashbackLoading(false)
    }
  }

  const handleApplyCoupon = async (event) => {
    event.preventDefault()

    const code = couponCode.trim()

    if (!code) {
      notifyWarning(t("validCouponCode"))
      return
    }

    try {
      setCouponLoading(true)
      const response = await applyCartCoupon({ code })
      const normalized = applyCartResponse(response, { keepSelected: true })
      const nextCoupon = normalized.coupon

      if (nextCoupon?.message) {
        if (nextCoupon.is_valid === false) {
          notifyWarning(nextCoupon.message)
        } else {
          notifySuccess(nextCoupon.message)
        }
      } else {
      notifySuccess(response?.message || t("couponAppliedSuccess"))
      }

      setCouponCode("")
    } catch (error) {
      console.error("Error al aplicar cupón:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || t("couponApplyError"))
      await fetchCartData({ keepSelected: true })
    } finally {
      setCouponLoading(false)
    }
  }

  const handleClearCoupon = async () => {
    try {
      setCouponLoading(true)
      const response = await clearCartCoupon()
      applyCartResponse(response, { keepSelected: true })
      setCouponCode("")
      notifySuccess(response?.message || t("couponRemovedSuccess"))
    } catch (error) {
      console.error("Error al quitar cupón:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || t("couponRemoveError"))
      await fetchCartData({ keepSelected: true })
    } finally {
      setCouponLoading(false)
    }
  }

  const getSelectedGiftItem = (promotion) => {
    return (
      normalizeGiftItems([
        promotion?.snapshot?.selected_gift_item ??
          promotion?.selectedGiftItem ??
          null,
      ])[0] || null
    )
  }

  const getPromotionDisplayGiftItems = (promotion) => {
    const selectedGiftItem = getSelectedGiftItem(promotion)

    if (selectedGiftItem) {
      return {
        giftItems: [selectedGiftItem],
        giftItemUnits: Number(promotion?.giftItemUnits || 1),
        hasSelection: true,
      }
    }

    return {
      giftItems: [],
      giftItemUnits: Number(promotion?.giftItemUnits || 0),
      hasSelection: false,
    }
  }

  const hasGiftProductInCart = (promotion) => {
    const targetProductId = Number(promotion?.snapshot?.target_product_id ?? 0)

    if (targetProductId <= 0) return false

    return products.some((item) => {
      const sameProduct = Number(item.productId) === targetProductId
      const relatedPromotion =
        Number(item.promotion?.id ?? 0) === Number(promotion?.id ?? 0) ||
        item.promotion?.type === "brand_amount_get_product"

      return sameProduct && (Number(item.giftUnits || 0) > 0 || relatedPromotion)
    })
  }

  const setItemLoading = (itemId, isLoading) => {
    setItemLoadingMap((prev) => ({
      ...prev,
      [itemId]: isLoading,
    }))
  }

  const setPromotionLoading = (promotionId, action, isLoading) => {
    const key = `${promotionId}:${action}`

    setPromotionLoadingMap((prev) => ({
      ...prev,
      [key]: isLoading,
    }))
  }

  const isPromotionLoading = (promotionId, action) =>
    Boolean(promotionLoadingMap[`${promotionId}:${action}`])

  const sanitizeQuantityInput = (value) => {
    const cleanValue = String(value).replace(/[^0-9.]/g, "")
    const parts = cleanValue.split(".")

    if (parts.length <= 2) {
      return cleanValue
    }

    return `${parts[0]}.${parts.slice(1).join("")}`
  }

  const handleQuantityInput = (id, value) => {
    const normalizedValue = sanitizeQuantityInput(value)

    setProducts((prev) =>
      prev.map((product) => {
        if (product.id !== id) return product

        return {
          ...product,
          quantity: normalizedValue,
        }
      })
    )
  }

  const commitQuantityChange = async (product) => {
    const rawValue = product?.quantity

    if (rawValue === "") {
      notifyWarning(t("quantityEmpty"))
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Number(product.quantity || 0) || 1 }
            : item
        )
      )
      return
    }

    const parsed = Number(rawValue)

    if (Number.isNaN(parsed)) {
      notifyWarning(t("quantityInvalid"))
      await fetchCartData({ keepSelected: true })
      return
    }

    if (parsed <= 0) {
      await handleRemoveItem(product.id)
      return
    }

    try {
      setItemLoading(product.id, true)

      const response = await updateCartItem(product.id, {
        quantity: parsed,
      })

      applyCartResponse(response, { keepSelected: true })
      notifySuccess(response?.message || "Cantidad actualizada correctamente.")
    } catch (error) {
      console.error(
        "Error al actualizar cantidad:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          "No fue posible actualizar la cantidad."
      )
      await fetchCartData({ keepSelected: true })
    } finally {
      setItemLoading(product.id, false)
    }
  }

  const updateQuantityByDelta = async (product, delta) => {
    const current = Number(product.quantity || 0)
    const nextQuantity = +(current + delta).toFixed(2)

    if (nextQuantity <= 0) {
      await handleRemoveItem(product.id)
      return
    }

    try {
      setItemLoading(product.id, true)

      const response = await updateCartItem(product.id, {
        quantity: nextQuantity,
      })

      applyCartResponse(response, { keepSelected: true })
    } catch (error) {
      console.error(
        "Error al actualizar cantidad:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          "No fue posible actualizar la cantidad."
      )
      await fetchCartData({ keepSelected: true })
    } finally {
      setItemLoading(product.id, false)
    }
  }

  const handleRemoveItem = async (id) => {
    try {
      setItemLoading(id, true)

      const response = await removeCartItem(id)
      applyCartResponse(response, { keepSelected: true })
      notifySuccess(response?.message || "Producto eliminado del carrito.")
    } catch (error) {
      console.error(
        "Error al eliminar producto:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          "No fue posible eliminar el producto."
      )
    } finally {
      setItemLoading(id, false)
    }
  }

  const handleClearCart = async () => {
    if (!products.length) {
      notifyWarning(t("cartEmptyTitle"))
      return
    }

    try {
      setProcessingClear(true)

      const response = await clearCart()
      applyCartResponse(response, { keepSelected: false })
      notifySuccess(response?.message || t("cartClearSuccess"))
    } catch (error) {
      console.error("Error al vaciar carrito:", error?.response?.data || error)
      notifyError(
        error?.response?.data?.message ||
          "No fue posible vaciar el carrito."
      )
    } finally {
      setProcessingClear(false)
    }
  }

  const handleRemoveSelected = async () => {
    if (!selected.length) {
      notifyWarning(t("cartSelectAtLeastOne"))
      return
    }

    try {
      setProcessingRemoveSelected(true)

      for (const itemId of selected) {
        await removeCartItem(itemId)
      }

      await fetchCartData({ keepSelected: false })
      notifySuccess(t("cartRemoveSelectedSuccess"))
    } catch (error) {
      console.error(
        "Error al eliminar seleccionados:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          t("cartRemoveSelectedError")
      )
      await fetchCartData({ keepSelected: true })
    } finally {
      setProcessingRemoveSelected(false)
    }
  }

  const handleSelectPromotionGift = async (promotionId, giftItemId) => {
    try {
      setPromotionLoading(promotionId, "select-gift", true)

      const response = await selectCartPromotionGift(promotionId, {
        gift_item_id: giftItemId,
      })

      notifySuccess(response?.message || t("cartGiftChosen"))
      await fetchCartData({ keepSelected: true })
    } catch (error) {
      console.error(
        "Error al seleccionar regalo de promoción:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          "No fue posible seleccionar el regalo."
      )
    } finally {
      setPromotionLoading(promotionId, "select-gift", false)
    }
  }

  const handleClearPromotionGiftSelection = async (promotionId) => {
    try {
      setPromotionLoading(promotionId, "clear-gift", true)

      const response = await clearCartPromotionGiftSelection(promotionId)

      notifySuccess(
        response?.message || t("giftSelectionCleared")
      )
      await fetchCartData({ keepSelected: true })
    } catch (error) {
      console.error(
        "Error al limpiar selección de regalo:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          t("giftSelectionClearError")
      )
    } finally {
      setPromotionLoading(promotionId, "clear-gift", false)
    }
  }

  const handleAddPromotionGiftProduct = async (promotionId) => {
    try {
      setPromotionLoading(promotionId, "add-gift-product", true)

      const response = await addCartPromotionGiftProduct(promotionId)

      notifySuccess(
        response?.message || "SKU de regalo agregado al carrito correctamente."
      )
      await fetchCartData({ keepSelected: true })
    } catch (error) {
      console.error(
        "Error al agregar SKU de regalo:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          "No fue posible agregar el SKU de regalo."
      )
    } finally {
      setPromotionLoading(promotionId, "add-gift-product", false)
    }
  }

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredProducts.map((product) => product.id)
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selected.includes(id))

    if (allVisibleSelected) {
      setSelected((prev) => prev.filter((id) => !visibleIds.includes(id)))
      return
    }

    setSelected((prev) => [...new Set([...prev, ...visibleIds])])
  }

  const totalPieces = useMemo(() => {
    return products.reduce((acc, product) => {
      const qty = Number(product.quantity || 0)
      return acc + (Number.isNaN(qty) ? 0 : qty)
    }, 0)
  }, [products])

  const allVisibleSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((product) => selected.includes(product.id))

  const hasPendingGiftSelection = cart.promotionsApplied.some((promotion) => {
    if (promotion.type !== "brand_amount_choose_gift_item") return false
    if (!promotion.snapshot?.selection_required) return false

    return !getSelectedGiftItem(promotion)
  })
  const hasInvalidStockItems = products.some((product) => {
    return product.status === "unavailable" || product.stock?.is_valid === false
  })

  const handleCheckoutNavigation = (event) => {
    if (hasInvalidStockItems) {
      event.preventDefault()
      notifyWarning(t("checkoutStockWarning"))
      return
    }

    if (!hasPendingGiftSelection) return

    event.preventDefault()
    notifyWarning(t("cartGiftChoosePending"))
  }

  if (loading) {
    return (
      <div className="cart_page">
        <div className="cart_shell">
          <div className="cart_empty">
            <h3>{t("cartLoadingTitle")}</h3>
            <p>{t("cartLoadingText")}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cart_page">
      <div className="cart_shell">
        <header className="cart_header">
          <div className="cart_header_left">
            <h1 className="cart_title">{t("cart")}</h1>
            <p className="cart_meta">
              {t("cartAddedProductsMeta", {
                products: products.length,
                pieces: totalPieces.toFixed(2),
              })}
            </p>
          </div>

          <div className="cart_header_actions">
            <button
              type="button"
              className="btn btn_secondary"
              onClick={handleClearCart}
              disabled={!products.length || processingClear}
            >
              {processingClear ? t("cartClearing") : t("cartClear")}
            </button>

            <button
              type="button"
              className="btn btn_secondary"
              onClick={handleRemoveSelected}
              disabled={!selected.length || processingRemoveSelected}
            >
              {processingRemoveSelected
                ? t("cartRemoving")
                : t("cartRemoveSelection")}
            </button>

            <Link to="/carrito/excel" className="btn btn_secondary">
              {t("cartProcessOrder")}
            </Link>
          </div>
        </header>

        <div className="cart_tools">
          <div className="cart_search">
            <input
              type="text"
              placeholder={t("cartSearchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="cart_tools_info">
            {search.trim() ? (
              <span>
                {t("cartShowingProducts", {
                  shown: filteredProducts.length,
                  total: products.length,
                })}
              </span>
            ) : (
              <span>{t("cartQuickWholesaleOrder")}</span>
            )}
          </div>
        </div>

        {!products.length ? (
          <div className="cart_empty cart_empty--full">
            <h3>{t("cartEmptyTitle")}</h3>
            <p>{t("cartEmptyText")}</p>

            <div className="cart_empty_actions">
              <Link to="/productos" className="btn btn_primary">
                {t("cartGoToProducts")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="cart_layout">
            <section className="cart_main">
              <div className="cart_group_card">
                <div className="cart_group_head">
                  <label className="group_checkbox">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                    />
                    <span className="group_title">{t("products")}</span>
                  </label>

                  <span className="group_count">({filteredProducts.length})</span>
                </div>

                <div className="cart_rows">
                  {filteredProducts.length === 0 ? (
                    <div className="cart_empty">
                      <h3>{t("cartNoProductsFound")}</h3>
                      <p>{t("cartNoProductsFoundText")}</p>
                    </div>
                  ) : (
                    filteredProducts.map((product) => {
                      const isItemLoading = Boolean(itemLoadingMap[product.id])

                      return (
                        <article className="cart_item" key={product.id}>
                          <div className="cart_item_check">
                            <input
                              type="checkbox"
                              checked={selected.includes(product.id)}
                              onChange={() => toggleSelect(product.id)}
                              aria-label={t("cartSelectProduct", { name: product.name })}
                              disabled={isItemLoading}
                            />
                          </div>

                          <div className="cart_item_image">
                            <img src={product.image} alt={product.name} />
                          </div>

                          <div className="cart_item_main">
                            <div className="cart_item_top">
                              <div className="cart_item_info">
                                <h3 className="cart_item_name">{product.name}</h3>

                                <p className="cart_item_meta">
                                  {product.brand}
                                  {product.presentation ? ` · ${product.presentation}` : ""}
                                </p>

                                {product.selectedAttributes.length ? (
                                  <p className="cart_item_meta">
                                    {formatSelectedAttributes(product.selectedAttributes)}
                                  </p>
                                ) : null}

                                {product.regionalCatalog?.region_name || product.regionalCatalog?.region_slug ? (
                                  <p className="cart_item_meta cart_item_meta--regional">
                                    {t("cartRegionalSource", {
                                      region:
                                        product.regionalCatalog.region_name ||
                                        product.regionalCatalog.region_slug,
                                    })}
                                  </p>
                                ) : null}

                                {product.promotion ? (
                                  <div className="cart_item_promo_badge is-applied">
                                    {t("cartAppliedPromotion")}: {product.promotion.name || t("currentPromotion")}
                                  </div>
                                ) : null}

                                <CartScalePromotion product={product} t={t} />

                                {product.stock?.is_valid === false ? (
                                  <div className="cart_item_stock_alert">
                                    {product.stock.message || t("cartInsufficientStock")}
                                  </div>
                                ) : null}

                                {product.giftUnits > 0 ? (
                                  <div className="cart_item_gift_note">
                                    {getGiftAccountingText(product)}
                                  </div>
                                ) : null}

                                {product.giftItemUnits > 0 ||
                                product.giftItems.length > 0 ? (
                                  <div className="cart_item_gift_note cart_item_gift_note--items">
                                    {getSelectedGiftItem(product.promotion ?? product)
                                      ? `${t("cartGiftSelected")}: ${getGiftItemsText(
                                          [getSelectedGiftItem(product.promotion ?? product)],
                                          product.giftItemUnits
                                        )}`
                                      : t("cartGiftPending", { count: Number(product.giftItemUnits || 0) })}
                                  </div>
                                ) : null}

                                {Array.isArray(product.availablePromotions) &&
                                product.availablePromotions.length > 0 ? (
                                  <div className="cart_item_available_promos">
                                    {product.availablePromotions.map((promo, index) => {
                                      const promoGiftItems = normalizeGiftItems(
                                        promo.gift_items ??
                                          promo.giftItems ??
                                          promo.snapshot?.gift_items
                                      )
                                      const promoGiftItemUnits = Number(
                                        promo.gift_item_units ??
                                          promo.giftItemUnits ??
                                          promo.snapshot?.gift_item_units ??
                                          0
                                      )

                                      return (
                                        <div
                                          key={promo.id ?? `promo-${product.id}-${index}`}
                                          className={`cart_item_available_promo ${
                                            promo.is_eligible_now ? "is-ready" : "is-pending"
                                          }`}
                                        >
                                          <strong>{promo.name || t("currentPromotion")}</strong>

                                          <span>
                                            {promo.progress_message ||
                                              promo.message ||
                                              t("choosePromotionProduct")}
                                          </span>

                                          {promoGiftItemUnits > 0 ||
                                          promoGiftItems.length > 0 ? (
                                            <small>
                                              {getGiftItemsText(
                                                promoGiftItems,
                                                promoGiftItemUnits
                                              )}
                                            </small>
                                          ) : null}
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : null}
                              </div>

                              <div className="cart_item_price_block">
                                {product.oldPrice ? (
                                  <div className="cart_item_old_price">
                                    {formatMoney(product.oldPrice)}
                                  </div>
                                ) : null}

                                <div className="cart_item_price">
                                  {t("cartUnitPrice")} {formatMoney(product.price)}
                                </div>

                                {product.discount > 0 ? (
                                  <div className="cart_item_discount">
                                    {product.discount}% OFF
                                  </div>
                                ) : null}

                                {product.discountAmount > 0 ? (
                                  <div className="cart_item_discount_amount">
                                    {t("savings")} {formatMoney(product.discountAmount)}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="cart_item_bottom">
                              <div className="cart_item_qty_area">
                                <div className="qty_control">
                                  <button
                                    type="button"
                                    className="qty_btn"
                                    onClick={() => updateQuantityByDelta(product, -1)}
                                    disabled={isItemLoading}
                                  >
                                    -
                                  </button>

                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={product.quantity}
                                    onChange={(e) =>
                                      handleQuantityInput(product.id, e.target.value)
                                    }
                                    onBlur={() => commitQuantityChange(product)}
                                    disabled={isItemLoading}
                                  />

                                  <button
                                    type="button"
                                    className="qty_btn"
                                    onClick={() => updateQuantityByDelta(product, 1)}
                                    disabled={isItemLoading}
                                  >
                                    +
                                  </button>
                                </div>

                                <span className="cart_item_available">
                                  {product.stock?.is_valid === false
                                    ? t("cartInsufficientStock")
                                    : product.status === "active"
                                    ? t("cartAvailable")
                                    : t("cartReviewAvailability")}
                                </span>
                              </div>

                              <div className="cart_item_actions">
                                <button type="button" className="item_action_btn" disabled>
                                  {t("cartSaveList")}
                                </button>

                                <button
                                  type="button"
                                  className="item_action_btn delete"
                                  onClick={() => handleRemoveItem(product.id)}
                                  disabled={isItemLoading}
                                >
                                  {isItemLoading ? t("cartRemoving") : t("cartRemove")}
                                </button>
                              </div>

                              <div className="cart_item_subtotal">
                                <span className="cart_item_subtotal_label">
                                  {t("subtotal")}
                                </span>
                                <strong>{formatMoney(getLineTotal(product))}</strong>
                              </div>
                            </div>
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </div>
            </section>

            <aside className="cart_sidebar">
              <div className="summary_card">
                <h2 className="summary_title">{t("orderSummary")}</h2>

                {Array.isArray(cart.promotionsApplied) && cart.promotionsApplied.length > 0 ? (
                <div className="summary_promotions">
                  {cart.promotionsApplied.map((promotion, index) => {
                    const giftOptions = normalizeGiftItems(
                      promotion.snapshot?.gift_items ?? promotion.giftItems
                    )
                    const selectedGiftItem = getSelectedGiftItem(promotion)
                    const brandSubtotal = Number(
                      promotion.snapshot?.brand_subtotal ?? 0
                    )
                    const minimumAmount = Number(
                      promotion.snapshot?.minimum_amount ?? 0
                    )
                    const targetProductAdded = hasGiftProductInCart(promotion)
                    const selectingGift = isPromotionLoading(
                      promotion.id,
                      "select-gift"
                    )
                    const clearingGift = isPromotionLoading(
                      promotion.id,
                      "clear-gift"
                    )
                    const addingGiftProduct = isPromotionLoading(
                      promotion.id,
                      "add-gift-product"
                    )

                    return (
                      <div
                        className="summary_promotion_item"
                        key={promotion.id ?? `promotion-${index}`}
                      >
                        <strong>{promotion.name || t("cartAppliedPromotion")}</strong>

                        {promotion.totalDiscount > 0 ? (
                          <span>{t("savings")} {formatMoney(promotion.totalDiscount)}</span>
                        ) : null}

                        {brandSubtotal > 0 && minimumAmount > 0 ? (
                          <span>
                            Marca {promotion.snapshot?.brand || "-"}:{" "}
                            {formatMoney(brandSubtotal)} de {formatMoney(minimumAmount)}
                          </span>
                        ) : null}

                        {promotion.giftUnits > 0 ? (
                          <span>
                            {getGiftAccountingText({
                              giftUnits: promotion.giftUnits,
                              giftUnitAccountingPrice:
                                promotion.snapshot?.gift_unit_accounting_price,
                              giftLineTotal: promotion.giftLineTotal,
                            })}
                          </span>
                        ) : null}

                        {(() => {
                          const displayGift = getPromotionDisplayGiftItems(promotion)

                          return displayGift.giftItemUnits > 0 ? (
                            <span>
                              {displayGift.hasSelection
                                ? `${t("cartGiftSelected")}: ${getGiftItemsText(
                                    displayGift.giftItems,
                                    displayGift.giftItemUnits
                                  )}`
                                : t("cartGiftPending", { count: displayGift.giftItemUnits })}
                            </span>
                          ) : null
                        })()}

                        {promotion.type === "brand_amount_choose_gift_item" ? (
                          <div className="summary_promotion_interactive">
                            {selectedGiftItem ? (
                              <div className="summary_selected_gift">
                                {selectedGiftItem.imageUrl ? (
                                  <img
                                    src={normalizeMediaUrl(selectedGiftItem.imageUrl)}
                                    alt={selectedGiftItem.name}
                                  />
                                ) : (
                                  <div className="summary_selected_gift_placeholder">
                                    {t("gift")}
                                  </div>
                                )}

                                <div>
                                  <span className="summary_selected_gift_label">
                                    {t("cartSelectedGiftLabel")}
                                  </span>
                                  <strong>{selectedGiftItem.name}</strong>
                                  {selectedGiftItem.code ? (
                                    <small>{selectedGiftItem.code}</small>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <small className="summary_promotion_alert">
                                {t("cartChooseGift")}
                              </small>
                            )}

                            {giftOptions.length > 0 ? (
                              <div className="summary_gift_options">
                                {giftOptions.map((giftItem) => {
                                  const isSelected =
                                    Number(promotion.snapshot?.selected_gift_item_id ?? 0) ===
                                    Number(giftItem.id)

                                  return (
                                    <button
                                      key={giftItem.id}
                                      type="button"
                                      className={`summary_gift_option ${
                                        isSelected ? "is-selected" : ""
                                      }`}
                                      onClick={() =>
                                        handleSelectPromotionGift(
                                          promotion.id,
                                          giftItem.id
                                        )
                                      }
                                      disabled={selectingGift || clearingGift}
                                    >
                                      {giftItem.imageUrl ? (
                                        <img
                                          src={normalizeMediaUrl(giftItem.imageUrl)}
                                          alt={giftItem.name}
                                        />
                                      ) : (
                                        <div className="summary_gift_option_placeholder">
                                          {t("gift")}
                                        </div>
                                      )}

                                      <span>{giftItem.name}</span>
                                      {giftItem.unitLabel ? (
                                        <small>{giftItem.unitLabel}</small>
                                      ) : null}
                                    </button>
                                  )
                                })}
                              </div>
                            ) : null}

                            <div className="summary_promotion_actions_inline">
                              {selectedGiftItem ? (
                                <button
                                  type="button"
                                  className="btn btn_secondary summary_promotion_button"
                                  onClick={() =>
                                    handleClearPromotionGiftSelection(promotion.id)
                                  }
                                  disabled={selectingGift || clearingGift}
                                >
                                  {clearingGift ? t("cartRemovingSelection") : t("cartRemoveGiftSelection")}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {promotion.type === "brand_amount_get_product" ? (
                          <div className="summary_promotion_interactive">
                            <small>
                              {t("cartGiftSku", {
                                sku: promotion.snapshot?.target_product_id || "-",
                                quantity: promotion.snapshot?.target_quantity || 0,
                              })}
                            </small>

                            {targetProductAdded ? (
                              <small className="summary_promotion_success">
                                {t("cartGiftSkuAdded")}
                              </small>
                            ) : (
                              <button
                                type="button"
                                className="btn btn_secondary summary_promotion_button"
                                onClick={() =>
                                  handleAddPromotionGiftProduct(promotion.id)
                                }
                                disabled={addingGiftProduct}
                              >
                                {addingGiftProduct ? t("cartAddingGift") : t("cartAddGift")}
                              </button>
                            )}
                          </div>
                        ) : null}

                        {promotion.snapshot?.accounting_note ? (
                          <small>{promotion.snapshot.accounting_note}</small>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}

                <CartLoyaltySummary
                  loyalty={cart.loyalty}
                  cashbackAmount={cashbackAmount}
                  cashbackLoading={cashbackLoading}
                  onCashbackAmountChange={setCashbackAmount}
                  onApplyCashback={handleApplyCashback}
                  onClearCashback={handleClearCashback}
                  formatMoney={formatMoney}
                  t={t}
                />

                <CartCouponBox
                  coupon={cart.coupon}
                  couponCode={couponCode}
                  couponLoading={couponLoading}
                  onCouponCodeChange={setCouponCode}
                  onApplyCoupon={handleApplyCoupon}
                  onClearCoupon={handleClearCoupon}
                  formatMoney={formatMoney}
                  t={t}
                />

                <RegionalSplitsSummary
                  splits={cart.regionalSplits}
                  formatMoney={formatMoney}
                  t={t}
                />

                <div className="summary_rows">
                  <div className="summary_row">
                    <span>{t("products")} ({cart.items_count || products.length})</span>
                    <span>{formatMoney(cart.subtotal)}</span>
                  </div>

                  <div className="summary_row">
                    <span>{t("discount")}</span>
                    <span>
                      {cart.discount > 0
                        ? `- ${formatMoney(cart.discount)}`
                        : formatMoney(0)}
                    </span>
                  </div>

                  <div className="summary_row">
                    <span>{t("tax")}</span>
                    <span>{formatMoney(cart.tax)}</span>
                  </div>

                </div>

                <div className="summary_total">
                  <span>{t("total")}</span>
                  <strong>{formatMoney(cart.total)}</strong>
                </div>

                <div className="summary_actions">
                  <Link
                    to="/checkout"
                    className={`btn btn_primary ${
                      hasPendingGiftSelection || hasInvalidStockItems ? "is-disabled" : ""
                    }`}
                    onClick={handleCheckoutNavigation}
                    aria-disabled={hasPendingGiftSelection || hasInvalidStockItems}
                  >
                    {t("cartContinueCheckout")}
                  </Link>

                  <Link to="/productos" className="btn btn_ghost">
                    {t("continueShopping")}
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {products.length ? (
        <div className="cart_mobile_bar">
          <div className="cart_mobile_bar_info">
            <span className="mobile_bar_label">{t("total")}</span>
            <strong className="mobile_bar_total">{formatMoney(cart.total)}</strong>
          </div>

          <Link
            to="/checkout"
            className={`btn btn_primary mobile_checkout_btn ${
              hasPendingGiftSelection || hasInvalidStockItems ? "is-disabled" : ""
            }`}
            onClick={handleCheckoutNavigation}
            aria-disabled={hasPendingGiftSelection || hasInvalidStockItems}
          >
            Checkout
          </Link>
        </div>
      ) : null}
    </div>
  )
}

function normalizeGiftItems(items) {
  if (!Array.isArray(items)) return []

  return items
    .filter(Boolean)
    .map((item) => ({
      id: item.id ?? item.gift_item_id ?? item.code ?? item.name,
      name: item.name ?? "Artículo de regalo",
      code: item.code ?? "",
      description: item.description ?? "",
      imageUrl: item.image_url ?? item.imageUrl ?? "",
      estimatedValue: item.estimated_value ?? item.estimatedValue ?? null,
      unitLabel: item.unit_label ?? item.unitLabel ?? "",
    }))
}

function normalizeSelectedAttributes(attributes) {
  if (!Array.isArray(attributes)) return []

  return attributes
    .filter(Boolean)
    .map((attribute) => ({
      attribute: attribute.attribute ?? attribute.name ?? "",
      value: attribute.value ?? "",
    }))
    .filter((attribute) => attribute.attribute && attribute.value)
}

function formatSelectedAttributes(attributes = []) {
  return attributes.map((attribute) => `${attribute.attribute}: ${attribute.value}`).join(" / ")
}

function normalizeCartItemImage(item = {}) {
  const rawImage =
    item.image_url ||
    item.image_path ||
    item.image ||
    item.image_snapshot ||
    item.product?.image_url ||
    item.product?.image_path ||
    item.product?.image ||
    item.product?.main_image_url ||
    item.product?.media_url ||
    item.product?.media_path ||
    ""

  return normalizeMediaUrl(rawImage) || "https://via.placeholder.com/400x400?text=Producto"
}

function normalizeCartItemStock(item = {}) {
  const stock = item.stock

  if (stock && typeof stock === "object") {
    const rawAvailableStock =
      stock.available_stock ??
      stock.availableStock ??
      item.available_stock ??
      item.stock_available ??
      item.product?.stock ??
      null
    const hasAvailableStockValue =
      rawAvailableStock !== null && rawAvailableStock !== undefined && rawAvailableStock !== ""
    const availableStock = hasAvailableStockValue ? Number(rawAvailableStock) : null
    const requestedQuantity = Number(stock.requested_quantity ?? item.quantity ?? 0)
    const isValid =
      stock.is_valid === false
        ? false
        : hasAvailableStockValue
        ? Number.isFinite(availableStock) && availableStock > 0 && requestedQuantity <= availableStock
        : true

    return {
      is_tracked: true,
      is_valid: isValid,
      available_stock: Number.isFinite(availableStock) ? availableStock : null,
      requested_quantity: requestedQuantity,
      message:
        stock.message ||
        item.stock_message ||
        item.product?.stock_message ||
        (Number(availableStock || 0) <= 0
          ? "Producto sin inventario disponible."
          : `Solo hay ${availableStock} pieza(s) disponibles.`),
    }
  }

  const rawAvailableStock =
    stock ??
    item.available_stock ??
    item.stock_available ??
    item.product?.stock ??
    null

  if (rawAvailableStock === null || rawAvailableStock === undefined || rawAvailableStock === "") {
    return null
  }

  const availableStock =
    Number(rawAvailableStock)
  const requestedQuantity = Number(item.quantity ?? 0)
  const isValid = Number.isFinite(availableStock) && requestedQuantity <= availableStock && availableStock > 0

  return {
    is_tracked: true,
    is_valid: isValid,
    available_stock: Number.isFinite(availableStock) ? availableStock : 0,
    requested_quantity: requestedQuantity,
    message:
      item.stock_message ||
      item.product?.stock_message ||
      (availableStock <= 0
        ? "Producto sin inventario disponible."
        : `Solo hay ${availableStock} pieza(s) disponibles.`),
  }
}

function normalizeTaxes(taxes) {
  if (!Array.isArray(taxes)) return []

  return taxes.filter(Boolean).map((tax) => ({
    impuesto_art_id: tax.impuesto_art_id ?? null,
    impuesto_id: tax.impuesto_id ?? null,
    nombre: tax.nombre ?? "",
    pctje_impuesto: Number(tax.pctje_impuesto ?? 0),
    importe: Number(tax.importe ?? 0),
  }))
}

function normalizeTaxBreakdown(taxBreakdown) {
  const items = Array.isArray(taxBreakdown?.items) ? taxBreakdown.items : []

  return {
    total: Number(taxBreakdown?.total ?? 0),
    items: items.filter(Boolean).map((item) => ({
      cart_item_id: item.cart_item_id ?? item.id ?? null,
      product_id: item.product_id ?? null,
      taxable_base: Number(item.taxable_base ?? 0),
      tax_amount: Number(item.tax_amount ?? item.tax ?? 0),
      taxes: normalizeTaxes(item.taxes),
    })),
  }
}

function normalizeRegionalCatalog(value) {
  if (!value || typeof value !== "object") return null

  return {
    region_id: value.region_id ?? null,
    region_name: value.region_name || "",
    region_slug: value.region_slug || "",
    price: Number(value.price ?? 0),
    stock: value.stock === null || value.stock === undefined ? null : Number(value.stock),
    commission_rate: Number(value.commission_rate ?? 0),
  }
}

function normalizeMarketplaceSnapshot(value) {
  if (!value || typeof value !== "object") return null

  return {
    region_id: value.region_id ?? null,
    commission_rate: Number(value.commission_rate ?? 0),
    commission_amount: Number(value.commission_amount ?? 0),
    net_amount: Number(value.net_amount ?? 0),
    line_total: Number(value.line_total ?? 0),
  }
}

function normalizeRegionalSplits(splits) {
  if (!Array.isArray(splits)) return []

  return splits
    .filter(Boolean)
    .map((split) => ({
      region_id: split.region_id ?? null,
      region_name: split.region_name || "",
      region_slug: split.region_slug || "",
      items_count: Number(split.items_count ?? 0),
      subtotal: Number(split.subtotal ?? 0),
      commission_amount: Number(split.commission_amount ?? 0),
      net_amount: Number(split.net_amount ?? 0),
    }))
}

function normalizeLoyalty(loyalty) {
  if (!loyalty || typeof loyalty !== "object") return null

  return {
    firstPurchaseDiscount: {
      enabled: Boolean(loyalty.first_purchase_discount?.enabled),
      eligible: Boolean(loyalty.first_purchase_discount?.eligible),
      percentage: Number(loyalty.first_purchase_discount?.percentage ?? 0),
      amount: Number(loyalty.first_purchase_discount?.amount ?? 0),
    },
    cashback: {
      availableBalance: Number(loyalty.cashback?.available_balance ?? 0),
      maxRedeemable: Number(loyalty.cashback?.max_redeemable ?? 0),
      appliedAmount: Number(loyalty.cashback?.applied_amount ?? 0),
      earn: {
        enabled: Boolean(loyalty.cashback?.earn?.enabled),
        percentage: Number(loyalty.cashback?.earn?.percentage ?? 0),
        amount: Number(loyalty.cashback?.earn?.amount ?? 0),
      },
    },
  }
}

function normalizeCoupon(coupon) {
  if (!coupon || typeof coupon !== "object") return null

  return {
    id: coupon.id ?? null,
    code: coupon.code ?? "",
    name: coupon.name ?? "",
    discountType: coupon.discount_type ?? "",
    discountValue: Number(coupon.discount_value ?? 0),
    discountAmount: Number(coupon.discount_amount ?? 0),
    is_valid: coupon.is_valid !== false,
    message: coupon.message ?? "",
  }
}

function hasRecentStripeSuccessReturn() {
  try {
    const raw = sessionStorage.getItem(STRIPE_SUCCESS_RETURN_STORAGE_KEY)
    if (!raw) return false

    const data = JSON.parse(raw)
    const timestamp = Number(data?.timestamp || 0)
    const fifteenMinutes = 15 * 60 * 1000

    return Boolean(timestamp && Date.now() - timestamp < fifteenMinutes)
  } catch {
    return false
  }
}

function CartCouponBox({
  coupon,
  couponCode,
  couponLoading,
  onCouponCodeChange,
  onApplyCoupon,
  onClearCoupon,
  formatMoney,
  t,
}) {
  return (
    <div className={`summary_coupon ${coupon ? "has-coupon" : ""} ${coupon?.is_valid === false ? "is-invalid" : ""}`}>
      <div className="summary_coupon_head">
        <i className="bi bi-ticket-perforated" aria-hidden="true" />
        <div>
          <strong>{t("cartCouponTitle")}</strong>
          <span>{coupon ? coupon.message || t("cartCouponApplied") : t("cartCouponCodePrompt")}</span>
        </div>
      </div>

      {coupon ? (
        <div className="summary_coupon_applied">
          <div>
            <strong>{coupon.code}</strong>
            {coupon.name ? <span>{coupon.name}</span> : null}
          </div>
          <div className="summary_coupon_amount">
            <strong>-{formatMoney(coupon.discountAmount)}</strong>
            {coupon.is_valid === false ? <span>{t("cartInvalidCoupon")}</span> : null}
          </div>
          <button
            type="button"
            className="summary_coupon_clear"
            onClick={onClearCoupon}
            disabled={couponLoading}
          >
            {couponLoading ? t("cartRemovingSelection") : t("cartRemoveCoupon")}
          </button>
        </div>
      ) : (
        <form className="summary_coupon_form" onSubmit={onApplyCoupon}>
          <input
            type="text"
            value={couponCode}
            onChange={(event) => onCouponCodeChange(event.target.value.toUpperCase())}
            placeholder="VERANO10"
            disabled={couponLoading}
          />
          <button type="submit" disabled={couponLoading}>
            {couponLoading ? t("cartApplying") : t("cartApplyCoupon")}
          </button>
        </form>
      )}
    </div>
  )
}

function CartLoyaltySummary({
  loyalty,
  cashbackAmount,
  cashbackLoading,
  onCashbackAmountChange,
  onApplyCashback,
  onClearCashback,
  formatMoney,
  t,
}) {
  if (!loyalty) return null

  const firstPurchase = loyalty.firstPurchaseDiscount
  const cashback = loyalty.cashback
  const canRedeem = cashback.availableBalance > 0 && cashback.maxRedeemable > 0

  if (
    !firstPurchase?.enabled &&
    !cashback?.earn?.enabled &&
    !cashback?.availableBalance &&
    !cashback?.appliedAmount
  ) {
    return null
  }

  return (
    <div className="summary_loyalty">
      <div className="summary_loyalty_head">
        <i className="bi bi-stars" aria-hidden="true" />
        <div>
          <strong>{t("loyalty")}</strong>
          <span>{t("loyaltyBenefits")}</span>
        </div>
      </div>

      {firstPurchase.enabled ? (
        <div className="summary_loyalty_row">
          <span>
            {t("firstPurchase")} {firstPurchase.eligible ? t("active") : t("notAvailable")}
            {firstPurchase.percentage > 0 ? ` · ${firstPurchase.percentage}%` : ""}
          </span>
          <strong>
            {firstPurchase.amount > 0 ? `- ${formatMoney(firstPurchase.amount)}` : formatMoney(0)}
          </strong>
        </div>
      ) : null}

      {cashback.earn.enabled ? (
        <div className="summary_loyalty_row">
        <span>{t("cashbackEarn")} · {cashback.earn.percentage}%</span>
          <strong>{formatMoney(cashback.earn.amount)}</strong>
        </div>
      ) : null}

      <div className="summary_loyalty_row">
        <span>{t("cashbackAvailable")}</span>
        <strong>{formatMoney(cashback.availableBalance)}</strong>
      </div>

      {cashback.appliedAmount > 0 ? (
        <div className="summary_loyalty_row is-applied">
          <span>{t("cashbackApplied")}</span>
          <strong>- {formatMoney(cashback.appliedAmount)}</strong>
        </div>
      ) : null}

      {canRedeem ? (
        <form className="summary_cashback_form" onSubmit={onApplyCashback}>
          <label>
            <span>{t("cashback")}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cashbackAmount}
              onChange={(event) => onCashbackAmountChange(event.target.value)}
              placeholder={String(Math.min(cashback.availableBalance, cashback.maxRedeemable))}
              disabled={cashbackLoading}
            />
          </label>

          <button type="submit" className="btn btn_secondary" disabled={cashbackLoading}>
            {cashbackLoading ? t("cartApplying") : t("cartApplyCoupon")}
          </button>

          {cashback.appliedAmount > 0 ? (
            <button
              type="button"
              className="btn btn_ghost"
              onClick={onClearCashback}
              disabled={cashbackLoading}
            >
              {t("cartRemoveCoupon")}
            </button>
          ) : null}
        </form>
      ) : null}
    </div>
  )
}

function CartScalePromotion({ product, t }) {
  const scalePromotion = getCartScalePromotion(product)

  if (!scalePromotion) return null

  const currentQuantity = Number(product.quantity || 0)
  const currentScale = getCurrentScale(scalePromotion.scales, currentQuantity)
  const futureScales = scalePromotion.scales.filter((scale) => {
    if (!currentScale) return scale.from_quantity > currentQuantity
    return scale.from_quantity > currentScale.from_quantity
  })

  return (
    <div className="cart_item_scale_promo">
      <div className="cart_item_scale_promo_head">
        <strong>{scalePromotion.name || t("wholesaleScales")}</strong>
        {currentScale ? (
          <span>{t("cartScaleApplied")}</span>
        ) : (
          <span>{t("cartScaleAvailable")}</span>
        )}
      </div>

      <div className="cart_item_scale_list">
        {scalePromotion.scales.map((scale, index) => {
          const isCurrent = currentScale && isSameScale(scale, currentScale)
          const isPast = currentScale && scale.from_quantity < currentScale.from_quantity

          return (
            <div
              className={`cart_item_scale ${isCurrent ? "is-current" : ""} ${
                isPast ? "is-past" : ""
              }`}
              key={`${scale.from_quantity}-${scale.to_quantity ?? "inf"}-${index}`}
            >
              <span>{formatCartScaleRange(scale.from_quantity, scale.to_quantity, t)}</span>
              <strong>{formatCartScaleDiscount(scale.discount_percentage)}</strong>
            </div>
          )
        })}
      </div>

      {futureScales.length > 0 ? (
        <small>
          {buildNextScaleMessage(futureScales[0], currentQuantity, t)}
        </small>
      ) : currentScale && isInfiniteScale(currentScale) ? (
        <small>{t("cartScaleMax")}</small>
      ) : null}
    </div>
  )
}

function RegionalSplitsSummary({ splits = [], formatMoney, t }) {
  if (!Array.isArray(splits) || !splits.length) return null

  return (
    <section className="summary_regional">
      <div className="summary_regional_head">
        <strong>{t("cartRegionalSplitsTitle")}</strong>
        <span>{t("cartRegionalSplitsText")}</span>
      </div>

      <div className="summary_regional_list">
        {splits.map((split) => (
          <article className="summary_regional_item" key={split.region_id || split.region_slug}>
            <div>
              <strong>{split.region_name || split.region_slug || "Regional"}</strong>
              <span>{t("itemsCount", { count: split.items_count })}</span>
            </div>
            <dl>
              <div>
                <dt>{t("subtotal")}</dt>
                <dd>{formatMoney(split.subtotal)}</dd>
              </div>
              <div>
                <dt>{t("commissionEstimated")}</dt>
                <dd>{formatMoney(split.commission_amount)}</dd>
              </div>
              <div>
                <dt>{t("netEstimated")}</dt>
                <dd>{formatMoney(split.net_amount)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}

function getCartScalePromotion(product) {
  const appliedPromotion =
    product?.promotion?.type === "price_scale_percentage" ? product.promotion : null

  const availablePromotion = Array.isArray(product?.availablePromotions)
    ? product.availablePromotions.find((promotion) => {
        return (
          promotion?.type === "price_scale_percentage" ||
          promotion?.snapshot?.type === "price_scale_percentage"
        )
      })
    : null

  if (!appliedPromotion && !availablePromotion) return null

  const appliedSnapshot = appliedPromotion?.snapshot || {}
  const availableSnapshot = availablePromotion?.snapshot || {}
  const scales = mergeCartPromotionScales(
    getScalesFromPromotion(appliedPromotion),
    getScalesFromPromotion(availablePromotion)
  )

  const fallbackScale = normalizeCartPromotionScales([
    appliedSnapshot.scale || {
      from_quantity: appliedSnapshot.from_quantity,
      to_quantity: appliedSnapshot.to_quantity,
      discount_percentage: appliedSnapshot.discount_percentage,
      is_active: true,
    },
  ])

  const normalizedScales = scales.length ? scales : fallbackScale

  if (!normalizedScales.length) return null

  return {
    id: appliedPromotion?.id ?? availablePromotion?.id,
    name:
      appliedPromotion?.name ||
      availablePromotion?.name ||
      appliedSnapshot.label ||
      availableSnapshot.label ||
      "",
    scales: normalizedScales,
  }
}

function getScalesFromPromotion(promotion) {
  if (!promotion) return []

  const snapshot = promotion.snapshot || {}
  const directScales = normalizeCartPromotionScales(
    snapshot.scales ||
      promotion.config?.scales ||
      promotion.scales ||
      snapshot.all_scales ||
      snapshot.available_scales
  )

  if (directScales.length) return directScales

  return normalizeCartPromotionScales([
    promotion.current_scale,
    promotion.next_scale,
    snapshot.scale,
    snapshot.current_scale,
    snapshot.next_scale,
  ])
}

function mergeCartPromotionScales(...scaleGroups) {
  const scaleMap = new Map()

  scaleGroups.flat().forEach((scale) => {
    const key = `${scale.from_quantity}-${scale.to_quantity ?? "inf"}`
    scaleMap.set(key, scale)
  })

  return [...scaleMap.values()].sort((a, b) => a.from_quantity - b.from_quantity)
}

function normalizeCartPromotionScales(scales) {
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

function getCurrentScale(scales, quantity) {
  return scales.find((scale) => {
    const fromQuantity = Number(scale.from_quantity || 0)
    const toQuantity = scale.to_quantity === null ? null : Number(scale.to_quantity || 0)

    return quantity >= fromQuantity && (!toQuantity || quantity <= toQuantity)
  })
}

function isSameScale(scale, currentScale) {
  return (
    Number(scale.from_quantity) === Number(currentScale.from_quantity) &&
    Number(scale.to_quantity || 0) === Number(currentScale.to_quantity || 0)
  )
}

function isInfiniteScale(scale) {
  return scale.to_quantity === null || scale.to_quantity === undefined || scale.to_quantity === ""
}

function formatCartScaleRange(fromQuantity, toQuantity, t) {
  if (!toQuantity) return t("cartScaleRangeFrom", { from: fromQuantity })
  if (Number(fromQuantity) === Number(toQuantity)) return t("cartScaleRangeExact", { from: fromQuantity })
  return t("cartScaleRangeBetween", { from: fromQuantity, to: toQuantity })
}

function formatCartScaleDiscount(value) {
  const numberValue = Number(value || 0)
  const formattedValue = Number.isInteger(numberValue)
    ? String(numberValue)
    : numberValue.toFixed(2)

  return `${formattedValue}% OFF`
}

function buildNextScaleMessage(nextScale, currentQuantity, t) {
  const missingQuantity = Math.max(Number(nextScale.from_quantity || 0) - currentQuantity, 0)

  if (missingQuantity <= 0) {
    return t("cartScaleNext", { discount: formatCartScaleDiscount(nextScale.discount_percentage) })
  }

  return t("cartScaleMissing", {
    count: missingQuantity,
    discount: formatCartScaleDiscount(nextScale.discount_percentage),
  })
}

function getLocaleTag(locale) {
  if (locale === "en") return "en-US"
  if (locale === "fr") return "fr-FR"
  return "es-MX"
}

export default CartPage
