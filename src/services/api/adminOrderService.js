import api from "./api"

export async function getAdminOrders(params = {}) {
  const { data } = await api.get("/admin/orders", { params })
  return data
}

export async function getAdminOrder(orderId) {
  const { data } = await api.get(`/admin/orders/${orderId}`)
  return data
}

export async function updateAdminOrder(orderId, payload) {
  const { data } = await api.patch(`/admin/orders/${orderId}`, payload)
  return data
}

export async function cancelAdminOrder(orderId) {
  const { data } = await api.delete(`/admin/orders/${orderId}`)
  return data
}

export async function downloadAdminOrderPurchaseOrder(orderId) {
  const response = await api.get(`/admin/orders/${orderId}/purchase-order.pdf`, {
    responseType: "blob",
    headers: {
      Accept: "application/pdf",
    },
  })

  return response
}
