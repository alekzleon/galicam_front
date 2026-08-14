import { toast } from "sonner"

function ToastTest() {
  const showSuccess = () => {
    toast.success("Todo salió correctamente")
  }

  const showError = () => {
    toast.error("Ocurrió un error al procesar la solicitud")
  }

  const showWarning = () => {
    toast.warning("Hay datos pendientes por revisar")
  }

  const showInfo = () => {
    toast("Este es un aviso general")
  }

  const showPromise = async () => {
    const fakeRequest = new Promise((resolve) => {
      setTimeout(() => resolve(true), 1800)
    })

    toast.promise(fakeRequest, {
      loading: "Guardando información...",
      success: "Información guardada correctamente",
      error: "No se pudo guardar la información",
    })
  }

  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      <button type="button" onClick={showSuccess}>
        Success
      </button>

      <button type="button" onClick={showError}>
        Error
      </button>

      <button type="button" onClick={showWarning}>
        Warning
      </button>

      <button type="button" onClick={showInfo}>
        Info
      </button>

      <button type="button" onClick={showPromise}>
        Promise test
      </button>
    </div>
  )
}

export default ToastTest