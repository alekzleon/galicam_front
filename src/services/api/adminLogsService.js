import api from "./api.js"

export async function getAdminLogs(params = {}) {
  const { data } = await api.get("/admin/logs", { params })
  return data
}

export async function getAdminLog(logId) {
  const { data } = await api.get(`/admin/logs/${logId}`)
  return data
}
