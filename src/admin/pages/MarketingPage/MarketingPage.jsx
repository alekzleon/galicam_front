import { useCallback, useEffect, useMemo, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel.jsx"
import {
  createAdminBanner,
  deleteAdminBanner,
  getBannerMediaType,
  getAdminBanner,
  getAdminBanners,
  normalizeBannerMediaUrl,
  reorderAdminBanners,
  toggleAdminBanner,
  updateAdminBanner,
} from "../../../services/api/bannerService.js"
import {
  createAdminMonthlyPromotion,
  deleteAdminMonthlyPromotion,
  getAdminMonthlyPromotion,
  getAdminMonthlyPromotions,
  reorderAdminMonthlyPromotions,
  toggleAdminMonthlyPromotion,
  updateAdminMonthlyPromotion,
} from "../../../services/api/monthlyPromotionsService.js"
import {
  createAdminBrandBanner,
  deleteAdminBrandBanner,
  getAdminBrandBanner,
  getAdminBrandBanners,
  reorderAdminBrandBanners,
  toggleAdminBrandBanner,
  updateAdminBrandBanner,
} from "../../../services/api/brandBannerService.js"
import { notifyError, notifySuccess, notifyWarning } from "../../../utils/toast.js"
import AdminTranslationsFields from "../../components/AdminTranslationsFields/AdminTranslationsFields"
import useAdminLocalization from "../../hooks/useAdminLocalization"
import {
  appendTranslationsToFormData,
  normalizeTranslations,
  setTranslationValue,
} from "../../utils/adminTranslations"
import "./MarketingPage.css"

const MONTHLY_PROMOTIONS_SECTION = "monthly_promotions"
const BRAND_BANNERS_SECTION = "brand_banners"

const BANNER_SECTIONS = [
  { value: "home", label: "Banners Inicio" },
  { value: BRAND_BANNERS_SECTION, label: "Banner de marcas" },
  { value: MONTHLY_PROMOTIONS_SECTION, label: "Banner promociones" },
]

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  description: "",
  button_text: "",
  link_url: "",
  sort_order: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
  translations: {},
  files: [],
}

