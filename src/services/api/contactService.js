import api from "./api"

export async function sendContactMessage(payload) {
  const { data } = await api.post("/contact", payload)
  return data
}

export async function sendContactLead(payload) {
  const { data } = await api.post("/contact-leads", payload)
  return data
}
