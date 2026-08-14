import api from "./api"

export async function getContactFaqs(params = {}) {
  const { data } = await api.get("/contact-faqs", { params })
  return data
}

export async function getAdminContactFaqs(params = {}) {
  const { data } = await api.get("/admin/contact-faqs", { params })
  return data
}

export async function createAdminContactFaq(payload) {
  const { data } = await api.post("/admin/contact-faqs", payload)
  return data
}

export async function getAdminContactFaq(id) {
  const { data } = await api.get(`/admin/contact-faqs/${id}`)
  return data
}

export async function updateAdminContactFaq(id, payload) {
  const { data } = await api.patch(`/admin/contact-faqs/${id}`, payload)
  return data
}

export async function deleteAdminContactFaq(id) {
  const { data } = await api.delete(`/admin/contact-faqs/${id}`)
  return data
}

export async function toggleAdminContactFaq(id) {
  const { data } = await api.patch(`/admin/contact-faqs/${id}/toggle`)
  return data
}

export async function reorderAdminContactFaqs(payload) {
  const { data } = await api.post("/admin/contact-faqs/reorder", payload)
  return data
}
