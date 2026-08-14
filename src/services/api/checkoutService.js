import api from "./api.js"
import { mergeSalesTrackingPayload } from "../../utils/salesTracking.js"

export async function createCheckoutOrder(payload = {}) {
  const response = await api.post("/checkout/orders", mergeSalesTrackingPayload(payload))
  return response.data
}

export async function createStripeCheckoutSession(payload) {
  const response = await api.post("/checkout/stripe/session", payload)
  return response.data
}

export async function confirmStripeCheckoutSession(payload) {
  const response = await api.post("/checkout/stripe/session/confirm", payload)
  return response.data
}

export async function getCheckoutOrder(orderId) {
  const response = await api.get(`/checkout/orders/${orderId}`)
  return response.data
}

export async function restoreCheckoutOrderCart(orderId, payload = {}) {
  const response = await api.post(`/checkout/orders/${orderId}/restore-cart`, payload)
  return response.data
}

export async function restoreRecoverableOrderCart(payload = {}) {
  const response = await api.post("/checkout/recoverable-order/restore", payload)
  return response.data
}
