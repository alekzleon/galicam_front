import api from "./api"
import { mergeSalesTrackingPayload } from "../../utils/salesTracking"

export async function addCartItem(payload) {
  const response = await api.post("/cart/items", mergeSalesTrackingPayload(payload))
  return response.data
}

export async function updateCartSalesChannel(payload = {}) {
  const response = await api.patch("/cart/sales-channel", mergeSalesTrackingPayload(payload))
  return response.data
}

export async function getCart() {
  const response = await api.get("/cart")
  return response.data
}

export async function getCartSummary() {
  const response = await api.get("/cart/summary")
  return response.data
}

export async function updateCartItem(itemId, payload) {
  const response = await api.patch(`/cart/items/${itemId}`, payload)
  return response.data
}

export async function removeCartItem(itemId) {
  const response = await api.delete(`/cart/items/${itemId}`)
  return response.data
}

export async function clearCart() {
  const response = await api.delete("/cart/items")
  return response.data
}

export async function recoverAbandonedCart(cartId) {
  const response = await api.post(`/cart/abandoned/${cartId}/recover`)
  return response.data
}

export async function applyCartCoupon(payload) {
  const response = await api.post("/cart/coupon", payload)
  return response.data
}

export async function clearCartCoupon() {
  const response = await api.delete("/cart/coupon")
  return response.data
}

export async function selectCartPromotionGift(promotionId, payload) {
  const response = await api.post(
    `/cart/promotions/${promotionId}/select-gift`,
    payload
  )
  return response.data
}

export async function clearCartPromotionGiftSelection(promotionId) {
  const response = await api.delete(`/cart/promotions/${promotionId}/select-gift`)
  return response.data
}

export async function applyCartCashback(payload) {
  const response = await api.post("/cart/cashback/apply", payload)
  return response.data
}

export async function clearCartCashback() {
  const response = await api.delete("/cart/cashback")
  return response.data
}

export async function addCartPromotionGiftProduct(promotionId) {
  const response = await api.post(`/cart/promotions/${promotionId}/add-gift-product`)
  return response.data
}

export async function downloadCartExcelLayout() {
  const response = await api.get("/cart/excel/layout", {
    responseType: "blob",
    headers: {
      Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  })

  return response
}

export async function importCartExcelFile(file) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await api.post("/cart/excel/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return response.data
}

export async function getCheckoutPreview(params = {}) {
  const response = await api.get("/checkout/preview", { params })
  return response.data
}

export async function validateCheckout(payload = {}) {
  const response = await api.post("/checkout/validate", mergeSalesTrackingPayload(payload))
  return response.data
}
