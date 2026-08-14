import { useEffect, useRef, useState } from "react"
import { updateAdminGeneralLogo } from "../../../services/api/settingsService"
import { normalizeMediaUrl } from "../../../utils/mediaUrl"
import { notifyError, notifySuccess } from "../../../utils/toast"
import "./inlinelogosettingeditor.css"

function InlineLogoSettingEditor({ canEdit = false, onPreviewChange, onSaved }) {
  const inputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!selectedFile) {
      return undefined
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    onPreviewChange?.(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
      onPreviewChange?.("")
    }
  }, [onPreviewChange, selectedFile])

  if (!canEdit) return null

  function handleSelectFile(event) {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
  }

  function handleCancel() {
    setSelectedFile(null)
    onPreviewChange?.("")
    if (inputRef.current) inputRef.current.value = ""
  }

  async function handleSave() {
    if (!selectedFile || saving) return

    try {
      setSaving(true)
      const response = await updateAdminGeneralLogo(selectedFile)
      const logo = normalizeLogoResponse(response)
      onSaved?.(logo)
      setSelectedFile(null)
      onPreviewChange?.("")
      if (inputRef.current) inputRef.current.value = ""
      notifySuccess(response?.message || "Logo actualizado correctamente.")
    } catch (error) {
      console.error("Error al actualizar logo:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el logo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <span className="inline-logo-editor">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="inline-logo-editor__input"
        onChange={handleSelectFile}
      />

      <button
        type="button"
        className="inline-logo-editor__button"
        onClick={() => inputRef.current?.click()}
        disabled={saving}
        aria-label="Editar logo"
        title="Editar logo"
      >
        <i className="bi bi-pencil-square" aria-hidden="true" />
      </button>

      {selectedFile ? (
        <>
          <button
            type="button"
            className="inline-logo-editor__button inline-logo-editor__button--cancel"
            onClick={handleCancel}
            disabled={saving}
            aria-label="Cancelar logo"
            title="Cancelar logo"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="inline-logo-editor__button inline-logo-editor__button--save"
            onClick={handleSave}
            disabled={saving}
            aria-label="Guardar logo"
            title="Guardar logo"
          >
            <i className="bi bi-check-lg" aria-hidden="true" />
          </button>
        </>
      ) : null}
    </span>
  )
}

function normalizeLogoResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data

  return {
    logo_path: value.logo_path || "",
    logo_url: normalizeMediaUrl(value.logo_url || value.logo_path),
  }
}

export default InlineLogoSettingEditor
