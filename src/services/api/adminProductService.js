import api from "./api.js"

export async function getAdminProducts(params = {}) {
  const { data } = await api.get("/admin/products", { params })
  return data
}

export async function getAdminProduct(productId) {
  const { data } = await api.get(`/admin/products/${productId}`)
  return data
}

export async function createAdminProduct(payload) {
  const config = payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {}

  const { data } = await api.post("/admin/products", payload, config)
  return data
}

export async function updateAdminProduct(productId, payload) {
  const config = payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {}

  const { data } = await api.post(`/admin/products/${productId}`, payload, config)
  return data
}

export async function updateAdminProductStatus(productId, isActive) {
  const { data } = await api.patch(`/admin/products/${productId}/status`, {
    is_active: isActive,
  })

  return data
}

export async function deleteAdminProduct(productId) {
  const { data } = await api.delete(`/admin/products/${productId}`)
  return data
}

export async function downloadAdminProductsBulkImportLayout() {
  const response = await api.get("/admin/products/bulk-import/layout", {
    responseType: "blob",
    headers: {
      Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  })

  return response
}

export async function previewAdminProductsBulkImport(payload) {
  const { data } = await api.post("/admin/products/bulk-import/preview", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return data
}

export async function importAdminProductsBulk(payload) {
  const { data } = await api.post("/admin/products/bulk-import", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return data
}
