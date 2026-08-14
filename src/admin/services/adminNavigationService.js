const API_URL = import.meta.env.VITE_API_URL

export async function getAdminMenu(token) {
  const response = await fetch(`${API_URL}/api/v1/admin/navigation/menu`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || "No se pudo cargar el menú.")
  }

  return data
}