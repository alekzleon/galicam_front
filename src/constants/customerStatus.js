export const CUSTOMER_STATUS = {
  ACTIVO: "activo",
  BAJA: "baja",
  SUSPENDIDO_CREDITO: "suspendido_credito",
}

export const CUSTOMER_STATUS_OPTIONS = [
  { value: CUSTOMER_STATUS.ACTIVO, label: "Activo" },
  { value: CUSTOMER_STATUS.BAJA, label: "Baja" },
  { value: CUSTOMER_STATUS.SUSPENDIDO_CREDITO, label: "Suspendido por crédito" },
]

export function getCustomerStatusLabel(status) {
  switch (status) {
    case CUSTOMER_STATUS.ACTIVO:
      return "Activo"
    case CUSTOMER_STATUS.BAJA:
      return "Baja"
    case CUSTOMER_STATUS.SUSPENDIDO_CREDITO:
      return "Suspendido por crédito"
    default:
      return status || "Sin status"
  }
}

export function getCustomerStatusVariant(status) {
  switch (status) {
    case CUSTOMER_STATUS.ACTIVO:
      return "success"
    case CUSTOMER_STATUS.BAJA:
      return "secondary"
    case CUSTOMER_STATUS.SUSPENDIDO_CREDITO:
      return "warning"
    default:
      return "light"
  }
}