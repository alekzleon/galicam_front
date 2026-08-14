import { useEffect, useState } from "react"
import { updateAdminSettingValue } from "../../../services/api/settingsService"
import { notifyError, notifySuccess } from "../../../utils/toast"
import "./inlinesettingeditor.css"

function InlineSettingEditor({
  settingKey,
  value,
  settingsId = null,
  canEdit = false,
  onSaved,
  onSaveValue,
  className = "",
  inputLabel = "Editar texto",
  allowEmpty = false,
}) {
  const [draft, setDraft] = useState(value || "")
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) {
      setDraft(value || "")
    }
  }, [editing, value])

  async function handleSave() {
    const nextValue = draft.trim()
    const valueToSave = nextValue || null

    if ((!nextValue && !allowEmpty) || nextValue === value || saving) {
      setEditing(false)
      return
    }

    try {
      setSaving(true)
      if (onSaveValue) {
        await onSaveValue(valueToSave)
      } else {
        await updateAdminSettingValue({
          settingsId,
          key: settingKey,
          value: valueToSave,
        })
      }
      onSaved?.(valueToSave)
      setEditing(false)
      notifySuccess("Configuración actualizada.")
    } catch (error) {
      console.error("Error al actualizar configuración:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar la configuración.")
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      handleSave()
    }

    if (event.key === "Escape") {
      setDraft(value || "")
      setEditing(false)
    }
  }

  return (
    <span className={`inline-setting-editor ${className}`}>
      {editing ? (
        <>
          <input
            type="text"
            className="inline-setting-editor__input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            aria-label={inputLabel}
            disabled={saving}
            autoFocus
          />
          <button
            type="button"
            className="inline-setting-editor__button inline-setting-editor__button--save"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleSave}
            disabled={saving}
            aria-label="Guardar cambio"
            title="Guardar cambio"
          >
            <i className="bi bi-check-lg" aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <span className="inline-setting-editor__text">{value}</span>
          {canEdit ? (
            <button
              type="button"
              className="inline-setting-editor__button"
              onClick={() => setEditing(true)}
              aria-label="Editar texto"
              title="Editar texto"
            >
              <i className="bi bi-pencil-square" aria-hidden="true" />
            </button>
          ) : null}
        </>
      )}
    </span>
  )
}

export default InlineSettingEditor