function MarketingPage() {
  const [activeSection, setActiveSection] = useState(BANNER_SECTIONS[0].value)
  const [banners, setBanners] = useState([])
  const [monthlyPromotions, setMonthlyPromotions] = useState([])
  const [loadedSections, setLoadedSections] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)
  const [editingBannerId, setEditingBannerId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [inlineBrandEdits, setInlineBrandEdits] = useState({})
  const [brandLinkEditingId, setBrandLinkEditingId] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const { activeLocales } = useAdminLocalization()
  const isMonthlyPromotionsSection = activeSection === MONTHLY_PROMOTIONS_SECTION
  const isBrandBannersSection = activeSection === BRAND_BANNERS_SECTION

  const activeSectionLabel = useMemo(() => {
    return BANNER_SECTIONS.find((item) => item.value === activeSection)?.label || "Banners"
  }, [activeSection])

  const currentItems = useMemo(() => {
    if (isMonthlyPromotionsSection) {
      return [...monthlyPromotions].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    }

    if (isBrandBannersSection) {
      return banners
        .filter((banner) => getBannerSection(banner) === BRAND_BANNERS_SECTION)
        .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    }

    return banners
      .filter((banner) => getBannerSection(banner) === activeSection)
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
  }, [activeSection, banners, isBrandBannersSection, isMonthlyPromotionsSection, monthlyPromotions])

  const selectedFiles = useMemo(() => {
    return Array.from(form.files || [])
  }, [form.files])

  const selectedFilePreviews = useMemo(() => {
    return selectedFiles.map((file) => ({
      name: file.name,
      type: getMediaTypeFromMime(file.type),
      url: URL.createObjectURL(file),
    }))
  }, [selectedFiles])

  const loadBanners = useCallback(async (section) => {
    try {
      setLoading(true)
      const response = section === BRAND_BANNERS_SECTION
        ? await getAdminBrandBanners({ without_pagination: true })
        : await getAdminBanners({ without_pagination: true })
      const nextBanners = normalizeCollectionResponse(response)
      const normalizedBanners = section === BRAND_BANNERS_SECTION
        ? nextBanners.map((banner) => ({
          ...banner,
          metadata: {
            ...(banner.metadata || {}),
            section: BRAND_BANNERS_SECTION,
            section_label: "Banner de marcas",
          },
        }))
        : nextBanners

      setBanners((prev) => {
        const otherSections = prev.filter((banner) => getBannerSection(banner) !== section)
        return [...otherSections, ...normalizedBanners.filter((banner) => getBannerSection(banner) === section)]
      })
      setLoadedSections((prev) => ({ ...prev, [section]: true }))
    } catch (error) {
      console.error("Error al cargar banners:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar los banners.")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMonthlyPromotions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await getAdminMonthlyPromotions({
        without_pagination: true,
      })
      setMonthlyPromotions(normalizeCollectionResponse(response))
      setLoadedSections((prev) => ({ ...prev, [MONTHLY_PROMOTIONS_SECTION]: true }))
    } catch (error) {
      console.error("Error al cargar promociones del mes:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar las promociones del mes.")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadActiveSection = useCallback(async (section = activeSection) => {
    if (section === MONTHLY_PROMOTIONS_SECTION) {
      await loadMonthlyPromotions()
      return
    }

    await loadBanners(section)
  }, [activeSection, loadBanners, loadMonthlyPromotions])

  useEffect(() => {
    if (!loadedSections[activeSection]) {
      loadActiveSection(activeSection)
    }
  }, [activeSection, loadActiveSection, loadedSections])

  useEffect(() => {
    return () => {
      selectedFilePreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [selectedFilePreviews])

  function openCreatePanel() {
    setEditingBannerId(null)
    setForm(EMPTY_FORM)
    setPanelOpen(true)
  }

  async function openEditPanel(item) {
    try {
      setPanelOpen(true)
      setPanelLoading(true)
      setEditingBannerId(item.id)

      const response = isMonthlyPromotionsSection
        ? await getAdminMonthlyPromotion(item.id)
        : isBrandBannersSection
          ? await getAdminBrandBanner(item.id)
          : await getAdminBanner(item.id)
      const detail = response?.data || response || item

      setForm({
        title: detail.title || detail.brand_name || detail.name || "",
        subtitle: detail.subtitle || "",
        description: detail.description || "",
        button_text: detail.button_text || detail.buttonText || "",
        link_url: detail.link_url || detail.link || detail.url || "",
        sort_order: detail.sort_order ?? "",
        starts_at: toDateTimeLocalValue(detail.starts_at),
        ends_at: toDateTimeLocalValue(detail.ends_at),
        is_active: Boolean(detail.is_active ?? true),
        translations: normalizeTranslations(detail.translations),
        files: [],
      })
    } catch (error) {
      console.error("Error al cargar elemento de marketing:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar la información.")
      closePanel()
    } finally {
      setPanelLoading(false)
    }
  }

  function closePanel() {
    if (saving) return

    setPanelOpen(false)
    setPanelLoading(false)
    setEditingBannerId(null)
    setForm(EMPTY_FORM)
  }

  function handleChange(event) {
    const { name, value, type, checked, files } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : files ? Array.from(files) : value,
    }))
  }

  function handleTranslationChange(field, locale, value) {
    setForm((prev) => ({
      ...prev,
      translations: setTranslationValue(prev.translations, field, locale, value),
    }))
  }

  function setInlineBrandEdit(id, field, value) {
    setInlineBrandEdits((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }))
  }

  function getInlineBrandValue(item, field) {
    const edits = inlineBrandEdits[item.id] || {}

    if (Object.prototype.hasOwnProperty.call(edits, field)) return edits[field]

    if (field === "title") return getBannerTitle(item) === `Banner #${item.id}` ? "" : getBannerTitle(item)
    if (field === "link_url") return getBannerLink(item)
    if (field === "starts_at" || field === "ends_at") return toDateTimeLocalValue(item[field])

    return item[field] || ""
  }

  async function saveInlineBrandField(item, field, value) {
    const normalizedValue = field === "starts_at" || field === "ends_at" ? toApiDateTime(value) : value
    const currentValue = field === "starts_at" || field === "ends_at"
      ? toApiDateTime(toDateTimeLocalValue(item[field]))
      : field === "link_url"
        ? getBannerLink(item)
        : field === "title"
          ? (getBannerTitle(item) === `Banner #${item.id}` ? "" : getBannerTitle(item))
          : item[field] || ""

    if (String(normalizedValue || "") === String(currentValue || "")) return

    try {
      setActionLoadingId(item.id)
      await updateAdminBrandBanner(item.id, { [field]: normalizedValue })
      setBanners((prev) => prev.map((banner) => {
        if (banner.id !== item.id) return banner
        return {
          ...banner,
          [field]: normalizedValue,
          ...(field === "title" ? { brand_name: normalizedValue } : {}),
        }
      }))
      notifySuccess("Banner de marcas actualizado.")
      await loadActiveSection()
    } catch (error) {
      console.error("Error al actualizar banner de marca:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el banner de marca.")
      setInlineBrandEdit(item.id, field, getInlineBrandValue(item, field))
    } finally {
      setActionLoadingId(null)
    }
  }

  function handleInlineBrandKeyDown(event, item, field) {
    if (event.key === "Enter") {
      event.preventDefault()
      saveInlineBrandField(item, field, event.currentTarget.value)
      if (field === "link_url") setBrandLinkEditingId(null)
    }
  }

  function buildPayload(file = null) {
    const payload = new FormData()

    if (isBrandBannersSection) {
      if (editingBannerId) {
        if (file) {
          payload.append("media", file)
          payload.append("media_type", getMediaTypeFromMime(file.type))
        }
        appendTranslationsToFormData(payload, form.translations)
        return payload
      }

      payload.append("title", "")
      payload.append("description", "")
      payload.append("button_text", "")
      payload.append("link_url", "")
      payload.append("is_active", "1")
      payload.append("subtitle", "")
      payload.append("brand_name", "")
      if (file) {
        payload.append("media", file)
        payload.append("media_type", getMediaTypeFromMime(file.type))
      }
      appendTranslationsToFormData(payload, form.translations)
      return payload
    }

    payload.append("title", form.title.trim())
    payload.append("description", form.description.trim())
    payload.append("button_text", form.button_text.trim())
    payload.append("link_url", form.link_url.trim())
    payload.append("is_active", isMonthlyPromotionsSection ? String(form.is_active) : form.is_active ? "1" : "0")

    if (!isMonthlyPromotionsSection) {
      payload.append("subtitle", form.subtitle.trim())
      payload.append("metadata[section]", activeSection)
      payload.append("metadata[section_label]", activeSectionLabel)
    }

    if (form.sort_order !== "") {
      payload.append("sort_order", String(form.sort_order))
    }

    if (form.starts_at) payload.append("starts_at", toApiDateTime(form.starts_at))
    if (form.ends_at) payload.append("ends_at", toApiDateTime(form.ends_at))
    appendTranslationsToFormData(payload, form.translations)

    if (file && isMonthlyPromotionsSection) {
      payload.append("image", file)
    } else if (file) {
      payload.append("media", file)
      payload.append("media_type", getMediaTypeFromMime(file.type))
    }

    return payload
  }

  function validateBeforeSubmit() {
    if (isMonthlyPromotionsSection && !form.title.trim()) {
      notifyWarning("Escribe un nombre para identificar el elemento.")
      return false
    }

    if (isBrandBannersSection && editingBannerId && selectedFiles.length === 0) {
      notifyWarning("Selecciona una imagen o video para reemplazar el banner de marca.")
      return false
    }

    if (!editingBannerId && selectedFiles.length === 0) {
      notifyWarning(
        isMonthlyPromotionsSection
          ? "Selecciona una imagen para la promoción."
          : isBrandBannersSection
            ? "Selecciona una o varias imágenes/videos."
            : "Selecciona al menos una imagen o video."
      )
      return false
    }

    if (
      form.starts_at &&
      form.ends_at &&
      new Date(form.ends_at).getTime() < new Date(form.starts_at).getTime()
    ) {
      notifyWarning("La fecha final no puede ser menor que la fecha inicial.")
      return false
    }

    return true
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!validateBeforeSubmit()) return

    try {
      setSaving(true)

      if (isMonthlyPromotionsSection && editingBannerId) {
        await updateAdminMonthlyPromotion(editingBannerId, buildPayload(selectedFiles[0] || null))
        notifySuccess("Promoción del mes actualizada correctamente.")
      } else if (isMonthlyPromotionsSection) {
        await createAdminMonthlyPromotion(buildPayload(selectedFiles[0] || null))
        notifySuccess("Promoción del mes creada correctamente.")
      } else if (isBrandBannersSection && editingBannerId) {
        await updateAdminBrandBanner(editingBannerId, buildPayload(selectedFiles[0] || null))
        notifySuccess("Banner de marcas actualizado correctamente.")
      } else if (isBrandBannersSection) {
        await Promise.all(selectedFiles.map((file) => createAdminBrandBanner(buildPayload(file))))
        notifySuccess(
          selectedFiles.length > 1
            ? "Banners de marcas creados correctamente."
            : "Banner de marcas creado correctamente."
        )
      } else if (editingBannerId) {
        await updateAdminBanner(editingBannerId, buildPayload(selectedFiles[0] || null))
        notifySuccess("Banner actualizado correctamente.")
      } else {
        await Promise.all(selectedFiles.map((file) => createAdminBanner(buildPayload(file))))
        notifySuccess(
          selectedFiles.length > 1
            ? "Banners creados correctamente."
            : "Banner creado correctamente."
        )
      }

      await loadActiveSection()
      closePanel()
    } catch (error) {
      console.error("Error al guardar marketing:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar la información.")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleBanner(item) {
    try {
      setActionLoadingId(item.id)
      if (isMonthlyPromotionsSection) {
        await toggleAdminMonthlyPromotion(item.id)
      } else if (isBrandBannersSection) {
        await toggleAdminBrandBanner(item.id)
      } else {
        await toggleAdminBanner(item.id)
      }
      notifySuccess("Estado actualizado.")
      await loadActiveSection()
    } catch (error) {
      console.error("Error al activar/desactivar:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el estado.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleDeleteBanner(item) {
    const itemLabel = isMonthlyPromotionsSection ? "promoción" : "banner"
    if (!window.confirm(`¿Eliminar ${itemLabel} "${getBannerTitle(item)}"?`)) return

    try {
      setActionLoadingId(item.id)
      if (isMonthlyPromotionsSection) {
        await deleteAdminMonthlyPromotion(item.id)
      } else if (isBrandBannersSection) {
        await deleteAdminBrandBanner(item.id)
      } else {
        await deleteAdminBanner(item.id)
      }
      notifySuccess("Elemento eliminado correctamente.")
      await loadActiveSection()
    } catch (error) {
      console.error("Error al eliminar:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar el elemento.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleMoveBanner(item, direction) {
    const currentIndex = currentItems.findIndex((currentItem) => currentItem.id === item.id)
    const nextIndex = currentIndex + direction

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentItems.length) return

    const reordered = [...currentItems]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(nextIndex, 0, moved)

    const orderedItems = reordered.map((currentItem, index) => ({
      ...currentItem,
      sort_order: index + 1,
    }))

    await persistOrder(orderedItems, item.id)
  }

  async function persistOrder(orderedItems, loadingId = null) {
    const nextPayload = isMonthlyPromotionsSection
      ? {
        monthly_promotions: orderedItems.map((currentItem) => ({
          id: currentItem.id,
          sort_order: currentItem.sort_order,
        })),
      }
      : isBrandBannersSection
        ? {
          banners: orderedItems.map((currentItem) => ({
            id: currentItem.id,
            sort_order: currentItem.sort_order,
          })),
        }
      : {
        banners: orderedItems.map((currentItem) => ({
          id: currentItem.id,
          sort_order: currentItem.sort_order,
        })),
      }

    try {
      setActionLoadingId(loadingId)
      if (isMonthlyPromotionsSection) {
        setMonthlyPromotions(orderedItems)
        await reorderAdminMonthlyPromotions(nextPayload)
      } else if (isBrandBannersSection) {
        setBanners((prev) => {
          const otherSections = prev.filter((currentItem) => getBannerSection(currentItem) !== BRAND_BANNERS_SECTION)
          return [...otherSections, ...orderedItems]
        })
        await reorderAdminBrandBanners(nextPayload)
      } else {
        setBanners((prev) => {
          const otherSections = prev.filter((currentItem) => getBannerSection(currentItem) !== activeSection)
          return [...otherSections, ...orderedItems]
        })
        await reorderAdminBanners(nextPayload)
      }
      notifySuccess("Orden actualizado correctamente.")
      await loadActiveSection()
    } catch (error) {
      console.error("Error al ordenar:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el orden.")
      await loadActiveSection()
    } finally {
      setActionLoadingId(null)
    }
  }

  function handleDragStart(item) {
    if (!isBrandBannersSection) return
    setDraggingId(item.id)
  }

  function handleDragOver(event) {
    if (!isBrandBannersSection) return
    event.preventDefault()
  }

  async function handleDropBanner(targetItem) {
    if (!isBrandBannersSection || !draggingId || draggingId === targetItem.id) {
      setDraggingId(null)
      return
    }

    const fromIndex = currentItems.findIndex((item) => item.id === draggingId)
    const toIndex = currentItems.findIndex((item) => item.id === targetItem.id)

    if (fromIndex < 0 || toIndex < 0) {
      setDraggingId(null)
      return
    }

    const reordered = [...currentItems]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    const orderedItems = reordered.map((item, index) => ({
      ...item,
      sort_order: index + 1,
    }))

    setDraggingId(null)
    await persistOrder(orderedItems, moved.id)
  }

  const rightActions = (
    <button type="button" className="marketing-button marketing-button--primary" onClick={openCreatePanel}>
      {isMonthlyPromotionsSection ? "Nueva promoción" : isBrandBannersSection ? "Subir banners" : "Nuevo banner"}
    </button>
  )

  return (
    <>
      <AdminCard
        title="Marketing"
        subtitle="Administra banners y promociones destacadas por ubicación del ecommerce."
        right={rightActions}
      >
        <div className="marketing-page">
          <div className="marketing-page__tabs" role="tablist" aria-label="Secciones de marketing">
            {BANNER_SECTIONS.map((section) => (
              <button
                key={section.value}
                type="button"
                className={`marketing-page__tab ${
                  activeSection === section.value ? "is-active" : ""
                }`}
                onClick={() => setActiveSection(section.value)}
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className="marketing-page__summary">
            <div>
              <strong>{activeSectionLabel}</strong>
              <span>
                {loading
                  ? "Cargando información..."
                  : `${currentItems.length} ${isMonthlyPromotionsSection ? "promoción(es)" : "banner(s)"} registrados`}
              </span>
            </div>
          </div>

          <div className="marketing-page__table-wrapper">
            <table className="marketing-page__table">
              <thead>
                <tr>
                  <th>Vista previa</th>
                  <th>{isMonthlyPromotionsSection ? "Promoción" : "Banner"}</th>
                  <th>Vigencia</th>
                  <th>Orden</th>
                  <th>Estado</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="marketing-page__empty-cell">
                      Cargando información...
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="marketing-page__empty-cell">
                      No hay {isMonthlyPromotionsSection ? "promociones" : "banners"} en esta sección.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((banner, index) => (
                    <tr
                      key={banner.id}
                      draggable={isBrandBannersSection}
                      className={draggingId === banner.id ? "is-dragging" : ""}
                      onDragStart={() => handleDragStart(banner)}
                      onDragOver={handleDragOver}
                      onDragEnd={() => setDraggingId(null)}
                      onDrop={() => handleDropBanner(banner)}
                    >
                      <td>
                        <BannerPreview banner={banner} />
                      </td>
                      <td>
                        {isBrandBannersSection ? (
                          <BrandBannerInlineInfo
                            banner={banner}
                            valueGetter={getInlineBrandValue}
                            onChange={setInlineBrandEdit}
                            onSave={saveInlineBrandField}
                            onKeyDown={handleInlineBrandKeyDown}
                            linkEditingId={brandLinkEditingId}
                            setLinkEditingId={setBrandLinkEditingId}
                            disabled={actionLoadingId === banner.id}
                          />
                        ) : (
                          <div className="marketing-page__banner-info">
                            <strong>{getBannerTitle(banner)}</strong>
                            <span>{getBannerSubtitle(banner) || "Sin descripción"}</span>
                            {getBannerLink(banner) ? <small>{getBannerLink(banner)}</small> : null}
                          </div>
                        )}
                      </td>
                      <td>
                        {isBrandBannersSection ? (
                          <BrandBannerInlineDates
                            banner={banner}
                            valueGetter={getInlineBrandValue}
                            onChange={setInlineBrandEdit}
                            onSave={saveInlineBrandField}
                            onKeyDown={handleInlineBrandKeyDown}
                            disabled={actionLoadingId === banner.id}
                          />
                        ) : (
                          <div className="marketing-page__dates">
                            <span>Inicio: {formatDateTime(banner.starts_at)}</span>
                            <span>Fin: {formatDateTime(banner.ends_at)}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="marketing-page__order-actions">
                          <strong>{banner.sort_order ?? index + 1}</strong>
                          <button
                            type="button"
                            onClick={() => handleMoveBanner(banner, -1)}
                            disabled={index === 0 || actionLoadingId === banner.id}
                          >
                            Subir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveBanner(banner, 1)}
                            disabled={index === currentItems.length - 1 || actionLoadingId === banner.id}
                          >
                            Bajar
                          </button>
                        </div>
                      </td>
                      <td>
                        <label className="marketing-switch">
                          <input
                            type="checkbox"
                            checked={Boolean(banner.is_active)}
                            onChange={() => handleToggleBanner(banner)}
                            disabled={actionLoadingId === banner.id}
                          />
                          <span></span>
                        </label>
                      </td>
                      <td>
                        <div className="marketing-page__actions">
                          <button
                            type="button"
                            className="marketing-button marketing-button--secondary"
                            onClick={() => openEditPanel(banner)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="marketing-button marketing-button--danger"
                            onClick={() => handleDeleteBanner(banner)}
                            disabled={actionLoadingId === banner.id}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminCard>

      <AdminSidePanel
        isOpen={panelOpen}
        title={
          editingBannerId
            ? isBrandBannersSection
              ? "Reemplazar banner de marca"
              : isMonthlyPromotionsSection ? "Editar promoción" : "Editar banner"
            : isBrandBannersSection
              ? "Subir banners de marcas"
              : isMonthlyPromotionsSection ? "Nueva promoción" : "Nuevo banner"
        }
        subtitle={
          isBrandBannersSection
            ? "Banner de marcas · archivos"
            : `${activeSectionLabel} · ${isMonthlyPromotionsSection ? "imagen" : "imagen o video"}`
        }
        onClose={closePanel}
        closeDisabled={saving}
        width="lg"
        footer={
          <div className="marketing-panel__footer">
            <button
              type="button"
              className="marketing-button marketing-button--secondary"
              onClick={closePanel}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="marketing-banner-form"
              className="marketing-button marketing-button--primary"
              disabled={saving || panelLoading}
            >
              {saving
                ? "Guardando..."
                : isBrandBannersSection
                  ? editingBannerId ? "Subir reemplazo" : "Subir"
                  : editingBannerId
                    ? "Guardar cambios"
                  : isMonthlyPromotionsSection ? "Crear promoción" : "Crear banner"}
            </button>
          </div>
        }
      >
        {panelLoading ? (
          <div className="marketing-panel__loading">Cargando banner...</div>
        ) : (
          <form id="marketing-banner-form" className="marketing-panel" onSubmit={handleSubmit}>
            {!isBrandBannersSection ? (
              <section className="marketing-panel__card">
                <h4>Contenido</h4>

                <div className="marketing-panel__grid">
                  <label className="marketing-panel__field">
                    <span>Nombre</span>
                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder={isMonthlyPromotionsSection ? "Ej. Promociones de abril" : "Ej. Banner principal de inicio"}
                    />
                  </label>

                  <label className="marketing-panel__field">
                    <span>Botón</span>
                    <input
                      type="text"
                      name="button_text"
                      value={form.button_text}
                      onChange={handleChange}
                      placeholder="Ej. Comprar ahora"
                    />
                  </label>
                </div>

                {!isMonthlyPromotionsSection ? (
                  <label className="marketing-panel__field">
                    <span>Subtítulo</span>
                    <textarea
                      name="subtitle"
                      value={form.subtitle}
                      onChange={handleChange}
                      placeholder="Texto breve para identificar o acompañar el banner."
                    />
                  </label>
                ) : null}

                <label className="marketing-panel__field">
                  <span>Descripción</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder={
                      isMonthlyPromotionsSection
                        ? "Ahorra en productos seleccionados durante este mes."
                        : "Descripción extendida opcional para el banner."
                    }
                  />
                </label>

                <label className="marketing-panel__field">
                  <span>Enlace</span>
                  <input
                    type="text"
                    name="link_url"
                    value={form.link_url}
                    onChange={handleChange}
                    placeholder="/productos, /promociones o URL completa"
                  />
                </label>

                <AdminTranslationsFields
                  locales={activeLocales}
                  translations={form.translations}
                  fields={getMarketingTranslationFields(isMonthlyPromotionsSection, isBrandBannersSection)}
                  onChange={handleTranslationChange}
                />
              </section>
            ) : null}

            {isBrandBannersSection && editingBannerId ? (
              <section className="marketing-panel__card">
                <h4>Traducciones</h4>
                <AdminTranslationsFields
                  locales={activeLocales}
                  translations={form.translations}
                  fields={getMarketingTranslationFields(isMonthlyPromotionsSection, isBrandBannersSection)}
                  onChange={handleTranslationChange}
                />
              </section>
            ) : null}

            <section className="marketing-panel__card">
              <h4>{isBrandBannersSection ? "Archivos" : "Archivo"}</h4>

              <label className="marketing-panel__dropzone">
                <input
                  type="file"
                  name="files"
                  accept={isMonthlyPromotionsSection ? "image/*" : "image/*,video/*"}
                  multiple={!editingBannerId && !isMonthlyPromotionsSection}
                  onChange={handleChange}
                />
                <strong>
                  {isBrandBannersSection
                    ? editingBannerId ? "Selecciona una imagen o video" : "Selecciona una o varias imágenes/videos"
                    : editingBannerId
                      ? "Selecciona un archivo para reemplazar el actual"
                      : isMonthlyPromotionsSection
                        ? "Selecciona una imagen"
                        : "Selecciona una o varias imágenes/videos"}
                </strong>
                <span>
                  {isBrandBannersSection
                    ? "Puedes subir varias imágenes o videos y acomodarlos después en el listado."
                    : isMonthlyPromotionsSection
                    ? "Formato de imagen compatible con el navegador."
                    : "Formatos de imagen o video compatibles con el navegador."}
                </span>
              </label>

              {selectedFilePreviews.length ? (
                <div className="marketing-panel__previews">
                  {selectedFilePreviews.map((preview) => (
                    <div className="marketing-panel__preview" key={preview.url}>
                      {preview.type === "video" ? (
                        <video src={preview.url} muted playsInline controls />
                      ) : (
                        <img src={preview.url} alt={preview.name} />
                      )}
                      <span>{preview.name}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {!isBrandBannersSection ? (
            <section className="marketing-panel__card">
              <h4>Publicación</h4>

              <div className="marketing-panel__grid">
                <label className="marketing-panel__field">
                  <span>Orden</span>
                  <input
                    type="number"
                    name="sort_order"
                    min="0"
                    value={form.sort_order}
                    onChange={handleChange}
                    placeholder="1"
                  />
                </label>

                <label className="marketing-panel__field marketing-panel__field--switch">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                  />
                  <span>Activo</span>
                </label>
              </div>

              <div className="marketing-panel__grid">
                <label className="marketing-panel__field">
                  <span>Inicio</span>
                  <input
                    type="datetime-local"
                    name="starts_at"
                    value={form.starts_at}
                    onChange={handleChange}
                  />
                </label>

                <label className="marketing-panel__field">
                  <span>Fin</span>
                  <input
                    type="datetime-local"
                    name="ends_at"
                    value={form.ends_at}
                    onChange={handleChange}
                  />
                </label>
              </div>
            </section>
            ) : null}
          </form>
        )}
      </AdminSidePanel>
    </>
  )
}

function BrandBannerInlineInfo({
  banner,
  valueGetter,
  onChange,
  onSave,
  onKeyDown,
  linkEditingId,
  setLinkEditingId,
  disabled,
}) {
  const titleValue = valueGetter(banner, "title")
  const linkValue = valueGetter(banner, "link_url")
  const isEditingLink = linkEditingId === banner.id

  return (
    <div className="marketing-page__banner-info marketing-page__banner-info--inline">
      <label className="marketing-inline-field">
        <span>Nombre</span>
        <input
          type="text"
          value={titleValue}
          onChange={(event) => onChange(banner.id, "title", event.target.value)}
          onKeyDown={(event) => onKeyDown(event, banner, "title")}
          onBlur={(event) => onSave(banner, "title", event.target.value)}
          disabled={disabled}
          placeholder="Sin nombre"
        />
      </label>

      <div className="marketing-inline-link">
        {isEditingLink ? (
          <input
            type="text"
            value={linkValue}
            onChange={(event) => onChange(banner.id, "link_url", event.target.value)}
            onKeyDown={(event) => onKeyDown(event, banner, "link_url")}
            onBlur={(event) => {
              onSave(banner, "link_url", event.target.value)
              setLinkEditingId(null)
            }}
            disabled={disabled}
            placeholder="/productos"
            autoFocus
          />
        ) : (
          <>
            <small>{linkValue || "Sin enlace"}</small>
            <button
              type="button"
              className="marketing-inline-icon-button"
              onClick={() => setLinkEditingId(banner.id)}
              disabled={disabled}
              title="Editar enlace"
              aria-label="Editar enlace"
            >
              <i className="bi bi-link-45deg" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function BrandBannerInlineDates({ banner, valueGetter, onChange, onSave, onKeyDown, disabled }) {
  return (
    <div className="marketing-page__dates marketing-page__dates--inline">
      <label className="marketing-inline-field">
        <span>Inicio</span>
        <input
          type="datetime-local"
          value={valueGetter(banner, "starts_at")}
          onChange={(event) => onChange(banner.id, "starts_at", event.target.value)}
          onKeyDown={(event) => onKeyDown(event, banner, "starts_at")}
          onBlur={(event) => onSave(banner, "starts_at", event.target.value)}
          disabled={disabled}
        />
      </label>

      <label className="marketing-inline-field">
        <span>Fin</span>
        <input
          type="datetime-local"
          value={valueGetter(banner, "ends_at")}
          onChange={(event) => onChange(banner.id, "ends_at", event.target.value)}
          onKeyDown={(event) => onKeyDown(event, banner, "ends_at")}
          onBlur={(event) => onSave(banner, "ends_at", event.target.value)}
          disabled={disabled}
        />
      </label>
    </div>
  )
}

function BannerPreview({ banner }) {
  const mediaUrl = getBannerMediaUrl(banner)
  const mediaType = getBannerMediaType(banner)

  if (!mediaUrl) {
    return <div className="marketing-page__preview marketing-page__preview--empty">Sin archivo</div>
  }

  return (
    <div className="marketing-page__preview">
      {mediaType === "video" ? (
        <video src={mediaUrl} muted playsInline controls />
      ) : (
        <img src={mediaUrl} alt={getBannerTitle(banner)} />
      )}
    </div>
  )
}

function normalizeCollectionResponse(response) {
  const payload = response?.data ?? response

  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.banners)) return payload.banners
  if (Array.isArray(payload?.brand_banners)) return payload.brand_banners
  if (Array.isArray(payload?.brandBanners)) return payload.brandBanners
  if (Array.isArray(payload?.monthly_promotions)) return payload.monthly_promotions
  if (Array.isArray(payload?.monthlyPromotions)) return payload.monthlyPromotions

  return []
}

function getBannerSection(banner) {
  const metadataSection = banner.metadata?.section

  if (metadataSection) return metadataSection
  return "home"
}

function getBannerTitle(banner) {
  return banner.title || banner.brand_name || banner.name || `Banner #${banner.id}`
}

function getBannerSubtitle(banner) {
  return banner.subtitle || banner.description || ""
}

function getMarketingTranslationFields(isMonthlyPromotionsSection, isBrandBannersSection) {
  if (isMonthlyPromotionsSection) {
    return [
      { name: "title", label: "Título", placeholder: "Título traducido" },
      {
        name: "description",
        label: "Descripción",
        type: "textarea",
        placeholder: "Descripción traducida",
      },
      { name: "button_text", label: "Botón", placeholder: "Texto de botón traducido" },
    ]
  }

  if (isBrandBannersSection) {
    return [
      { name: "title", label: "Título", placeholder: "Título traducido" },
      { name: "subtitle", label: "Subtítulo", placeholder: "Subtítulo traducido" },
      {
        name: "description",
        label: "Descripción",
        type: "textarea",
        placeholder: "Descripción traducida",
      },
      { name: "brand_name", label: "Marca", placeholder: "Nombre de marca traducido" },
      { name: "button_text", label: "Botón", placeholder: "Texto de botón traducido" },
    ]
  }

  return [
    { name: "title", label: "Título", placeholder: "Título traducido" },
    { name: "subtitle", label: "Subtítulo", placeholder: "Subtítulo traducido" },
    {
      name: "description",
      label: "Descripción",
      type: "textarea",
      placeholder: "Descripción traducida",
    },
    { name: "button_text", label: "Botón", placeholder: "Texto de botón traducido" },
  ]
}

function getBannerLink(banner) {
  return banner.link_url || banner.link || banner.url || ""
}

function getBannerMediaUrl(banner) {
  return normalizeBannerMediaUrl(banner)
}

function getMediaTypeFromMime(mime = "") {
  return mime.startsWith("video/") ? "video" : "image"
}

function toApiDateTime(value) {
  return value ? value.replace("T", " ") : ""
}

function toDateTimeLocalValue(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const pad = (number) => String(number).padStart(2, "0")

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

function formatDateTime(value) {
  if (!value) return "Sin fecha"

  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default MarketingPage
