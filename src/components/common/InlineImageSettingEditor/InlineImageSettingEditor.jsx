import { useEffect, useRef, useState } from "react"
import { notifyError, notifySuccess } from "../../../utils/toast"
import "./inlineimagesettingeditor.css"

function InlineImageSettingEditor({
  canEdit = false,
  uploadImage,
  onPreviewChange,
  onSaved,
  accept = "image/jpeg,image/png,image/webp,image/gif,image/svg+xml",
  editLabel = "Editar imagen",
}) {
  const inputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!selectedFile) return undefined

    const objectUrl = URL.createObjectURL(selectedFile)
    onPreviewChange?.(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
      onPreviewChange?.("")
    }
  }, [onPreviewChange, selectedFile])

  if (!canEdit) return null

  function handleSelectFile(event) {
    setSelectedFile(event.target.files?.[0] || null)
  }

  function handleCancel() {
    setSelectedFile(null)
    onPreviewChange?.("")
    if (inputRef.current) inputRef.current.value = ""
  }

  async function handleSave() {
    if (!selectedFile || saving || !uploadImage) return

    try {
      setSaving(true)
      const response = await uploadImage(selectedFile)
      onSaved?.(response)
      setSelectedFile(null)
      onPreviewChange?.("")
      if (inputRef.current) inputRef.current.value = ""
      notifySuccess(response?.message || "Imagen actualizada correctamente.")
    } catch (error) {
      console.error("Error al actualizar imagen:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar la imagen.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <span className="inline-image-editor">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="inline-image-editor__input"
        onChange={handleSelectFile}
      />

      <button
        type="button"
        className="inline-image-editor__button"
        onClick={() => inputRef.current?.click()}
        disabled={saving}
        aria-label={editLabel}
        title={editLabel}
      >
        <i className="bi bi-pencil-square" aria-hidden="true" />
      </button>

      {selectedFile ? (
        <>
          <button
            type="button"
            className="inline-image-editor__button inline-image-editor__button--cancel"
            onClick={handleCancel}
            disabled={saving}
            aria-label="Cancelar imagen"
            title="Cancelar imagen"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="inline-image-editor__button inline-image-editor__button--save"
            onClick={handleSave}
            disabled={saving}
            aria-label="Guardar imagen"
            title="Guardar imagen"
          >
            <i className="bi bi-check-lg" aria-hidden="true" />
          </button>
        </>
      ) : null}
    </span>
  )
}

export default InlineImageSettingEditor
