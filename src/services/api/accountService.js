import api from "./api"

export async function getAccountProfile() {
  const response = await api.get("/account/profile")
  return response.data
}

export async function changeAccountPassword(payload) {
  const response = await api.post("/change-password", payload)
  return response.data
}

export async function getCustomerPfrProfile() {
  const response = await api.get("/account/customer-pfr-profile")
  return response.data
}

export async function saveCustomerPfrProfile(payload) {
  const response = await api.post("/account/customer-pfr-profile", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
  return response.data
}

export async function getAccountAddresses() {
  const response = await api.get("/account/addresses")
  return response.data
}

export async function createAccountAddress(payload) {
  const response = await api.post("/account/addresses", payload)
  return response.data
}

export async function getAccountAddress(addressId) {
  const response = await api.get(`/account/addresses/${addressId}`)
  return response.data
}

export async function updateAccountAddress(addressId, payload) {
  const response = await api.patch(`/account/addresses/${addressId}`, payload)
  return response.data
}

export async function deleteAccountAddress(addressId) {
  const response = await api.delete(`/account/addresses/${addressId}`)
  return response.data
}

export async function setAccountAddressDefault(addressId) {
  const response = await api.patch(`/account/addresses/${addressId}/default`)
  return response.data
}

export async function getAccountOrders(params = {}) {
  const response = await api.get("/account/orders", { params })
  return response.data
}

export async function getAccountOrder(orderId) {
  const response = await api.get(`/account/orders/${orderId}`)
  return response.data
}

export async function getAccountFavorites(params = {}) {
  const response = await api.get("/account/favorites", { params })
  return response.data
}

export async function toggleAccountFavorite(productId) {
  const response = await api.post("/account/favorites/toggle", {
    product_id: productId,
  })
  return response.data
}

export async function getAccountWishlists() {
  const response = await api.get("/account/wishlists")
  return response.data
}

export async function getAccountWishlistOptions(productId) {
  const response = await api.get("/account/wishlists/options", {
    params: { product_id: productId },
  })
  return response.data
}

export async function createAccountWishlist(payload) {
  const response = await api.post("/account/wishlists", payload)
  return response.data
}

export async function getAccountWishlist(wishlistId, params = {}) {
  const response = await api.get(`/account/wishlists/${wishlistId}`, { params })
  return response.data
}

export async function updateAccountWishlist(wishlistId, payload) {
  const response = await api.patch(`/account/wishlists/${wishlistId}`, payload)
  return response.data
}

export async function deleteAccountWishlist(wishlistId) {
  const response = await api.delete(`/account/wishlists/${wishlistId}`)
  return response.data
}

export async function addAccountWishlistProduct(payload) {
  const response = await api.post("/account/wishlists/products", payload)
  return response.data
}

export async function removeAccountWishlistProduct(wishlistId, productId) {
  const response = await api.delete(`/account/wishlists/${wishlistId}/products/${productId}`)
  return response.data
}
