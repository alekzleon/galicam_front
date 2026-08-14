import api from "./api"

export async function getAdminDashboard(params = {}) {
  const { data } = await api.get("/admin/dashboard", { params })
  return data
}

export async function getAdminSalesChannelsDashboard(params = {}) {
  const { data } = await api.get("/admin/dashboard/sales-channels", { params })
  return data
}
