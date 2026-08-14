import api from "./api"

export async function getAdminCustomers(params = {}) {
    const response = await api.get("/admin/customers", { params })
    return response.data
}

export async function getAdminCustomer(id) {
    const response = await api.get(`/admin/customers/${id}`)
    return response.data
}

export async function createAdminCustomer(payload) {
    const response = await api.post("/admin/customers", payload)
    return response.data
}

export async function inviteAdminCustomer(payload) {
    const response = await api.post("/admin/customers/invite", payload)
    return response.data
}

export async function updateAdminCustomer(id, payload) {
    const response = await api.put(`/admin/customers/${id}`, payload)
    return response.data
}

export async function updateAdminCustomerStatus(id, payload) {
    const response = await api.patch(`/admin/customers/${id}/status`, payload)
    return response.data
}

export async function deleteAdminCustomer(id) {
    const response = await api.delete(`/admin/customers/${id}`)
    return response.data
}
