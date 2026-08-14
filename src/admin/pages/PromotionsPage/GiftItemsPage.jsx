import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import AdminCard from "../../components/AdminCard/AdminCard"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel"
import {
  createAdminGiftItem,
  deleteAdminGiftItem,
  getAdminGiftItem,
  getAdminGiftItems,
  toggleAdminGiftItem,
  updateAdminGiftItem,
} from "../../../services/api/giftItemsService"
import { notifyError, notifySuccess, notifyWarning } from "../../../utils/toast"
import AdminTranslationsFields from "../../components/AdminTranslationsFields/AdminTranslationsFields"
import useAdminLocalization from "../../hooks/useAdminLocalization"
import {
  appendTranslationsToFormData,
  normalizeTranslations,
  setTranslationValue,
} from "../../utils/adminTranslations"
import "./PromotionsPage.css"

const emptyGiftForm = {
  name: "",
  code: "",
  description: "",
  estimated_value: "",
  unit_label: "pieza",
  sort_order: "",
  is_active: true,
  metadata_color: "",
  image: null,
  translations: {},
}

function GiftItemsPage() {
  const navigate = useNavigate()
  const [giftItems, setGiftItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)
  const [editingGiftId, setEditingGiftId] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [search, setSearch] = useState("")
  const [form, setForm] = useState(emptyGiftForm)
  const { activeLocales } = useAdminLocalization()

  const filteredGiftItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return giftItems

    return giftItems.filter((item) => {
      const text = [item.name, item.code, item.description, item.unit_label]
        .join(" ")
        .toLowerCase()
      return text.includes(term)
    })
  }, [giftItems, search])

  const imagePreview = useMemo(() => {
    if (!form.image) return ""
    return URL.createObjectURL(form.image)
  }, [form.image])

  useEffect(() => {
    loadGiftItems()
  }, [])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  async function loadGiftItems() {
    try {
      setLoading(true)
      const response = await getAdminGiftItems({ without_pagination: true })
      setGiftItems(normalizeCollectionResponse(response))
    } catch (error) {
      console.error("Error al cargar artículos de regalo:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar los regalos.")
      setGiftItems([])
    } finally {
      setLoading(false)
    }
  }

  function openCreatePanel() {
    setEditingGiftId(null)
    setForm(emptyGiftForm)
    setPanelOpen(true)
  }

  async function openEditPanel(item) {
    try {
      setPanelOpen(true)
      setPanelLoading(true)
      setEditingGiftId(item.id)

      const response = await getAdminGiftItem(item.id)
      const detail = response?.data || response || item

      setForm({
        name: detail.name || "",
        code: detail.code || "",
        description: detail.description || "",
        estimated_value: detail.estimated_value ?? "",
        unit_label: detail.unit_label || "pieza",
        sort_order: detail.sort_order ?? "",
        is_active: Boolean(detail.is_active ?? true),
        metadata_color: detail.metadata?.color || "",
        image: null,
        translations: normalizeTranslations(detail.translations),
      })
    } catch (error) {
      console.error("Error al cargar regalo:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar el regalo.")
      closePanel()
    } finally {
      setPanelLoading(false)
    }
  }

  function closePanel() {
    if (saving) return

    setPanelOpen(false)
    setPanelLoading(false)
    setEditingGiftId(null)
    setForm(emptyGiftForm)
  }

  function handleChange(event) {
    const { name, value, type, checked, files } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : files ? files[0] || null : value,
    }))
  }

  function handleTranslationChange(field, locale, value) {
    setForm((prev) => ({
      ...prev,
      translations: setTranslationValue(prev.translations, field, locale, value),
    }))
  }

  function buildPayload() {
    const payload = new FormData()

    payload.append("name", form.name.trim())
    payload.append("code", form.code.trim())
    payload.append("description", form.description.trim())
    payload.append("unit_label", form.unit_label.trim())
    payload.append("is_active", String(form.is_active))

    if (form.estimated_value !== "") {
      payload.append("estimated_value", String(form.estimated_value))
    }

    if (form.sort_order !== "") {
      payload.append("sort_order", String(form.sort_order))
    }

    if (form.metadata_color.trim()) {
      payload.append("metadata[color]", form.metadata_color.trim())
    }

    if (form.image) {
      payload.append("image", form.image)
    }

    appendTranslationsToFormData(payload, form.translations)

    return payload
  }

  function validateBeforeSubmit() {
    if (!form.name.trim()) {
      notifyWarning("Escribe el nombre del artículo de regalo.")
      return false
    }

    if (!form.code.trim()) {
      notifyWarning("Escribe el código del artículo de regalo.")
      return false
    }

    return true
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validateBeforeSubmit()) return

    try {
      setSaving(true)
      const payload = buildPayload()

      if (editingGiftId) {
        await updateAdminGiftItem(editingGiftId, payload)
        notifySuccess("Artículo de regalo actualizado correctamente.")
      } else {
        await createAdminGiftItem(payload)
        notifySuccess("Artículo de regalo creado correctamente.")
      }

      await loadGiftItems()
      closePanel()
    } catch (error) {
      console.error("Error al guardar regalo:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar el regalo.")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleGift(item) {
    try {
      setActionLoadingId(item.id)
      await toggleAdminGiftItem(item.id)
      notifySuccess("Estado del regalo actualizado.")
      await loadGiftItems()
    } catch (error) {
      console.error("Error al actualizar regalo:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el estado.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleDeleteGift(item) {
    if (!window.confirm(`¿Eliminar el regalo "${item.name}"?`)) return

    try {
      setActionLoadingId(item.id)
      await deleteAdminGiftItem(item.id)
      notifySuccess("Artículo de regalo eliminado correctamente.")
      await loadGiftItems()
    } catch (error) {
      console.error("Error al eliminar regalo:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar el regalo.")
    } finally {
      setActionLoadingId(null)
    }
  }

  const rightActions = (
    <div className="promotions_toolbar">
      <div className="promotions_actions">
        <div className="promotions_search">
          <input
            type="text"
            placeholder="Buscar regalo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <button type="button" className="btn_secondary" onClick={() => navigate("/admin/promotions")}>
          Volver
        </button>
        <button type="button" className="btn_primary" onClick={openCreatePanel}>
          Nuevo regalo
        </button>
      </div>
    </div>
  )

  return (
    <>
      <AdminCard
        title="Artículos de regalo"
        subtitle="Administra regalos internos que podrán usarse en promociones."
        right={rightActions}
      >
        <div className="promotions_page">
          {loading ? (
            <div className="promotions_empty">
              <h3>Cargando regalos...</h3>
              <p>Espera un momento mientras obtenemos la información.</p>
            </div>
          ) : filteredGiftItems.length === 0 ? (
            <div className="promotions_empty">
              <h3>No hay regalos registrados</h3>
              <p>Todavía no existen regalos o no coinciden con tu búsqueda.</p>
            </div>
          ) : (
            <div className="promotions_table_wrapper">
              <table className="promotions_table gift_items_table">
                <thead>
                  <tr>
                    <th>Imagen</th>
                    <th>Regalo</th>
                    <th>Valor</th>
                    <th>Orden</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGiftItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <GiftImage item={item} />
                      </td>
                      <td>
                        <div className="promotion-main-cell">
                          <strong>{item.name}</strong>
                          <span>{item.code}</span>
                          {item.description ? <small>{item.description}</small> : null}
                        </div>
                      </td>
                      <td>
                        <div className="gift-value-cell">
                          <strong>{formatMoney(item.estimated_value)}</strong>
                          <span>{item.unit_label || "pieza"}</span>
                        </div>
                      </td>
                      <td>{item.sort_order ?? "-"}</td>
                      <td>
                        <div className="promotion-status-cell">
                          <span className={`promo_status ${item.is_active ? "active" : "inactive"}`}>
                            {item.is_active ? "Activo" : "Inactivo"}
                          </span>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={Boolean(item.is_active)}
                              onChange={() => handleToggleGift(item)}
                              disabled={actionLoadingId === item.id}
                            />
                            <span className="slider"></span>
                          </label>
                        </div>
                      </td>
                      <td>
                        <div className="gift-actions-cell">
                          <button type="button" className="btn_secondary" onClick={() => openEditPanel(item)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn_danger"
                            onClick={() => handleDeleteGift(item)}
                            disabled={actionLoadingId === item.id}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminCard>

      <AdminSidePanel
        isOpen={panelOpen}
        title={editingGiftId ? "Editar regalo" : "Nuevo regalo"}
        subtitle="Artículo independiente para promociones futuras"
        onClose={closePanel}
        closeDisabled={saving}
        width="lg"
        footer={
          <div className="gift-panel-footer">
            <button type="button" className="btn_secondary" onClick={closePanel} disabled={saving}>
              Cancelar
            </button>
            <button
              type="submit"
              form="gift-item-form"
              className="btn_primary"
              disabled={saving || panelLoading}
            >
              {saving ? "Guardando..." : editingGiftId ? "Guardar cambios" : "Crear regalo"}
            </button>
          </div>
        }
      >
        {panelLoading ? (
          <div className="gift-panel-loading">Cargando regalo...</div>
        ) : (
          <form id="gift-item-form" className="gift-panel" onSubmit={handleSubmit}>
            <section className="gift-panel-card">
              <h4>Datos generales</h4>
              <div className="gift-panel-grid">
                <label>
                  Nombre
                  <input name="name" value={form.name} onChange={handleChange} placeholder="Vaso promocional" />
                </label>
                <label>
                  Código
                  <input name="code" value={form.code} onChange={handleChange} placeholder="REGALO-VASO-001" />
                </label>
              </div>
              <label>
                Descripción
                <textarea name="description" value={form.description} onChange={handleChange} rows="3" placeholder="Artículo de regalo para promociones especiales." />
              </label>

              <AdminTranslationsFields
                locales={activeLocales}
                translations={form.translations}
                fields={[
                  { name: "name", label: "Nombre", placeholder: "Nombre traducido" },
                  {
                    name: "description",
                    label: "Descripción",
                    type: "textarea",
                    placeholder: "Descripción traducida",
                  },
                  { name: "unit_label", label: "Unidad", placeholder: "Unidad traducida" },
                ]}
                onChange={handleTranslationChange}
              />
            </section>

            <section className="gift-panel-card">
              <h4>Imagen</h4>
              <label className="gift-dropzone">
                <input type="file" name="image" accept="image/*" onChange={handleChange} />
                <strong>{form.image ? form.image.name : "Selecciona una imagen"}</strong>
                <span>Se enviará como campo image.</span>
              </label>
              {imagePreview ? (
                <div className="gift-preview">
                  <img src={imagePreview} alt="Vista previa del regalo" />
                </div>
              ) : null}
            </section>

            <section className="gift-panel-card">
              <h4>Configuración</h4>
              <div className="gift-panel-grid">
                <label>
                  Valor estimado
                  <input type="number" min="0" step="0.01" name="estimated_value" value={form.estimated_value} onChange={handleChange} placeholder="25.50" />
                </label>
                <label>
                  Unidad
                  <input name="unit_label" value={form.unit_label} onChange={handleChange} placeholder="pieza" />
                </label>
                <label>
                  Orden
                  <input type="number" min="0" name="sort_order" value={form.sort_order} onChange={handleChange} placeholder="1" />
                </label>
                <label>
                  Color metadata
                  <input name="metadata_color" value={form.metadata_color} onChange={handleChange} placeholder="rojo" />
                </label>
              </div>
              <label className="gift-check">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                Activo
              </label>
            </section>
          </form>
        )}
      </AdminSidePanel>
    </>
  )
}

function GiftImage({ item }) {
  const image = normalizeGiftImage(item?.image_url || item?.image_path)

  if (!image) return <div className="gift-image gift-image-empty">Sin imagen</div>

  return (
    <div className="gift-image">
      <img src={image} alt={item.name} />
    </div>
  )
}

function normalizeCollectionResponse(response) {
  const payload = response?.data ?? response
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function normalizeGiftImage(value) {
  const image = String(value || "").trim()
  if (!image) return ""

  const nestedUrlMatch = image.match(/https?:\/\/.+?(https?:\/\/.+)$/)
  const cleanImage = nestedUrlMatch?.[1] || image
  const mediaBaseUrl = getMediaBaseUrl()

  if (/^https?:\/\//i.test(cleanImage)) {
    try {
      const parsedUrl = new URL(cleanImage)
      return `${mediaBaseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
    } catch {
      return cleanImage
    }
  }

  return `${mediaBaseUrl}/${cleanImage.replace(/^\/+/, "")}`
}

function getMediaBaseUrl() {
  return String(
    import.meta.env.VITE_MEDIA_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      ""
  )
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/+$/, "")
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export default GiftItemsPage
