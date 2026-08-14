export const PENDING_CART_RECOVER_URL_KEY = "pending_cart_recover_url"
export const PENDING_CART_RECOVER_CART_ID_KEY = "pending_cart_recover_cart_id"

export function savePendingCartRecovery({ recoverUrl, cartId = "" }) {
  if (!recoverUrl) return

  localStorage.setItem(PENDING_CART_RECOVER_URL_KEY, recoverUrl)
  localStorage.setItem(PENDING_CART_RECOVER_CART_ID_KEY, cartId || "")
}

export function consumePendingCartRecoveryUrl() {
  const recoverUrl = localStorage.getItem(PENDING_CART_RECOVER_URL_KEY)

  if (!recoverUrl) return ""

  localStorage.removeItem(PENDING_CART_RECOVER_URL_KEY)
  localStorage.removeItem(PENDING_CART_RECOVER_CART_ID_KEY)

  return recoverUrl
}
