import { useEffect, useMemo, useRef, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import ProductDetailPanel from "./ProductDetailPanel"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel"
import {
  getAdminProducts,
  getAdminProduct,
  createAdminProduct,
  updateAdminProduct,
  updateAdminProductStatus,
  deleteAdminProduct,
  downloadAdminProductsBulkImportLayout,
  previewAdminProductsBulkImport,
  importAdminProductsBulk,
} from "../../../services/api/adminProductService.js"
import {
  createAdminProductGalleryItem,
  deleteAdminProductGalleryItem,
  getAdminProductGallery,
  reorderAdminProductGallery,
  toggleAdminProductGalleryItem,
  updateAdminProductGalleryItem,
} from "../../../services/api/adminProductGalleryService.js"
import {
  createAdminVariantAttributeCatalog,
  createAdminProductVariant,
  createAdminProductVariantAttribute,
  createAdminProductVariantAttributeValue,
  deleteAdminProductVariant,
  deleteAdminProductVariantAttribute,
  deleteAdminProductVariantAttributeValue,
  getAdminVariantAttributeCatalog,
  getAdminProductVariants,
  getAdminProductVariantAttributes,
  updateAdminProductVariant,
  updateAdminProductVariantAttributeValue,
  updateAdminProductVariantStatus,
} from "../../../services/api/adminProductVariantService.js"
import {
  deleteAdminProductPriceScales,
  getAdminProductPriceScales,
  updateAdminProductPriceScales,
} from "../../../services/api/adminProductPriceScaleService.js"
import { getAdminCategories } from "../../../services/api/adminCategoryService.js"
import { getAdminFamilies } from "../../../services/api/adminFamilyService.js"
import { notifyError, notifySuccess } from "../../../utils/toast.js"
import { normalizeMediaUrl } from "../../../utils/mediaUrl.js"
import { useAuth } from "../../../context/AuthContext.jsx"
import useAdminLocalization from "../../hooks/useAdminLocalization.js"
import {
  appendTranslationsToFormData,
  compactTranslations,
  normalizeTranslations,
  setTranslationValue,
} from "../../utils/adminTranslations.js"
import "./ProductsPage.css"

const INITIAL_PRODUCT_FORM = {
  id: null,
  category_id: "",
  family_id: "",
  name: "",
  slug: "",
  description: "",
  short_description: "",
  default_price: "",
  stock: "",
  sku: "",
  brand: "",
  keyword: "",
  is_active: true,
  processed: false,
  translations: {},
  image: null,
  image_url: "",
  image_path: "",
  original_image_url: "",
  category: null,
  family: null,
  created_at: "",
  updated_at: "",
}

const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const PRODUCT_IMAGE_MAX_SIZE = 4 * 1024 * 1024
const GALLERY_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]
const GALLERY_MEDIA_MAX_SIZE = 50 * 1024 * 1024
const VARIANT_COLOR_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]
const VARIANT_COLOR_IMAGE_MAX_SIZE = 5 * 1024 * 1024
const INITIAL_GALLERY_FORM = {
  media: null,
  preview_url: "",
  media_type: "",
  title: "",
  description: "",
  sort_order: "",
  is_active: true,
}
const INITIAL_VARIANT_OPTION_FORM = {
  name: "",
  value: "",
}
const INITIAL_VARIANT_FORM = {
  id: null,
  sku: "",
  name: "",
  price: "",
  compare_price: "",
  stock: "",
  sort_order: "",
  is_active: true,
  applies_promotions: true,
  attribute_value_ids: [],
  metadata_barcode: "",
  metadata_supplier_code: "",
}
const INITIAL_VARIANT_CATALOG_FORM = {
  catalog_attribute_id: "",
  value_ids: [],
  custom_attribute_name: "",
  custom_values: "",
}

const INITIAL_PRICE_SCALE_FORM = {
  scales: [
    {
      from_quantity: "2",
      to_quantity: "",
      discount_percentage: "",
      is_active: true,
    },
  ],
}

const INITIAL_BULK_IMPORT_FORM = {
  file: null,
  mode: "create_or_update",
  import_images: false,
}

const SALES_CHANNEL_LINKS = [
  { channel: "whatsapp", label: "WhatsApp", icon: "bi-whatsapp", className: "is-whatsapp" },
  { channel: "instagram", label: "Instagram", icon: "bi-instagram", className: "is-instagram" },
  { channel: "facebook", label: "Facebook", icon: "bi-facebook", className: "is-facebook" },
  { channel: "tiktok", label: "TikTok", icon: "bi-tiktok", className: "is-tiktok" },
]

const REGIONAL_ADMIN_ROLE = "centro_regional_admin"

function ProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [inlineSavingKey, setInlineSavingKey] = useState("")
  const [imagePreview, setImagePreview] = useState(null)
  const { activeLocales } = useAdminLocalization()
  const [shareMenu, setShareMenu] = useState(null)

  const [filters, setFilters] = useState({
    search: "",
    is_active: "",
    page: 1,
    per_page: 10,
  })

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  })

  const [selectedProductId, setSelectedProductId] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)
  const [panelSaving, setPanelSaving] = useState(false)
  const [panelMode, setPanelMode] = useState("edit") // create | edit
  const [panelForm, setPanelForm] = useState(INITIAL_PRODUCT_FORM)
  const [galleryEnabled, setGalleryEnabled] = useState(false)
  const [galleryItems, setGalleryItems] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [gallerySaving, setGallerySaving] = useState(false)
  const [galleryForm, setGalleryForm] = useState(INITIAL_GALLERY_FORM)
  const [variantAttributes, setVariantAttributes] = useState([])
  const [activeVariantAttributeId, setActiveVariantAttributeId] = useState("")
  const [variantCatalog, setVariantCatalog] = useState([])
  const [variantCatalogLoading, setVariantCatalogLoading] = useState(false)
  const [variants, setVariants] = useState([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [variantsSaving, setVariantsSaving] = useState(false)
  const [variantOptionForm, setVariantOptionForm] = useState(INITIAL_VARIANT_OPTION_FORM)
  const [variantValueDrafts, setVariantValueDrafts] = useState({})
  const [variantForm, setVariantForm] = useState(INITIAL_VARIANT_FORM)
  const [variantCatalogForm, setVariantCatalogForm] = useState(INITIAL_VARIANT_CATALOG_FORM)
  const [priceScalePanelOpen, setPriceScalePanelOpen] = useState(false)
  const [priceScaleLoading, setPriceScaleLoading] = useState(false)
  const [priceScaleSaving, setPriceScaleSaving] = useState(false)
  const [priceScaleProduct, setPriceScaleProduct] = useState(null)
  const [priceScaleForm, setPriceScaleForm] = useState(INITIAL_PRICE_SCALE_FORM)
  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [bulkImportForm, setBulkImportForm] = useState(INITIAL_BULK_IMPORT_FORM)
  const [bulkImportPreview, setBulkImportPreview] = useState(null)
  const [bulkImportAuthorizedRows, setBulkImportAuthorizedRows] = useState([])
  const [bulkImportDownloading, setBulkImportDownloading] = useState(false)
  const [bulkImportPreviewing, setBulkImportPreviewing] = useState(false)
  const [bulkImportSaving, setBulkImportSaving] = useState(false)
  const [categoryCatalog, setCategoryCatalog] = useState([])
  const [familyCatalog, setFamilyCatalog] = useState([])
  const imagePreviewUrlRef = useRef("")
  const galleryPreviewUrlRef = useRef("")
  const gallerySaveTimersRef = useRef({})
  const isRegionalAdmin = String(user?.role?.name || "").toLowerCase() === REGIONAL_ADMIN_ROLE

  useEffect(() => {
    return () => {
      if (imagePreviewUrlRef.current) {
        URL.revokeObjectURL(imagePreviewUrlRef.current)
      }

      if (galleryPreviewUrlRef.current) {
        URL.revokeObjectURL(galleryPreviewUrlRef.current)
      }

      clearGallerySaveTimers()
    }
  }, [])

  useEffect(() => {
    if (!shareMenu) return undefined

    const closeShareMenu = () => setShareMenu(null)

    document.addEventListener("mousedown", closeShareMenu)
    window.addEventListener("resize", closeShareMenu)
    window.addEventListener("scroll", closeShareMenu, true)

    return () => {
      document.removeEventListener("mousedown", closeShareMenu)
      window.removeEventListener("resize", closeShareMenu)
      window.removeEventListener("scroll", closeShareMenu, true)
    }
  }, [shareMenu])

  const categoryOptions = useMemo(() => {
    return buildCatalogEntityOptions(categoryCatalog, panelForm.category)
  }, [categoryCatalog, panelForm.category])

  const familyOptions = useMemo(() => {
    return buildCatalogEntityOptions(familyCatalog, panelForm.family)
  }, [familyCatalog, panelForm.family])

  const missingVariantCombinationCount = useMemo(() => {
    return buildMissingVariantCombinations(variantAttributes, variants).length
  }, [variantAttributes, variants])

  const activeVariantAttribute = useMemo(() => {
    return (
      variantAttributes.find((attribute) => {
        return String(attribute.id) === String(activeVariantAttributeId)
      }) || null
    )
  }, [activeVariantAttributeId, variantAttributes])

  const selectedVariantValues = useMemo(() => {
    return getSelectedVariantValues(variantAttributes, variantForm.attribute_value_ids)
  }, [variantAttributes, variantForm.attribute_value_ids])

  const generatedVariantSku = useMemo(() => {
    return buildVariantSku(panelForm, selectedVariantValues)
  }, [panelForm, selectedVariantValues])

  const variantFormIncomplete = useMemo(() => {
    if (!activeVariantAttribute && !variantAttributes.length) return false

    return (
      selectedVariantValues.length === 0 ||
      variantForm.price === "" ||
      variantForm.stock === ""
    )
  }, [activeVariantAttribute, selectedVariantValues.length, variantAttributes.length, variantForm.price, variantForm.stock])

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.per_page, filters.is_active])

  useEffect(() => {
    if (!panelOpen) return

    fetchVariantCatalog()
  }, [panelOpen])

  useEffect(() => {
    if (!panelOpen) return

    fetchProductCategories()
  }, [panelOpen])

  useEffect(() => {
    if (!panelOpen) return

    if (!panelForm.category_id) {
      setFamilyCatalog([])
      return
    }

    fetchProductFamilies(panelForm.category_id)
  }, [panelOpen, panelForm.category_id])

  async function fetchProducts(customSearch = null) {
    try {
      setLoading(true)

      const params = {
        page: filters.page,
        per_page: filters.per_page,
      }

      const searchValue = customSearch !== null ? customSearch : filters.search

      if (searchValue?.trim()) {
        params.search = searchValue.trim()
      }

      if (filters.is_active !== "") {
        params.is_active = filters.is_active
      }

      const response = await getAdminProducts(params)

      const items = Array.isArray(response?.data) ? response.data.map(normalizeProductMedia) : []
      const meta = response?.meta || {}

      setProducts(items)
      setPagination({
        current_page: meta.current_page || 1,
        last_page: meta.last_page || 1,
        per_page: Number(meta.per_page || filters.per_page),
        total: meta.total || 0,
        from: meta.from || 0,
        to: meta.to || 0,
      })
    } catch (error) {
      console.error("Error al obtener productos:", error)
      notifyError("No fue posible cargar los productos.")
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchVariantAttributes(productId) {
    if (!productId) return

    try {
      const response = await getAdminProductVariantAttributes(productId)
      const items = Array.isArray(response?.data) ? response.data : []
      const sortedItems = sortVariantAttributes(items)

      setVariantAttributes(sortedItems)
      setActiveVariantAttributeId((prev) => {
        if (prev && sortedItems.some((attribute) => String(attribute.id) === String(prev))) return prev
        return sortedItems[0]?.id || ""
      })
    } catch (error) {
      console.error("Error al cargar atributos de variantes:", error)
      setVariantAttributes([])
    }
  }

  async function fetchVariantCatalog() {
    try {
      setVariantCatalogLoading(true)
      const response = await getAdminVariantAttributeCatalog({ is_active: true })
      const items = Array.isArray(response?.data) ? response.data : []

      setVariantCatalog(sortVariantAttributes(items))
    } catch (error) {
      console.error("Error al cargar catálogo de variantes:", error)
      setVariantCatalog([])
    } finally {
      setVariantCatalogLoading(false)
    }
  }

  async function fetchProductCategories() {
    try {
      const response = await getAdminCategories({
        is_active: true,
        per_page: 100,
        sort_by: "name_asc",
      })

      setCategoryCatalog(normalizeEntityCatalog(response))
    } catch (error) {
      console.error("Error al cargar categorías para producto:", error?.response?.data || error)
      notifyError("No fue posible cargar las categorías.")
      setCategoryCatalog([])
    }
  }

  async function fetchProductFamilies(categoryId) {
    try {
      const response = await getAdminFamilies({
        category_id: categoryId,
        is_active: true,
        per_page: 100,
        sort_by: "name_asc",
      })

      setFamilyCatalog(normalizeEntityCatalog(response))
    } catch (error) {
      console.error("Error al cargar familias para producto:", error?.response?.data || error)
      notifyError("No fue posible cargar las familias de la categoría seleccionada.")
      setFamilyCatalog([])
    }
  }

  function handleFilterChange(event) {
    const { name, value } = event.target

    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }))
  }

  function handleSearchSubmit(event) {
    event.preventDefault()

    setFilters((prev) => ({
      ...prev,
      page: 1,
    }))

    fetchProducts(filters.search)
  }

  function handleClearFilters() {
    const resetFilters = {
      search: "",
      is_active: "",
      page: 1,
      per_page: 10,
    }

    setFilters(resetFilters)
    fetchProducts("")
  }

  function mapProductToForm(product = {}) {
    const normalizedProduct = normalizeProductMedia(product)

    return {
      id: normalizedProduct.id || null,
      category_id: normalizedProduct.category_id ?? "",
      family_id: normalizedProduct.family_id ?? "",
      name: normalizedProduct.name || "",
      slug: normalizedProduct.slug || "",
      description: normalizedProduct.description || "",
      short_description: normalizedProduct.short_description || "",
      default_price: normalizedProduct.default_price_number ?? normalizedProduct.default_price ?? "",
      stock: normalizedProduct.stock ?? "",
      sku: normalizedProduct.sku || "",
      brand: normalizedProduct.brand || "",
      keyword: normalizedProduct.keyword || "",
      is_active: Boolean(normalizedProduct.is_active),
      processed: Boolean(normalizedProduct.processed),
      translations: normalizeTranslations(normalizedProduct.translations),
      image: null,
      image_url: normalizedProduct.image_url || "",
      image_path: normalizedProduct.image_path || "",
      original_image_url: normalizedProduct.image_url || "",
      category: normalizedProduct.category || null,
      family: normalizedProduct.family || null,
      created_at: normalizedProduct.created_at || "",
      updated_at: normalizedProduct.updated_at || "",
    }
  }

  async function handleOpenPanel(productId) {
    try {
      revokeImagePreview()
      clearGallerySaveTimers()
      setPanelMode("edit")
      setPanelOpen(true)
      setSelectedProductId(productId)
      setPanelLoading(true)

      const response = await getAdminProduct(productId)
      const product = normalizeProductMedia(response?.data || {})
      const loadedGallery = sortGalleryItems(Array.isArray(product.gallery) ? product.gallery : [])
      const loadedVariants = sortVariants(Array.isArray(product.variants) ? product.variants : [])
      const loadedVariantAttributes = buildProductVariantAttributes(product)

      setPanelForm(mapProductToForm(product))
      setGalleryEnabled(loadedGallery.length > 0)
      setGalleryItems(loadedGallery)
      setVariants(loadedVariants)
      setVariantAttributes(loadedVariantAttributes)
      setActiveVariantAttributeId(loadedVariantAttributes[0]?.id || "")
      resetVariantForms()
      resetGalleryForm()

      if (!loadedVariantAttributes.length) {
        await fetchVariantAttributes(productId)
      }
    } catch (error) {
      console.error("Error al cargar detalle del producto:", error)
      notifyError("No fue posible cargar el detalle del producto.")
      setPanelOpen(false)
      setSelectedProductId(null)
    } finally {
      setPanelLoading(false)
    }
  }

  function handleOpenCreatePanel() {
    revokeImagePreview()
    clearGallerySaveTimers()
    setPanelMode("create")
    setSelectedProductId(null)
    setPanelForm(INITIAL_PRODUCT_FORM)
    setGalleryEnabled(false)
    setGalleryItems([])
    setVariants([])
    setVariantAttributes([])
    setActiveVariantAttributeId("")
    resetVariantForms()
    resetGalleryForm()
    setPanelOpen(true)
    setPanelLoading(false)
  }

  function handleClosePanel() {
    if (panelSaving) return

    revokeImagePreview()
    clearGallerySaveTimers()
    setPanelOpen(false)
    setSelectedProductId(null)
    setPanelForm(INITIAL_PRODUCT_FORM)
    setGalleryEnabled(false)
    setGalleryItems([])
    setVariants([])
    setVariantAttributes([])
    setActiveVariantAttributeId("")
    setVariantCatalogForm(INITIAL_VARIANT_CATALOG_FORM)
    resetVariantForms()
    resetGalleryForm()
    setPanelMode("edit")
  }

  function revokeImagePreview() {
    if (!imagePreviewUrlRef.current) return

    URL.revokeObjectURL(imagePreviewUrlRef.current)
    imagePreviewUrlRef.current = ""
  }

  function revokeGalleryPreview() {
    if (!galleryPreviewUrlRef.current) return

    URL.revokeObjectURL(galleryPreviewUrlRef.current)
    galleryPreviewUrlRef.current = ""
  }

  function resetGalleryForm() {
    revokeGalleryPreview()
    setGalleryForm(INITIAL_GALLERY_FORM)
  }

  function resetVariantForms() {
    setVariantOptionForm(INITIAL_VARIANT_OPTION_FORM)
    setVariantValueDrafts({})
    setVariantForm(INITIAL_VARIANT_FORM)
    setVariantCatalogForm(INITIAL_VARIANT_CATALOG_FORM)
  }

  function clearGallerySaveTimers() {
    Object.values(gallerySaveTimersRef.current).forEach((timerId) => {
      clearTimeout(timerId)
    })
    gallerySaveTimersRef.current = {}
  }

  function handlePanelChange(event) {
    const { name, value, type, checked, files } = event.target

    if (type === "file") {
      const file = files?.[0] || null

      revokeImagePreview()

      if (!file) {
        setPanelForm((prev) => ({
          ...prev,
          image: null,
          image_url: prev.original_image_url || "",
        }))
        return
      }

      if (!PRODUCT_IMAGE_TYPES.includes(file.type)) {
        event.target.value = ""
        notifyError("La imagen debe ser JPG, PNG o WEBP.")
        setPanelForm((prev) => ({
          ...prev,
          image: null,
          image_url: prev.original_image_url || "",
        }))
        return
      }

      if (file.size > PRODUCT_IMAGE_MAX_SIZE) {
        event.target.value = ""
        notifyError("La imagen no debe superar 4 MB.")
        setPanelForm((prev) => ({
          ...prev,
          image: null,
          image_url: prev.original_image_url || "",
        }))
        return
      }

      const previewUrl = URL.createObjectURL(file)
      imagePreviewUrlRef.current = previewUrl

      setPanelForm((prev) => ({
        ...prev,
        image: file,
        image_url: previewUrl,
      }))
      return
    }

    setPanelForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  function handlePanelTranslationChange(field, locale, value) {
    setPanelForm((prev) => ({
      ...prev,
      translations: setTranslationValue(prev.translations, field, locale, value),
    }))
  }

  function handleEntitySelect(type, option) {
    setPanelForm((prev) => ({
      ...prev,
      [`${type}_id`]: option?.id ?? "",
      [type]: option ? { id: option.id, name: option.name } : null,
      ...(type === "category"
        ? {
            family_id: "",
            family: null,
          }
        : {}),
    }))
  }

  function handleEntityCreate(type, name) {
    notifyError(
      `Crea "${name}" desde Catálogos > ${type === "category" ? "Categorías" : "Familias"} y vuelve a seleccionarlo aquí.`
    )
  }

  async function handleGalleryToggle() {
    const nextEnabled = !galleryEnabled

    setGalleryEnabled(nextEnabled)

    if (!nextEnabled || !selectedProductId || galleryItems.length > 0) return

    await fetchGallery(selectedProductId)
  }

  async function fetchGallery(productId) {
    try {
      setGalleryLoading(true)

      const response = await getAdminProductGallery(productId)
      const items = Array.isArray(response?.data) ? response.data.map(normalizeGalleryItemMedia) : []

      setGalleryItems(sortGalleryItems(items))
    } catch (error) {
      console.error("Error al cargar galería:", error)
      notifyError("No fue posible cargar la galería del producto.")
      setGalleryItems([])
    } finally {
      setGalleryLoading(false)
    }
  }

  async function fetchVariants(productId) {
    try {
      setVariantsLoading(true)

      const response = await getAdminProductVariants(productId)
      const items = Array.isArray(response?.data) ? response.data : []

      setVariants(sortVariants(items))
    } catch (error) {
      console.error("Error al cargar variantes:", error)
      notifyError("No fue posible cargar las variantes del producto.")
      setVariants([])
    } finally {
      setVariantsLoading(false)
    }
  }

  async function handleGalleryFormChange(event) {
    const { name, value, type, checked, files } = event.target

    if (type === "file") {
      const selectedFiles = Array.from(files || [])

      revokeGalleryPreview()

      if (!selectedFiles.length) {
        setGalleryForm((prev) => ({
          ...prev,
          media: null,
          preview_url: "",
          media_type: "",
        }))
        return
      }

      const invalidFile = selectedFiles.find((file) => !GALLERY_MEDIA_TYPES.includes(file.type))

      if (invalidFile) {
        event.target.value = ""
        notifyError("La galería acepta JPG, PNG, MP4, WEBM o MOV.")
        return
      }

      const oversizedFile = selectedFiles.find((file) => file.size > GALLERY_MEDIA_MAX_SIZE)

      if (oversizedFile) {
        event.target.value = ""
        notifyError("El archivo de galería no debe superar 50 MB.")
        return
      }

      const nextItems = selectedFiles.map((file, index) => ({
        id: `pending-${Date.now()}-${index}`,
        pending: true,
        media: file,
        media_type: file.type.startsWith("image/") ? "image" : "video",
        media_url: URL.createObjectURL(file),
        title: "",
        description: "",
        sort_order: galleryItems.length + index + 1,
        is_active: true,
      }))

      setGalleryItems((prev) => sortGalleryItems([...prev, ...nextItems]))
      setGalleryForm(INITIAL_GALLERY_FORM)
      event.target.value = ""

      if (!selectedProductId) {
        return
      }

      try {
        setGallerySaving(true)
        await Promise.all(
          nextItems.map((item) =>
            createGalleryItem(selectedProductId, {
              media: item.media,
              media_type: item.media_type,
              sort_order: item.sort_order,
              is_active: true,
            })
          )
        )

        notifySuccess(
          nextItems.length > 1
            ? "Archivos agregados a la galería."
            : "Archivo agregado a la galería."
        )
        await fetchGallery(selectedProductId)
      } catch (error) {
        console.error("Error al agregar galería:", error)
        notifyError(error?.response?.data?.message || "No fue posible agregar los archivos a la galería.")
        await fetchGallery(selectedProductId)
      } finally {
        nextItems.forEach((item) => URL.revokeObjectURL(item.media_url))
        setGallerySaving(false)
      }

      return
    }

    setGalleryForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  async function handleGalleryAdd() {
    if (!galleryForm.media) {
      notifyError("Selecciona un archivo para agregarlo a la galería.")
      return
    }

    if (!selectedProductId) {
      const pendingItem = {
        id: `pending-${Date.now()}`,
        pending: true,
        media: galleryForm.media,
        media_type: galleryForm.media_type,
        media_url: galleryForm.preview_url,
        title: galleryForm.title,
        description: galleryForm.description,
        sort_order: Number(galleryForm.sort_order || galleryItems.length + 1),
        is_active: Boolean(galleryForm.is_active),
      }

      setGalleryItems((prev) => sortGalleryItems([...prev, pendingItem]))
      setGalleryForm(INITIAL_GALLERY_FORM)
      galleryPreviewUrlRef.current = ""
      return
    }

    try {
      setGallerySaving(true)

      await createGalleryItem(selectedProductId, galleryForm)
      notifySuccess("Archivo agregado a la galería.")
      resetGalleryForm()
      fetchGallery(selectedProductId)
    } catch (error) {
      console.error("Error al agregar galería:", error)
      notifyError(error?.response?.data?.message || "No fue posible agregar el archivo a la galería.")
    } finally {
      setGallerySaving(false)
    }
  }

  function handleGalleryItemChange(itemId, field, value) {
    let nextItem = null

    setGalleryItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item

        nextItem = {
          ...item,
          [field]: value,
        }

        return nextItem
      })
    )

    if (nextItem) {
      scheduleGalleryItemSave(nextItem)
    }
  }

  function scheduleGalleryItemSave(item) {
    if (!selectedProductId || item.pending) return

    if (gallerySaveTimersRef.current[item.id]) {
      clearTimeout(gallerySaveTimersRef.current[item.id])
    }

    gallerySaveTimersRef.current[item.id] = setTimeout(async () => {
      try {
        await updateAdminProductGalleryItem(selectedProductId, item.id, {
          title: item.title || "",
          description: item.description || "",
          sort_order: Number(item.sort_order || 0),
          is_active: Boolean(item.is_active),
        })
      } catch (error) {
        console.error("Error al guardar galería:", error)
        notifyError(error?.response?.data?.message || "No fue posible guardar la información de galería.")
      } finally {
        delete gallerySaveTimersRef.current[item.id]
      }
    }, 700)
  }

  async function handleGalleryItemToggle(itemId) {
    if (!selectedProductId) {
      setGalleryItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                is_active: !item.is_active,
              }
            : item
        )
      )
      return
    }

    try {
      setGallerySaving(true)
      await toggleAdminProductGalleryItem(selectedProductId, itemId)
      await fetchGallery(selectedProductId)
      notifySuccess("Estatus de galería actualizado.")
    } catch (error) {
      console.error("Error al alternar galería:", error)
      notifyError("No fue posible actualizar el estatus de la galería.")
    } finally {
      setGallerySaving(false)
    }
  }

  async function handleGalleryDelete(itemId) {
    const item = galleryItems.find((galleryItem) => galleryItem.id === itemId)

    if (!item) return

    if (!selectedProductId || item.pending) {
      if (item.media_url?.startsWith("blob:")) {
        URL.revokeObjectURL(item.media_url)
      }

      setGalleryItems((prev) =>
        sortGalleryItems(
          prev
            .filter((galleryItem) => galleryItem.id !== itemId)
            .map((galleryItem, index) => ({
              ...galleryItem,
              sort_order: index + 1,
            }))
        )
      )
      return
    }

    try {
      setGallerySaving(true)
      await deleteAdminProductGalleryItem(selectedProductId, itemId)
      setGalleryItems((prev) =>
        sortGalleryItems(
          prev
            .filter((galleryItem) => galleryItem.id !== itemId)
            .map((galleryItem, index) => ({
              ...galleryItem,
              sort_order: index + 1,
            }))
        )
      )
      notifySuccess("Archivo eliminado de la galería.")
      await fetchGallery(selectedProductId)
    } catch (error) {
      console.error("Error al eliminar galería:", error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar el archivo de galería.")
    } finally {
      setGallerySaving(false)
    }
  }

  async function handleGalleryMove(itemId, direction) {
    const currentIndex = galleryItems.findIndex((item) => item.id === itemId)
    const nextIndex = currentIndex + direction

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= galleryItems.length) return

    const nextItems = [...galleryItems]
    const [item] = nextItems.splice(currentIndex, 1)
    nextItems.splice(nextIndex, 0, item)

    const normalizedItems = nextItems.map((galleryItem, index) => ({
      ...galleryItem,
      sort_order: index + 1,
    }))

    setGalleryItems(normalizedItems)

    if (!selectedProductId || normalizedItems.some((galleryItem) => galleryItem.pending)) return

    try {
      setGallerySaving(true)
      await reorderAdminProductGallery(
        selectedProductId,
        normalizedItems.map((galleryItem) => ({
          id: galleryItem.id,
          sort_order: galleryItem.sort_order,
        }))
      )
      notifySuccess("Orden de galería actualizado.")
    } catch (error) {
      console.error("Error al reordenar galería:", error)
      notifyError("No fue posible actualizar el orden de la galería.")
      fetchGallery(selectedProductId)
    } finally {
      setGallerySaving(false)
    }
  }

  async function createGalleryItem(productId, form) {
    const payload = new FormData()

    payload.append("media", form.media)

    if (form.media_type) payload.append("media_type", form.media_type)
    if (form.title) payload.append("title", form.title)
    if (form.description) payload.append("description", form.description)
    payload.append("sort_order", String(form.sort_order || galleryItems.length + 1))
    payload.append("is_active", form.is_active ? "1" : "0")

    return createAdminProductGalleryItem(productId, payload)
  }

  async function uploadPendingGallery(productId) {
    const pendingItems = galleryItems.filter((item) => item.pending && item.media)

    if (!pendingItems.length) return

    await Promise.all(
      pendingItems.map((item, index) =>
        createGalleryItem(productId, {
          media: item.media,
          media_type: item.media_type,
          sort_order: item.sort_order || index + 1,
          is_active: true,
        })
      )
    )
  }

  function handleVariantOptionFormChange(event) {
    const { name, value } = event.target

    setVariantOptionForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleVariantOptionAdd() {
    const attributeName = variantOptionForm.name.trim()
    const valueName = variantOptionForm.value.trim()

    if (!attributeName || !valueName) {
      notifyError("Escribe el nombre de la opción y al menos un valor.")
      return
    }

    try {
      setVariantsSaving(true)

      let attribute = findVariantAttributeByName(variantAttributes, attributeName)

      if (!selectedProductId) {
        const valueNames = valueName
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)

        setVariantAttributes((prev) => {
          const existingAttribute = findVariantAttributeByName(prev, attributeName)

          if (existingAttribute) {
            return prev.map((item) =>
              item.id === existingAttribute.id
                ? {
                    ...item,
                    values: [
                      ...(item.values || []),
                      ...valueNames.map((value, index) => ({
                        id: `pending-value-${Date.now()}-${index}`,
                        pending: true,
                        value,
                        slug: slugify(value),
                        sort_order: (item.values?.length || 0) + index + 1,
                        is_active: true,
                        metadata: {},
                      })),
                    ],
                  }
                : item
            )
          }

          return [
            ...prev,
            {
              id: `pending-attribute-${Date.now()}`,
              pending: true,
              name: attributeName,
              slug: slugify(attributeName),
              sort_order: prev.length + 1,
              is_active: true,
              values: valueNames.map((value, index) => ({
                id: `pending-value-${Date.now()}-${index}`,
                pending: true,
                value,
                slug: slugify(value),
                sort_order: index + 1,
                is_active: true,
                metadata: {},
              })),
            },
          ]
        })

        setVariantOptionForm(INITIAL_VARIANT_OPTION_FORM)
        notifySuccess("Opción de variante agregada. Se guardará al crear el producto.")
        return
      }

      if (!attribute || attribute.pending) {
        const response = await createAdminProductVariantAttribute(selectedProductId, {
          name: attributeName,
          slug: slugify(attributeName),
          sort_order: variantAttributes.length + 1,
          is_active: true,
        })
        attribute = response?.data
      }

      if (!attribute?.id) {
        throw new Error("No fue posible crear la opción.")
      }

      const valueNames = valueName
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)

      await Promise.all(
        valueNames.map((item, index) =>
          createAdminProductVariantAttributeValue(selectedProductId, attribute.id, {
            value: item,
            slug: slugify(item),
            sort_order: (attribute.values?.length || 0) + index + 1,
            is_active: true,
            metadata: {},
          })
        )
      )

      await fetchVariantAttributes(selectedProductId)
      setVariantOptionForm(INITIAL_VARIANT_OPTION_FORM)
      notifySuccess("Opción de variante agregada.")
    } catch (error) {
      console.error("Error al agregar opción de variante:", error)
      notifyError(error?.response?.data?.message || "No fue posible agregar la opción de variante.")
    } finally {
      setVariantsSaving(false)
    }
  }

  function handleVariantValueDraftChange(attributeId, field, value) {
    setVariantValueDrafts((prev) => ({
      ...prev,
      [attributeId]: {
        ...(typeof prev[attributeId] === "object" ? prev[attributeId] : { value: prev[attributeId] || "" }),
        [field]: value,
      },
    }))
  }

  async function handleVariantAttributeValueAdd(attribute) {
    const draft =
      typeof variantValueDrafts[attribute.id] === "object"
        ? variantValueDrafts[attribute.id]
        : { value: variantValueDrafts[attribute.id] || "" }
    const valueName = (draft.value || "").trim()
    const isColor = isColorVariantAttribute(attribute)

    if (isColor && draft.image && !isValidVariantColorImage(draft.image)) {
      notifyError("La imagen del color debe ser JPG, PNG, WEBP, GIF o SVG y pesar máximo 5 MB.")
      return
    }

    if (!attribute?.name || !valueName) {
      notifyError("Escribe al menos un valor.")
      return
    }

    const valueNames = valueName
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)

    if (!valueNames.length) {
      notifyError("Escribe al menos un valor.")
      return
    }

    try {
      setVariantsSaving(true)

      if (!selectedProductId || attribute.pending) {
        setVariantAttributes((prev) =>
          prev.map((item) =>
            item.id === attribute.id
              ? {
                  ...item,
                  values: [
                    ...(item.values || []),
                    ...valueNames.map((value, index) => ({
                      id: `pending-value-${Date.now()}-${index}`,
                      pending: true,
                      value,
                      slug: slugify(value),
                      sort_order: (item.values?.length || 0) + index + 1,
                      is_active: true,
                      metadata: isColor && draft.hex ? { hex: draft.hex } : {},
                      color_image: isColor && draft.preview_url ? { url: draft.preview_url } : null,
                      image_file: isColor ? draft.image || null : null,
                    })),
                  ],
                }
              : item
          )
        )
        setVariantValueDrafts((prev) => ({ ...prev, [attribute.id]: {} }))
        notifySuccess("Valores agregados. Se guardarán al crear el producto.")
        return
      }

      await Promise.all(
        valueNames.map((item, index) =>
          createAdminProductVariantAttributeValue(
            selectedProductId,
            attribute.id,
            buildVariantAttributeValuePayload(attribute, {
              value: item,
              slug: slugify(item),
              sort_order: (attribute.values?.length || 0) + index + 1,
              is_active: true,
              hex: draft.hex,
              image: index === 0 ? draft.image : null,
            })
          )
        )
      )

      await fetchVariantAttributes(selectedProductId)
      setVariantValueDrafts((prev) => ({ ...prev, [attribute.id]: {} }))
      notifySuccess("Valores agregados.")
    } catch (error) {
      console.error("Error al agregar valores de variante:", error)
      notifyError(getVariantAttributeValueErrorMessage(error, "No fue posible agregar los valores."))
    } finally {
      setVariantsSaving(false)
    }
  }

  async function handleVariantAttributeValueDelete(attribute, value) {
    if (!attribute?.id || !value?.id) return

    if (
      !window.confirm(
        `¿Eliminar "${value.value}" de ${attribute.name}? Las variantes que usen este valor podrían verse afectadas.`
      )
    ) {
      return
    }

    if (!selectedProductId || attribute.pending || value.pending) {
      setVariantAttributes((prev) =>
        prev.map((item) =>
          item.id === attribute.id
            ? {
                ...item,
                values: (item.values || []).filter((attributeValue) => {
                  return String(attributeValue.id) !== String(value.id)
                }),
              }
            : item
        )
      )
      setVariantForm((prev) => ({
        ...prev,
        attribute_value_ids: prev.attribute_value_ids.filter((selectedValueId) => {
          return Number(selectedValueId) !== Number(value.id)
        }),
      }))
      notifySuccess("Valor eliminado.")
      return
    }

    try {
      setVariantsSaving(true)
      await deleteAdminProductVariantAttributeValue(selectedProductId, attribute.id, value.id)
      await fetchVariantAttributes(selectedProductId)
      setVariantForm((prev) => ({
        ...prev,
        attribute_value_ids: prev.attribute_value_ids.filter((selectedValueId) => {
          return Number(selectedValueId) !== Number(value.id)
        }),
      }))
      notifySuccess("Valor eliminado.")
    } catch (error) {
      console.error("Error al eliminar valor de variante:", error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar el valor.")
    } finally {
      setVariantsSaving(false)
    }
  }

  async function handleVariantAttributeValueImageUpdate(attribute, value, file) {
    if (!selectedProductId || !attribute?.id || !value?.id || !isColorVariantAttribute(attribute)) return

    if (!isValidVariantColorImage(file)) {
      notifyError("La imagen del color debe ser JPG, PNG, WEBP, GIF o SVG y pesar máximo 5 MB.")
      return
    }

    try {
      setVariantsSaving(true)
      await updateAdminProductVariantAttributeValue(
        selectedProductId,
        attribute.id,
        value.id,
        buildVariantAttributeValuePayload(attribute, {
          value: value.value,
          slug: value.slug || slugify(value.value),
          sort_order: value.sort_order || 1,
          is_active: Boolean(value.is_active ?? true),
          hex: value.metadata?.hex || "",
          image: file,
        })
      )
      await fetchVariantAttributes(selectedProductId)
      notifySuccess("Imagen de color actualizada.")
    } catch (error) {
      console.error("Error al actualizar imagen de color:", error)
      notifyError(getVariantAttributeValueErrorMessage(error, "No fue posible actualizar la imagen."))
    } finally {
      setVariantsSaving(false)
    }
  }

  async function handleVariantAttributeValueImageRemove(attribute, value) {
    if (!selectedProductId || !attribute?.id || !value?.id || !isColorVariantAttribute(attribute)) return

    try {
      setVariantsSaving(true)
      await updateAdminProductVariantAttributeValue(
        selectedProductId,
        attribute.id,
        value.id,
        buildVariantAttributeValuePayload(attribute, {
          value: value.value,
          slug: value.slug || slugify(value.value),
          sort_order: value.sort_order || 1,
          is_active: Boolean(value.is_active ?? true),
          hex: value.metadata?.hex || "",
          remove_image: true,
        })
      )
      await fetchVariantAttributes(selectedProductId)
      notifySuccess("Imagen de color eliminada.")
    } catch (error) {
      console.error("Error al quitar imagen de color:", error)
      notifyError(getVariantAttributeValueErrorMessage(error, "No fue posible quitar la imagen."))
    } finally {
      setVariantsSaving(false)
    }
  }

  function handleVariantCatalogFormChange(event) {
    const { name, value } = event.target

    setVariantCatalogForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleVariantCatalogAttributeChange(event) {
    const attributeId = event.target.value
    if (attributeId === "custom") {
      setVariantCatalogForm((prev) => ({
        ...prev,
        catalog_attribute_id: attributeId,
        value_ids: [],
      }))
      return
    }

    const attribute = variantCatalog.find((item) => Number(item.id) === Number(attributeId))

    setVariantCatalogForm((prev) => ({
      ...prev,
      catalog_attribute_id: attributeId,
      value_ids: attribute?.values?.length === 1 ? [Number(attribute.values[0].id)] : [],
    }))
  }

  function handleVariantCatalogValueToggle(valueId) {
    setVariantCatalogForm((prev) => {
      const normalizedValueId = Number(valueId)
      const alreadySelected = prev.value_ids.some((selectedValueId) => {
        return Number(selectedValueId) === normalizedValueId
      })

      return {
        ...prev,
        value_ids: alreadySelected
          ? prev.value_ids.filter((selectedValueId) => Number(selectedValueId) !== normalizedValueId)
          : [...prev.value_ids, normalizedValueId],
      }
    })
  }

  async function handleVariantCatalogCreateAttribute() {
    const attributeName = variantCatalogForm.custom_attribute_name.trim()

    if (!attributeName) {
      notifyError("Escribe el nombre del atributo personalizado.")
      return
    }

    try {
      setVariantsSaving(true)
      const response = await createAdminVariantAttributeCatalog({
        name: attributeName,
        slug: slugify(attributeName),
        sort_order: variantCatalog.length + 1,
        is_active: true,
      })
      const createdAttribute = response?.data

      if (!createdAttribute?.id) {
        throw new Error("No fue posible crear el atributo personalizado.")
      }

      await fetchVariantCatalog()
      setVariantCatalogForm((prev) => ({
        ...prev,
        catalog_attribute_id: String(createdAttribute.id),
        value_ids: [],
        custom_attribute_name: "",
        custom_values: "",
      }))
      await handleVariantCatalogImport(createdAttribute)
      notifySuccess("Atributo personalizado creado.")
    } catch (error) {
      console.error("Error al crear atributo personalizado:", error)
      notifyError(error?.response?.data?.message || "No fue posible crear el atributo personalizado.")
    } finally {
      setVariantsSaving(false)
    }
  }

  async function handleVariantCatalogImport(forcedAttribute = null) {
    const catalogAttributeId = Number(variantCatalogForm.catalog_attribute_id)
    const selectedAttribute =
      forcedAttribute || variantCatalog.find((item) => Number(item.id) === catalogAttributeId)

    if (!selectedAttribute?.id) {
      notifyError("Elige un atributo del catálogo.")
      return
    }

    const existingAttribute = findVariantAttributeByName(variantAttributes, selectedAttribute.name)

    if (existingAttribute?.id) {
      setActiveVariantAttributeId(existingAttribute.id)
      notifySuccess("Atributo seleccionado.")
      return
    }

    if (!selectedProductId) {
      const pendingAttribute = {
        id: `pending-attribute-${Date.now()}`,
        pending: true,
        name: selectedAttribute.name,
        slug: selectedAttribute.slug || slugify(selectedAttribute.name),
        sort_order: variantAttributes.length + 1,
        is_active: true,
        values: [],
      }

      setVariantAttributes((prev) => [...prev, pendingAttribute])
      setActiveVariantAttributeId(pendingAttribute.id)
      setVariantCatalogForm((prev) => ({ ...prev, value_ids: [] }))
      notifySuccess("Atributo seleccionado. Se guardará al crear el producto.")
      return
    }

    try {
      setVariantsSaving(true)
      const response = await createAdminProductVariantAttribute(selectedProductId, {
        name: selectedAttribute.name,
        slug: selectedAttribute.slug || slugify(selectedAttribute.name),
        sort_order: variantAttributes.length + 1,
        is_active: true,
      })
      const createdAttribute = response?.data

      await fetchVariantAttributes(selectedProductId)
      setActiveVariantAttributeId(createdAttribute?.id || "")
      setVariantCatalogForm((prev) => ({ ...prev, value_ids: [] }))
      notifySuccess("Atributo seleccionado.")
    } catch (error) {
      console.error("Error al importar atributo del catálogo:", error)
      notifyError(error?.response?.data?.message || "No fue posible seleccionar el atributo.")
    } finally {
      setVariantsSaving(false)
    }
  }

  async function handleVariantAttributeDelete(attribute) {
    if (!attribute?.id) return

    if (
      !window.confirm(
        `¿Eliminar el atributo "${attribute.name}"? También se eliminarán sus valores y variantes relacionadas.`
      )
    ) {
      return
    }

    if (!selectedProductId || attribute.pending) {
      setVariantAttributes((prev) =>
        prev.filter((item) => String(item.id) !== String(attribute.id))
      )
      setActiveVariantAttributeId("")
      setVariantForm(INITIAL_VARIANT_FORM)
      notifySuccess("Atributo eliminado.")
      return
    }

    try {
      setVariantsSaving(true)
      const response = await deleteAdminProductVariantAttribute(selectedProductId, attribute.id)
      const deletedValuesCount = Number(response?.data?.deleted_values_count || 0)
      const deletedVariantsCount = Number(response?.data?.deleted_variants_count || 0)

      await Promise.all([
        fetchVariantAttributes(selectedProductId),
        fetchVariants(selectedProductId),
      ])
      setVariantForm(INITIAL_VARIANT_FORM)
      notifySuccess(
        `Atributo eliminado. Se quitaron ${deletedValuesCount} valor(es) y ${deletedVariantsCount} variante(s).`
      )
    } catch (error) {
      console.error("Error al eliminar atributo de variante:", error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar el atributo.")
    } finally {
      setVariantsSaving(false)
    }
  }

  async function handleGenerateVariantCombinations() {
    if (!selectedProductId) {
      notifyError("Primero guarda el producto. Después podrás generar variantes.")
      return
    }

    const combinations = buildMissingVariantCombinations(variantAttributes, variants)

    if (!combinations.length) {
      notifyError("No hay combinaciones nuevas por generar.")
      return
    }

    try {
      setVariantsSaving(true)
      await Promise.all(
        combinations.map((combination, index) =>
          createAdminProductVariant(
            selectedProductId,
            buildGeneratedVariantPayload(combination, panelForm, variants.length + index + 1)
          )
        )
      )
      await fetchVariants(selectedProductId)
      notifySuccess(`${combinations.length} variante${combinations.length === 1 ? "" : "s"} generada${combinations.length === 1 ? "" : "s"}.`)
    } catch (error) {
      console.error("Error al generar combinaciones de variantes:", error)
      notifyError(error?.response?.data?.message || "No fue posible generar las variantes.")
    } finally {
      setVariantsSaving(false)
    }
  }

  function handleVariantFormChange(event) {
    const { name, value, type, checked } = event.target

    setVariantForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  function handleVariantValueToggle(attributeId, valueId) {
    setVariantForm((prev) => {
      const valueIdsForOtherAttributes = prev.attribute_value_ids.filter((selectedValueId) => {
        const selectedAttribute = findAttributeByValueId(variantAttributes, selectedValueId)
        return Number(selectedAttribute?.id) !== Number(attributeId)
      })

      const alreadySelected = prev.attribute_value_ids.some(
        (selectedValueId) => Number(selectedValueId) === Number(valueId)
      )

      return {
        ...prev,
        attribute_value_ids: alreadySelected
          ? valueIdsForOtherAttributes
          : [...valueIdsForOtherAttributes, Number(valueId)],
      }
    })
  }

  async function handleVariantSave() {
    if (!variantForm.attribute_value_ids.length) {
      notifyError("Selecciona al menos un valor del producto para guardar la variante.")
      return
    }

    if (variantForm.price === "" || Number(variantForm.price) < 0) {
      notifyError("Agrega un precio válido para la variante.")
      return
    }

    if (variantForm.stock === "" || Number(variantForm.stock) < 0) {
      notifyError("Agrega un stock válido para la variante.")
      return
    }

    if (!selectedProductId) {
      notifyError("Primero guarda el producto. Después podrás crear variantes con SKU, precio y stock.")
      return
    }

    const payload = buildVariantPayload(
      {
        ...variantForm,
        sku: generatedVariantSku,
        name: "",
        compare_price: "",
        sort_order: "",
        metadata_barcode: "",
        metadata_supplier_code: "",
      },
      variants.length + 1
    )

    try {
      setVariantsSaving(true)

      if (variantForm.id) {
        await updateAdminProductVariant(selectedProductId, variantForm.id, payload)
        notifySuccess("Variante actualizada.")
      } else {
        await createAdminProductVariant(selectedProductId, payload)
        notifySuccess("Variante creada.")
      }

      setVariantForm(INITIAL_VARIANT_FORM)
      fetchVariants(selectedProductId)
    } catch (error) {
      console.error("Error al guardar variante:", error)
      notifyError(error?.response?.data?.message || "No fue posible guardar la variante.")
    } finally {
      setVariantsSaving(false)
    }
  }

  function handleVariantEdit(variant) {
    setVariantForm({
      id: variant.id,
      sku: variant.sku || "",
      name: variant.name || "",
      price: variant.price_number ?? variant.price ?? "",
      compare_price: variant.compare_price_number ?? variant.compare_price ?? "",
      stock: variant.stock ?? "",
      sort_order: variant.sort_order ?? "",
      is_active: Boolean(variant.is_active),
      applies_promotions: Boolean(variant.applies_promotions),
      attribute_value_ids: Array.isArray(variant.attribute_value_ids)
        ? variant.attribute_value_ids.map(Number)
        : [],
      metadata_barcode: variant.metadata?.barcode || "",
      metadata_supplier_code: variant.metadata?.supplier_code || "",
    })
  }

  async function handleVariantStatusChange(variantId, nextStatus) {
    if (!selectedProductId) {
      setVariants((prev) =>
        prev.map((variant) =>
          variant.id === variantId ? { ...variant, is_active: nextStatus } : variant
        )
      )
      return
    }

    try {
      setVariantsSaving(true)
      await updateAdminProductVariantStatus(selectedProductId, variantId, nextStatus)
      fetchVariants(selectedProductId)
    } catch (error) {
      console.error("Error al actualizar variante:", error)
      notifyError("No fue posible actualizar la variante.")
    } finally {
      setVariantsSaving(false)
    }
  }

  async function handleVariantDelete(variant) {
    if (!variant?.id) return

    if (!window.confirm(`¿Eliminar la variante "${variant.sku || variant.name}"?`)) return

    if (!selectedProductId || variant.pending) {
      setVariants((prev) => prev.filter((item) => String(item.id) !== String(variant.id)))
      notifySuccess("Variante eliminada.")
      return
    }

    try {
      setVariantsSaving(true)
      await deleteAdminProductVariant(selectedProductId, variant.id)
      await fetchVariants(selectedProductId)
      notifySuccess("Variante eliminada.")
    } catch (error) {
      console.error("Error al eliminar variante:", error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar la variante.")
    } finally {
      setVariantsSaving(false)
    }
  }

  async function uploadPendingVariants(productId) {
    const pendingVariants = variants.filter((variant) => variant.pending)

    if (!pendingVariants.length) return

    await Promise.all(
      pendingVariants.map((variant, index) =>
        createAdminProductVariant(
          productId,
          buildVariantPayload(
            {
              ...variant,
              attribute_value_ids: variant.attribute_value_ids || [],
              metadata_barcode: variant.metadata?.barcode || "",
              metadata_supplier_code: variant.metadata?.supplier_code || "",
            },
            index + 1
          )
        )
      )
    )
  }

  async function uploadPendingVariantAttributes(productId) {
    const pendingAttributes = variantAttributes.filter((attribute) => attribute.pending)
    const existingAttributes = variantAttributes.filter((attribute) => !attribute.pending)

    await Promise.all(
      existingAttributes.map(async (attribute) => {
        const pendingValues = (attribute.values || []).filter((value) => value.pending)

        if (!pendingValues.length) return

        await Promise.all(
          pendingValues.map((value, index) =>
            createAdminProductVariantAttributeValue(
              productId,
              attribute.id,
              buildVariantAttributeValuePayload(attribute, {
                value: value.value,
                slug: value.slug || slugify(value.value),
                sort_order: value.sort_order || (attribute.values?.length || 0) + index + 1,
                is_active: Boolean(value.is_active ?? true),
                hex: value.metadata?.hex || "",
                image: value.image_file || null,
              })
            )
          )
        )
      })
    )

    await Promise.all(
      pendingAttributes.map(async (attribute) => {
        const attributeResponse = await createAdminProductVariantAttribute(productId, {
          name: attribute.name,
          slug: attribute.slug || slugify(attribute.name),
          sort_order: attribute.sort_order || variantAttributes.length + 1,
          is_active: Boolean(attribute.is_active ?? true),
        })
        const createdAttribute = attributeResponse?.data

        if (!createdAttribute?.id) return

        await Promise.all(
          (attribute.values || []).map((value, index) =>
            createAdminProductVariantAttributeValue(
              productId,
              createdAttribute.id,
              buildVariantAttributeValuePayload(
                {
                  ...createdAttribute,
                  slug: createdAttribute.slug || attribute.slug,
                  name: createdAttribute.name || attribute.name,
                },
                {
                  value: value.value,
                  slug: value.slug || slugify(value.value),
                  sort_order: value.sort_order || index + 1,
                  is_active: Boolean(value.is_active ?? true),
                  hex: value.metadata?.hex || "",
                  image: value.image_file || null,
                }
              )
            )
          )
        )
      })
    )
  }

  function buildProductPayload(form) {
    const hasImage = form.image instanceof File
    const payload = hasImage ? new FormData() : {}

    function appendField(key, value) {
      if (value === "" || value === null || value === undefined) return

      if (hasImage) {
        payload.append(key, value)
        return
      }

      payload[key] = value
    }

    const fields = {
      category_id: form.category_id === "" ? "" : Number(form.category_id),
      family_id: form.family_id === "" ? "" : Number(form.family_id),
      name: form.name,
      slug: form.slug,
      description: form.description,
      short_description: form.short_description,
      default_price: Number(form.default_price),
      stock: form.stock === "" ? null : Number(form.stock),
      sku: form.sku,
      brand: form.brand,
      keyword: form.keyword,
      is_active: hasImage ? (form.is_active ? "1" : "0") : Boolean(form.is_active),
      processed: hasImage ? (form.processed ? "1" : "0") : Boolean(form.processed),
    }

    Object.entries(fields).forEach(([key, value]) => {
      appendField(key, value)
    })

    if (hasImage) {
      payload.append("image", form.image)
      appendTranslationsToFormData(payload, form.translations)
    } else {
      payload.translations = compactTranslations(form.translations)
    }

    return payload
  }

  async function handlePanelSubmit(event) {
    event.preventDefault()

    if (panelMode === "create" && !panelForm.category_id) {
      notifyError("Selecciona una categoría existente o crea una cuando el endpoint esté disponible.")
      return
    }

    try {
      setPanelSaving(true)

      const payload = buildProductPayload(panelForm)

      if (panelMode === "create") {
        const response = await createAdminProduct(payload)
        const productId = response?.data?.id

        if (galleryEnabled && productId) {
          await uploadPendingGallery(productId)
        }

        if (productId) {
          await uploadPendingVariantAttributes(productId)
          await uploadPendingVariants(productId)
        }

        notifySuccess(response?.message || "Producto creado correctamente.")
      } else {
        if (!selectedProductId) return

        const response = await updateAdminProduct(selectedProductId, payload)
        const updatedGallery = response?.data?.gallery
        const updatedVariants = response?.data?.variants
        const updatedVariantAttributes = buildProductVariantAttributes(response?.data || {})

        if (Array.isArray(updatedGallery)) {
          setGalleryItems(sortGalleryItems(updatedGallery.map(normalizeGalleryItemMedia)))
          setGalleryEnabled(updatedGallery.length > 0 || galleryEnabled)
        }

        if (Array.isArray(updatedVariants)) {
          setVariants(sortVariants(updatedVariants))
        }

        if (updatedVariantAttributes.length) {
          setVariantAttributes(updatedVariantAttributes)
        }

        notifySuccess(response?.message || "Producto actualizado correctamente.")
      }

      handleClosePanel()
      fetchProducts()
    } catch (error) {
      console.error("Error al guardar producto:", error)
      notifyError(error?.response?.data?.message || "No fue posible guardar el producto.")
    } finally {
      setPanelSaving(false)
    }
  }

  async function handleStatusChange(productId, nextStatus) {
    try {
      setActionLoadingId(productId)

      await updateAdminProductStatus(productId, nextStatus)

      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? {
                ...product,
                is_active: nextStatus,
              }
            : product
        )
      )

      if (selectedProductId === productId) {
        setPanelForm((prev) => ({
          ...prev,
          is_active: nextStatus,
        }))
      }

      notifySuccess("Estatus actualizado correctamente.")
    } catch (error) {
      console.error("Error al actualizar status del producto:", error)
      notifyError("No fue posible actualizar el estatus.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleInlineProductFieldSave(product, field, rawValue) {
    const currentValue = field === "default_price"
      ? Number(product.default_price_number ?? product.default_price ?? 0)
      : product.stock ?? ""
    const cleanValue = String(rawValue ?? "").trim()
    const nextValue = field === "stock" && cleanValue === "" ? null : Number(cleanValue)

    if (field === "default_price" && (!Number.isFinite(nextValue) || nextValue < 0)) {
      notifyError("Ingresa un precio válido.")
      return
    }

    if (field === "stock" && nextValue !== null && (!Number.isFinite(nextValue) || nextValue < 0)) {
      notifyError("Ingresa un stock válido o deja el campo vacío.")
      return
    }

    if (
      (field === "default_price" && Number(nextValue) === Number(currentValue)) ||
      (field === "stock" && String(nextValue ?? "") === String(currentValue ?? ""))
    ) {
      return
    }

    const savingKey = `${product.id}:${field}`

    try {
      setInlineSavingKey(savingKey)
      const payload = buildInlineProductPayload(product, {
        [field]: nextValue,
      })
      const response = await updateAdminProduct(product.id, payload)
      const updatedProduct = normalizeProductMedia(response?.data || {
        ...product,
        [field]: nextValue,
        ...(field === "default_price" ? { default_price_number: nextValue } : {}),
      })

      setProducts((prev) =>
        prev.map((currentProduct) =>
          currentProduct.id === product.id
            ? {
                ...currentProduct,
                ...updatedProduct,
              }
            : currentProduct
        )
      )

      if (selectedProductId === product.id) {
        setPanelForm((prev) => ({
          ...prev,
          [field === "default_price" ? "default_price" : "stock"]: nextValue ?? "",
        }))
      }

      notifySuccess(field === "default_price" ? "Precio actualizado." : "Stock actualizado.")
    } catch (error) {
      console.error("Error al actualizar producto inline:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el producto.")
    } finally {
      setInlineSavingKey("")
    }
  }

  async function handleDelete(productId) {
    try {
      setActionLoadingId(productId)

      await deleteAdminProduct(productId)

      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? {
                ...product,
                is_active: false,
              }
            : product
        )
      )

      if (selectedProductId === productId) {
        setPanelForm((prev) => ({
          ...prev,
          is_active: false,
        }))
      }

      notifySuccess("Producto dado de baja correctamente.")
    } catch (error) {
      console.error("Error al dar de baja producto:", error)
      notifyError("No fue posible dar de baja el producto.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleSalesChannelLink(product, channel) {
    const productUrl = buildProductSalesChannelUrl(product, channel)

    if (!productUrl) {
      notifyError("El producto no tiene slug para generar el link.")
      return
    }

    try {
      await copyTextToClipboard(productUrl)

      if (channel === "whatsapp") {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`Te comparto este producto: ${productUrl}`)}`,
          "_blank",
          "noopener,noreferrer"
        )
        notifySuccess("Link de WhatsApp copiado y abierto.")
        return
      }

      notifySuccess(`Link de ${formatSalesChannelLabel(channel)} copiado.`)
    } catch (error) {
      console.error("Error al copiar link de canal:", error)
      notifyError("No fue posible copiar el link.")
    }
  }

  function handleShareMenuToggle(event, product) {
    event.stopPropagation()

    const rect = event.currentTarget.getBoundingClientRect()

    setShareMenu((prev) =>
      prev?.productId === product.id
        ? null
        : {
            product,
            productId: product.id,
            x: Math.min(rect.right, window.innerWidth - 12),
            y: Math.min(rect.bottom + 6, window.innerHeight - 12),
          }
    )
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > pagination.last_page) return

    setFilters((prev) => ({
      ...prev,
      page: nextPage,
    }))
  }

  async function openPriceScalePanel(product) {
    setPriceScaleProduct(product)
    setPriceScalePanelOpen(true)
    setPriceScaleLoading(true)

    try {
      const response = await getAdminProductPriceScales(product.id)
      const data = response?.data || response || {}
      setPriceScaleForm(mapPriceScaleResponseToForm(data))
    } catch (error) {
      console.error("Error al cargar escalas:", error?.response?.data || error)
      setPriceScaleForm(INITIAL_PRICE_SCALE_FORM)
    } finally {
      setPriceScaleLoading(false)
    }
  }

  function closePriceScalePanel() {
    if (priceScaleSaving) return
    setPriceScalePanelOpen(false)
    setPriceScaleProduct(null)
    setPriceScaleForm(INITIAL_PRICE_SCALE_FORM)
  }

  function handlePriceScaleRowChange(index, field, value) {
    setPriceScaleForm((prev) => ({
      ...prev,
      scales: prev.scales.map((scale, currentIndex) =>
        currentIndex === index
          ? {
              ...scale,
              [field]: field === "is_active" ? Boolean(value) : value,
            }
          : scale
      ),
    }))
  }

  function addPriceScaleRow() {
    setPriceScaleForm((prev) => {
      const scales = prev.scales.length ? prev.scales : INITIAL_PRICE_SCALE_FORM.scales
      const lastScale = scales[scales.length - 1]
      const lastTo = lastScale.to_quantity || lastScale.from_quantity || ""
      const nextFrom = lastTo ? Number(lastTo) + 1 : ""

      return {
        ...prev,
        scales: [
          ...scales.slice(0, -1),
          {
            ...lastScale,
            to_quantity: lastTo,
          },
          {
            from_quantity: nextFrom || "",
            to_quantity: "",
            discount_percentage: "",
            is_active: true,
          },
        ],
      }
    })
  }

  function removeLastPriceScaleRow() {
    setPriceScaleForm((prev) => ({
      ...prev,
      scales: prev.scales.length > 1 ? prev.scales.slice(0, -1) : prev.scales,
    }))
  }

  async function savePriceScales() {
    if (!priceScaleProduct?.id) return

    const payload = buildPriceScalePayload(priceScaleForm, priceScaleProduct)
    const validation = validateProductPriceScales(payload.scales)

    if (!validation.valid) {
      notifyError(validation.message)
      return
    }

    try {
      setPriceScaleSaving(true)
      const response = await updateAdminProductPriceScales(priceScaleProduct.id, payload)
      notifySuccess(response?.message || "Escalas de precio actualizadas correctamente.")
      setPriceScaleForm(mapPriceScaleResponseToForm(response?.data || response))
    } catch (error) {
      console.error("Error al guardar escalas:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar las escalas.")
    } finally {
      setPriceScaleSaving(false)
    }
  }

  async function deactivatePriceScales() {
    if (!priceScaleProduct?.id) return
    if (!window.confirm(`¿Desactivar las escalas de "${priceScaleProduct.name}"?`)) return

    try {
      setPriceScaleSaving(true)
      const response = await deleteAdminProductPriceScales(priceScaleProduct.id)
      notifySuccess(response?.message || "Escalas desactivadas correctamente.")
      closePriceScalePanel()
    } catch (error) {
      console.error("Error al desactivar escalas:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible desactivar las escalas.")
    } finally {
      setPriceScaleSaving(false)
    }
  }

  function openBulkImportPanel() {
    if (isRegionalAdmin) {
      notifyError("La carga masiva no está disponible para administradores regionales.")
      return
    }

    setBulkImportOpen(true)
  }

  function closeBulkImportPanel() {
    if (bulkImportPreviewing || bulkImportSaving || bulkImportDownloading) return

    setBulkImportOpen(false)
    setBulkImportForm(INITIAL_BULK_IMPORT_FORM)
    setBulkImportPreview(null)
    setBulkImportAuthorizedRows([])
  }

  function handleBulkImportChange(event) {
    const { name, value, checked, files, type } = event.target
    const fieldValue = type === "file" ? files?.[0] || null : type === "checkbox" ? checked : value
    const nextForm = {
      ...bulkImportForm,
      [name]: fieldValue,
    }

    setBulkImportForm(nextForm)

    if (name === "file" || name === "mode" || name === "import_images") {
      setBulkImportPreview(null)
      setBulkImportAuthorizedRows([])

      if (nextForm.file) {
        previewBulkImport(nextForm)
      }
    }
  }

  async function handleDownloadBulkImportLayout() {
    try {
      setBulkImportDownloading(true)
      const response = await downloadAdminProductsBulkImportLayout()
      const blob = new Blob([response.data], {
        type: response.headers?.["content-type"] || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")

      link.href = url
      link.download = getBulkImportLayoutFilename(response) || "plantilla-productos.xlsx"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error al descargar plantilla:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible descargar la plantilla.")
    } finally {
      setBulkImportDownloading(false)
    }
  }

  async function previewBulkImport(form) {
    if (!form.file) {
      notifyError("Selecciona un archivo Excel para previsualizar.")
      return
    }

    try {
      setBulkImportPreviewing(true)
      const response = await previewAdminProductsBulkImport(buildBulkImportPayload(form))
      setBulkImportPreview(normalizeBulkImportResponse(response))
      setBulkImportAuthorizedRows([])
      notifySuccess(response?.message || "Archivo validado correctamente.")
    } catch (error) {
      console.error("Error al previsualizar carga masiva:", error?.response?.data || error)
      setBulkImportPreview(normalizeBulkImportResponse(error?.response?.data))
      setBulkImportAuthorizedRows([])
      notifyError(error?.response?.data?.message || "No fue posible validar el archivo.")
    } finally {
      setBulkImportPreviewing(false)
    }
  }

  async function handleConfirmBulkImport() {
    if (!bulkImportForm.file) {
      notifyError("Selecciona un archivo Excel para importar.")
      return
    }

    const importableRows = getBulkImportImportableRows(bulkImportPreview?.items)

    if (!importableRows.length) {
      notifyError("No hay filas válidas para importar.")
      return
    }

    if (!areBulkImportRowsAuthorized(bulkImportPreview?.items, bulkImportAuthorizedRows)) {
      notifyError("Autoriza todas las filas válidas antes de confirmar.")
      return
    }

    try {
      setBulkImportSaving(true)
      const response = await importAdminProductsBulk(buildBulkImportPayload(bulkImportForm))
      setBulkImportPreview(normalizeBulkImportResponse(response))
      setBulkImportAuthorizedRows([])
      notifySuccess(response?.message || "Productos importados correctamente.")
      fetchProducts()
    } catch (error) {
      console.error("Error al importar productos:", error?.response?.data || error)
      setBulkImportPreview(normalizeBulkImportResponse(error?.response?.data))
      notifyError(error?.response?.data?.message || "No fue posible importar los productos.")
    } finally {
      setBulkImportSaving(false)
    }
  }

  function handleBulkImportRowToggle(rowKey, checked) {
    setBulkImportAuthorizedRows((prev) =>
      checked
        ? [...new Set([...prev, rowKey])]
        : prev.filter((key) => key !== rowKey)
    )
  }

  function handleBulkImportToggleAll(checked) {
    setBulkImportAuthorizedRows(
      checked
        ? getBulkImportImportableRows(bulkImportPreview?.items).map(getBulkImportRowKey)
        : []
    )
  }

  function renderPagination() {
    if (pagination.last_page <= 1) return null

    const pages = []
    const start = Math.max(1, pagination.current_page - 2)
    const end = Math.min(pagination.last_page, pagination.current_page + 2)

    for (let i = start; i <= end; i += 1) {
      pages.push(i)
    }

    return (
      <div className="product-page__pagination">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => handlePageChange(pagination.current_page - 1)}
          disabled={pagination.current_page === 1 || loading}
        >
          Anterior
        </button>

        <div className="product-page__pagination-pages">
          {pages.map((page) => (
            <button
              key={page}
              type="button"
              className={`btn btn-sm ${
                page === pagination.current_page ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => handlePageChange(page)}
              disabled={loading}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => handlePageChange(pagination.current_page + 1)}
          disabled={pagination.current_page === pagination.last_page || loading}
        >
          Siguiente
        </button>
      </div>
    )
  }

  return (
    <>
      <AdminCard
        title="Productos"
        subtitle="Listado general de productos registrados"
        right={
          <div className="product-page__header-actions">
            {!isRegionalAdmin ? (
              <button type="button" className="btn btn-outline-primary" onClick={openBulkImportPanel}>
                <i className="bi bi-file-earmark-spreadsheet" aria-hidden="true" />{" "}
                Carga masiva
              </button>
            ) : null}
            <button type="button" className="btn btn-primary" onClick={handleOpenCreatePanel}>
              <i className="bi bi-plus-lg" aria-hidden="true" />{" "}
              Nuevo producto
            </button>
          </div>
        }
      >
        <div className="product-page">
          <form className="product-page__filters row g-3 align-items-end" onSubmit={handleSearchSubmit}>
            <div className="col-12 col-md-5">
              <label className="form-label">Buscar producto</label>
              <input
                type="text"
                name="search"
                className="form-control"
                placeholder="Nombre, SKU, marca, slug..."
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Estatus</label>
              <select
                name="is_active"
                className="form-select"
                value={filters.is_active}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label">Mostrar</label>
              <select
                name="per_page"
                className="form-select"
                value={filters.per_page}
                onChange={handleFilterChange}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="col-6 col-md-2">
              <div className="product-page__filter-actions">
                <button type="submit" className="btn btn-primary">
                  Buscar
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClearFilters}
                >
                  Limpiar
                </button>
              </div>
            </div>
          </form>

          <div className="product-page__summary">
            <div className="product-page__summary-text">
              {loading ? (
                <span>Cargando productos...</span>
              ) : (
                <span>
                  Mostrando <strong>{pagination.from || 0}</strong> - <strong>{pagination.to || 0}</strong> de{" "}
                  <strong>{pagination.total}</strong> productos
                </span>
              )}
            </div>
          </div>

          <div className="table-responsive product-page__table-wrapper">
            <table className="table table-hover align-middle product-page__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Imagen</th>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th>Precio</th>
                  <th>Inventario</th>
                  <th>Categoría</th>
                  <th>Estatus</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      Cargando información...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      No se encontraron productos.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const isActive = Boolean(product.is_active)

                    return (
                      <tr
                        key={product.id}
                        className="product-page__row"
                        onClick={() => handleOpenPanel(product.id)}
                      >
                        <td className="fw-semibold">{product.id}</td>
                        <td>
                          <div
                            className="product-page__thumb"
                            onMouseEnter={(event) => {
                              if (!product.image_url) return
                              setImagePreview({
                                src: product.image_url,
                                alt: product.name,
                                x: event.clientX,
                                y: event.clientY,
                              })
                            }}
                            onMouseMove={(event) => {
                              if (!product.image_url) return
                              setImagePreview((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      x: event.clientX,
                                      y: event.clientY,
                                    }
                                  : prev
                              )
                            }}
                            onMouseLeave={() => setImagePreview(null)}
                          >
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} />
                            ) : (
                              <span>Sin imagen</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="product-page__name-cell">
                            <span>{product.name}</span>
                            <button
                              type="button"
                              className="product-page__mini-action"
                              onClick={(event) => {
                                event.stopPropagation()
                                openPriceScalePanel(product)
                              }}
                              title="Escalas de precio"
                              aria-label={`Escalas de precio de ${product.name}`}
                            >
                              <i className="bi bi-layers" aria-hidden="true" />
                              <span>Escalas</span>
                            </button>
                          </div>
                        </td>
                        <td>{product.brand || "-"}</td>
                        <td onClick={(event) => event.stopPropagation()}>
                          <label className="product-page__inline-number">
                            <span>$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              key={`price-${product.id}-${product.default_price_number ?? product.default_price ?? 0}`}
                              defaultValue={Number(product.default_price_number ?? product.default_price ?? 0).toFixed(2)}
                              disabled={inlineSavingKey === `${product.id}:default_price`}
                              onBlur={(event) => handleInlineProductFieldSave(product, "default_price", event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") event.currentTarget.blur()
                                if (event.key === "Escape") {
                                  event.currentTarget.value = Number(product.default_price_number ?? product.default_price ?? 0).toFixed(2)
                                  event.currentTarget.blur()
                                }
                              }}
                            />
                          </label>
                        </td>
                        <td>
                          <div className="product-page__stock-cell" onClick={(event) => event.stopPropagation()}>
                            <label className="product-page__inline-number product-page__inline-number--stock">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Sin control"
                                key={`stock-${product.id}-${product.stock ?? "null"}`}
                                defaultValue={product.stock ?? ""}
                                disabled={inlineSavingKey === `${product.id}:stock`}
                                onBlur={(event) => handleInlineProductFieldSave(product, "stock", event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") event.currentTarget.blur()
                                  if (event.key === "Escape") {
                                    event.currentTarget.value = product.stock ?? ""
                                    event.currentTarget.blur()
                                  }
                                }}
                              />
                            </label>
                            <span className={`product-page__stock-badge is-${product.stock_status || "untracked"}`}>
                              {formatAdminStock(product)}
                            </span>
                          </div>
                        </td>
                        <td>{product.category?.name || "-"}</td>
                        <td>
                          <span className={`badge text-bg-${isActive ? "success" : "secondary"}`}>
                            {isActive ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="text-end">
                          <div
                            className="product-page__actions"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="product-page__share-action"
                              onClick={(event) => handleShareMenuToggle(event, product)}
                              title="Compartir"
                              aria-label={`Compartir ${product.name}`}
                              aria-expanded={shareMenu?.productId === product.id}
                            >
                              <i className="bi bi-share" aria-hidden="true" />
                              <span>Compartir</span>
                            </button>

                            <button
                              type="button"
                              className={`product-page__icon-action ${
                                isActive ? "is-warning" : "is-success"
                              }`}
                              onClick={() => handleStatusChange(product.id, !isActive)}
                              disabled={actionLoadingId === product.id}
                              title={isActive ? "Desactivar" : "Activar"}
                              aria-label={isActive ? "Desactivar producto" : "Activar producto"}
                            >
                              <i
                                className={`bi ${
                                  isActive ? "bi-toggle-on" : "bi-toggle-off"
                                }`}
                                aria-hidden="true"
                              />
                            </button>

                            <button
                              type="button"
                              className="product-page__icon-action is-danger"
                              onClick={() => handleDelete(product.id)}
                              disabled={actionLoadingId === product.id}
                              title="Dar de baja"
                              aria-label="Dar de baja producto"
                            >
                              <i className="bi bi-trash3" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {renderPagination()}
        </div>
      </AdminCard>

      <ProductDetailPanel
        isOpen={panelOpen}
        loading={panelLoading}
        saving={panelSaving}
        mode={panelMode}
        form={panelForm}
        locales={activeLocales}
        title={buildPanelTitle(panelMode, panelForm)}
        categoryOptions={categoryOptions}
        familyOptions={familyOptions}
        galleryEnabled={galleryEnabled}
        galleryItems={galleryItems}
        galleryLoading={galleryLoading}
        gallerySaving={gallerySaving}
        galleryForm={galleryForm}
        variantAttributes={variantAttributes}
        activeVariantAttribute={activeVariantAttribute}
        variantCatalog={variantCatalog}
        variantCatalogLoading={variantCatalogLoading}
        variants={variants}
        variantsLoading={variantsLoading}
        variantsSaving={variantsSaving}
        variantOptionForm={variantOptionForm}
        variantValueDrafts={variantValueDrafts}
        variantForm={variantForm}
        generatedVariantSku={generatedVariantSku}
        variantFormIncomplete={variantFormIncomplete}
        variantCatalogForm={variantCatalogForm}
        missingVariantCombinationCount={missingVariantCombinationCount}
        onClose={handleClosePanel}
        onChange={handlePanelChange}
        onTranslationChange={handlePanelTranslationChange}
        onEntitySelect={handleEntitySelect}
        onEntityCreate={handleEntityCreate}
        onGalleryToggle={handleGalleryToggle}
        onGalleryFormChange={handleGalleryFormChange}
        onGalleryAdd={handleGalleryAdd}
        onGalleryItemChange={handleGalleryItemChange}
        onGalleryItemToggle={handleGalleryItemToggle}
        onGalleryDelete={handleGalleryDelete}
        onGalleryMove={handleGalleryMove}
        onVariantOptionFormChange={handleVariantOptionFormChange}
        onVariantOptionAdd={handleVariantOptionAdd}
        onVariantValueDraftChange={handleVariantValueDraftChange}
        onVariantAttributeValueAdd={handleVariantAttributeValueAdd}
        onVariantAttributeValueDelete={handleVariantAttributeValueDelete}
        onVariantAttributeValueImageUpdate={handleVariantAttributeValueImageUpdate}
        onVariantAttributeValueImageRemove={handleVariantAttributeValueImageRemove}
        onVariantAttributeDelete={handleVariantAttributeDelete}
        onVariantCatalogFormChange={handleVariantCatalogFormChange}
        onVariantCatalogAttributeChange={handleVariantCatalogAttributeChange}
        onVariantCatalogValueToggle={handleVariantCatalogValueToggle}
        onVariantCatalogCreateAttribute={handleVariantCatalogCreateAttribute}
        onVariantCatalogImport={handleVariantCatalogImport}
        onGenerateVariantCombinations={handleGenerateVariantCombinations}
        onVariantFormChange={handleVariantFormChange}
        onVariantValueToggle={handleVariantValueToggle}
        onVariantSave={handleVariantSave}
        onVariantEdit={handleVariantEdit}
        onVariantStatusChange={handleVariantStatusChange}
        onVariantDelete={handleVariantDelete}
        onSubmit={handlePanelSubmit}
      />

      <AdminSidePanel
        isOpen={bulkImportOpen}
        title="Carga masiva de productos"
        subtitle="Descarga la plantilla, valida el archivo y confirma la importación."
        onClose={closeBulkImportPanel}
        closeDisabled={bulkImportPreviewing || bulkImportSaving || bulkImportDownloading}
        width="xl"
        footer={
          <div className="bulk-import-panel__footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={closeBulkImportPanel}
              disabled={bulkImportPreviewing || bulkImportSaving || bulkImportDownloading}
            >
              Cerrar
            </button>
            <div className="bulk-import-panel__footer-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmBulkImport}
                disabled={
                  !bulkImportForm.file ||
                  !bulkImportPreview ||
                  !areBulkImportRowsAuthorized(bulkImportPreview?.items, bulkImportAuthorizedRows) ||
                  bulkImportSaving ||
                  bulkImportPreviewing
                }
              >
                {bulkImportSaving ? "Importando..." : "Confirmar importación"}
              </button>
            </div>
          </div>
        }
      >
        <BulkImportPanel
          form={bulkImportForm}
          preview={bulkImportPreview}
          downloading={bulkImportDownloading}
          previewing={bulkImportPreviewing}
          saving={bulkImportSaving}
          authorizedRows={bulkImportAuthorizedRows}
          onChange={handleBulkImportChange}
          onRowToggle={handleBulkImportRowToggle}
          onToggleAll={handleBulkImportToggleAll}
          onDownloadLayout={handleDownloadBulkImportLayout}
        />
      </AdminSidePanel>

      {imagePreview ? (
        <div
          className="product-page__image-preview"
          style={{
            left: imagePreview.x + 18,
            top: imagePreview.y + 18,
          }}
        >
          <img src={imagePreview.src} alt={imagePreview.alt} />
        </div>
      ) : null}

      {shareMenu ? (
        <div
          className="product-page__share-menu"
          style={{
            left: shareMenu.x,
            top: shareMenu.y,
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {SALES_CHANNEL_LINKS.map((channelLink) => (
            <button
              key={channelLink.channel}
              type="button"
              className={channelLink.className}
              onClick={() => {
                handleSalesChannelLink(shareMenu.product, channelLink.channel)
                setShareMenu(null)
              }}
            >
              <i className={`bi ${channelLink.icon}`} aria-hidden="true" />
              <span>{channelLink.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <AdminSidePanel
        isOpen={priceScalePanelOpen}
        title="Escalas de precio"
        subtitle={priceScaleProduct ? `${priceScaleProduct.name}${priceScaleProduct.sku ? ` · ${priceScaleProduct.sku}` : ""}` : ""}
        onClose={closePriceScalePanel}
        closeDisabled={priceScaleSaving}
        width="lg"
        footer={
          <div className="price-scales-panel__footer">
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={deactivatePriceScales}
              disabled={priceScaleSaving || priceScaleLoading}
            >
              Desactivar escalas
            </button>
            <div className="price-scales-panel__footer-actions">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={closePriceScalePanel}
                disabled={priceScaleSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={savePriceScales}
                disabled={priceScaleSaving || priceScaleLoading}
              >
                {priceScaleSaving ? "Guardando..." : "Guardar escalas"}
              </button>
            </div>
          </div>
        }
      >
        {priceScaleLoading ? (
          <div className="product-page__panel-loading">Cargando escalas...</div>
        ) : (
          <div className="price-scales-panel">
            <section className="price-scales-panel__block">
              <div className="price-scales-panel__head">
                <div>
                  <h4>Rangos</h4>
                  <p>La última escala puede quedar sin límite en “Hasta”.</p>
                </div>
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={addPriceScaleRow}>
                  Agregar escala
                </button>
              </div>

              <div className="price-scales-panel__rows">
                {priceScaleForm.scales.map((scale, index) => (
                  <div className="price-scales-panel__row" key={`scale-${index}`}>
                    <label className="price-scales-panel__field">
                      <span>Desde</span>
                      <input
                        type="number"
                        min="1"
                        value={scale.from_quantity}
                        onChange={(event) => handlePriceScaleRowChange(index, "from_quantity", event.target.value)}
                      />
                    </label>

                    <label className="price-scales-panel__field">
                      <span>Hasta</span>
                      <input
                        type="number"
                        min="1"
                        value={scale.to_quantity ?? ""}
                        onChange={(event) => handlePriceScaleRowChange(index, "to_quantity", event.target.value)}
                        placeholder={index === priceScaleForm.scales.length - 1 ? "Sin límite" : "5"}
                      />
                    </label>

                    <label className="price-scales-panel__field">
                      <span>Descuento %</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={scale.discount_percentage}
                        onChange={(event) => handlePriceScaleRowChange(index, "discount_percentage", event.target.value)}
                      />
                    </label>

                    <label className="price-scales-panel__check">
                      <input
                        type="checkbox"
                        checked={scale.is_active}
                        onChange={(event) => handlePriceScaleRowChange(index, "is_active", event.target.checked)}
                      />
                      <span>Activa</span>
                    </label>

                    <button
                      type="button"
                      className="price-scales-panel__remove"
                      onClick={removeLastPriceScaleRow}
                      disabled={index !== priceScaleForm.scales.length - 1 || priceScaleForm.scales.length <= 1}
                      title="Solo se elimina desde la última escala"
                      aria-label="Eliminar última escala"
                    >
                      <i className="bi bi-trash3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </AdminSidePanel>
    </>
  )
}

export default ProductsPage

function buildProductSalesChannelUrl(product, channel) {
  const slug = String(product?.slug || "").trim()

  if (!slug) return ""

  const url = new URL(`/producto/${slug}`, window.location.origin)
  url.searchParams.set("channel", channel)
  url.searchParams.set("utm_campaign", `producto_${product.id}`)

  return url.toString()
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.top = "-9999px"

  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  document.body.removeChild(textarea)
}

function formatSalesChannelLabel(channel) {
  const match = SALES_CHANNEL_LINKS.find((item) => item.channel === channel)

  return match?.label || "canal"
}

function buildBulkImportPayload(form) {
  const payload = new FormData()
  payload.append("file", form.file)
  payload.append("mode", form.mode || "create_or_update")
  payload.append("import_images", form.import_images ? "1" : "0")

  return payload
}

function normalizeBulkImportResponse(response) {
  const payload = response?.data || response || {}

  return {
    summary: {
      processed_rows: Number(payload.summary?.processed_rows ?? 0),
      valid_rows: Number(payload.summary?.valid_rows ?? 0),
      created_rows: Number(payload.summary?.created_rows ?? 0),
      updated_rows: Number(payload.summary?.updated_rows ?? 0),
      skipped_rows: Number(payload.summary?.skipped_rows ?? 0),
      mode: payload.summary?.mode || "create_or_update",
      commit: Boolean(payload.summary?.commit),
      import_images: Boolean(payload.summary?.import_images),
    },
    items: Array.isArray(payload.items) ? payload.items : [],
    errors: Array.isArray(payload.errors) ? payload.errors : [],
  }
}

function getBulkImportLayoutFilename(response) {
  const disposition = response.headers?.["content-disposition"] || ""
  const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i)

  return match?.[1] ? decodeURIComponent(match[1]) : ""
}

function normalizeBulkImportStatus(status) {
  const normalized = String(status || "").toLowerCase()

  if (["create", "created"].includes(normalized)) return "create"
  if (["update", "updated"].includes(normalized)) return "update"
  if (["invalid", "error"].includes(normalized)) return "invalid"
  if (["skipped", "skip"].includes(normalized)) return "skipped"

  return "unknown"
}

function isBulkImportRowImportable(item) {
  return ["create", "update"].includes(normalizeBulkImportStatus(item?.status))
}

function getBulkImportImportableRows(items = []) {
  return Array.isArray(items) ? items.filter(isBulkImportRowImportable) : []
}

function getBulkImportRowKey(item) {
  return String(item?.row ?? item?.sku ?? item?.name ?? "")
}

function areBulkImportRowsAuthorized(items = [], authorizedRows = []) {
  const importableRows = getBulkImportImportableRows(items)

  return (
    importableRows.length > 0 &&
    importableRows.every((item) => authorizedRows.includes(getBulkImportRowKey(item)))
  )
}

function translateBulkImportStatus(status) {
  const map = {
    create: "Crear",
    created: "Crear",
    update: "Actualizar",
    updated: "Actualizar",
    invalid: "Con error",
    error: "Con error",
    skipped: "Omitida",
    skip: "Omitida",
  }

  return map[String(status || "").toLowerCase()] || status || "-"
}

function formatBulkImportMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) return "-"

  return messages.join(" · ")
}

function formatBulkImportError(error) {
  if (typeof error === "string") return error

  const row = error?.row ? `Fila ${error.row}: ` : ""
  const message = error?.message || error?.error || formatBulkImportMessages(error?.messages)

  return `${row}${message || "Error de validación."}`
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0))
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-MX").format(Number(value || 0))
}

function BulkImportPanel({
  form,
  preview,
  downloading,
  previewing,
  saving,
  authorizedRows,
  onChange,
  onRowToggle,
  onToggleAll,
  onDownloadLayout,
}) {
  const summary = preview?.summary || {}
  const items = Array.isArray(preview?.items) ? preview.items : []
  const errors = Array.isArray(preview?.errors) ? preview.errors : []
  const canShowPreview = Boolean(preview)
  const importableRows = getBulkImportImportableRows(items)
  const authorizedCount = importableRows.filter((item) => authorizedRows.includes(getBulkImportRowKey(item))).length

  return (
    <div className="bulk-import-panel">
      <section className="bulk-import-panel__steps">
        <article>
          <span>1</span>
          <strong>Descargar plantilla</strong>
          <p>Usa el layout oficial con columnas obligatorias y opcionales.</p>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={onDownloadLayout}
            disabled={downloading || previewing || saving}
          >
            {downloading ? "Descargando..." : "Descargar Excel"}
          </button>
        </article>
        <article>
          <span>2</span>
          <strong>Subir y validar</strong>
          <p>Al elegir el archivo se valida automáticamente.</p>
        </article>
        <article>
          <span>3</span>
          <strong>Autorizar filas</strong>
          <p>Marca cada fila válida antes de confirmar.</p>
        </article>
      </section>

      <section className="bulk-import-panel__form">
        <label className="bulk-import-panel__field">
          <span>Archivo Excel</span>
          <input
            type="file"
            name="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={onChange}
            disabled={previewing || saving}
          />
          {form.file ? <small>{form.file.name}</small> : null}
        </label>

        <label className="bulk-import-panel__field">
          <span>Modo</span>
          <select name="mode" value={form.mode} onChange={onChange} disabled={previewing || saving}>
            <option value="create_or_update">Crear o actualizar</option>
            <option value="create_only">Solo crear</option>
          </select>
        </label>

        <label className="bulk-import-panel__check">
          <input
            type="checkbox"
            name="import_images"
            checked={form.import_images}
            onChange={onChange}
            disabled={previewing || saving}
          />
          <span>Importar imágenes remotas</span>
        </label>
      </section>

      {canShowPreview ? (
        <>
          <section className="bulk-import-panel__summary">
            <SummaryCard label="Filas procesadas" value={summary.processed_rows} />
            <SummaryCard label="Válidas" value={summary.valid_rows} tone="success" />
            <SummaryCard label="Se crearán" value={summary.created_rows} tone="primary" />
            <SummaryCard label="Se actualizarán" value={summary.updated_rows} tone="warning" />
            <SummaryCard label="Con error" value={errors.length} tone="danger" />
            <SummaryCard label="Autorizadas" value={`${authorizedCount}/${importableRows.length}`} tone="neutral" />
          </section>

          {errors.length ? (
            <section className="bulk-import-panel__errors">
              <strong>Errores</strong>
              <ul>
                {errors.slice(0, 8).map((error, index) => (
                  <li key={`${error?.row || "error"}-${index}`}>
                    {formatBulkImportError(error)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <BulkImportTable
            items={items}
            authorizedRows={authorizedRows}
            onRowToggle={onRowToggle}
            onToggleAll={onToggleAll}
          />
        </>
      ) : (
        <div className="bulk-import-panel__empty">
          Sube un archivo para validar la carga automáticamente antes de importar.
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, tone = "neutral" }) {
  return (
    <article className={`bulk-import-panel__summary-card is-${tone}`}>
      <span>{label}</span>
      <strong>{typeof value === "number" ? formatNumber(value) : value}</strong>
    </article>
  )
}

function BulkImportTable({ items, authorizedRows, onRowToggle, onToggleAll }) {
  if (!items.length) {
    return (
      <div className="bulk-import-panel__empty">
        No hay filas para mostrar en la previsualización.
      </div>
    )
  }

  const importableRows = getBulkImportImportableRows(items)
  const allImportableAuthorized = areBulkImportRowsAuthorized(items, authorizedRows)

  return (
    <div className="bulk-import-table">
      <div className="bulk-import-table__head">
        <span>
          <input
            type="checkbox"
            checked={allImportableAuthorized}
            onChange={(event) => onToggleAll(event.target.checked)}
            disabled={!importableRows.length}
            aria-label="Autorizar todas las filas válidas"
          />
        </span>
        <span>Fila</span>
        <span>SKU</span>
        <span>Nombre</span>
        <span>Precio</span>
        <span>Stock</span>
        <span>Categoría</span>
        <span>Familia</span>
        <span>Acción</span>
        <span>Mensajes</span>
      </div>
      <div className="bulk-import-table__body">
        {items.map((item, index) => {
          const rowKey = getBulkImportRowKey(item)
          const isImportable = isBulkImportRowImportable(item)

          return (
            <div className="bulk-import-table__row" key={`${item.row || "row"}-${index}`}>
              <span>
                <input
                  type="checkbox"
                  checked={authorizedRows.includes(rowKey)}
                  onChange={(event) => onRowToggle(rowKey, event.target.checked)}
                  disabled={!isImportable}
                  aria-label={`Autorizar fila ${item.row || index + 1}`}
                />
              </span>
              <span>{item.row || "-"}</span>
              <span>{item.sku || "-"}</span>
              <strong>{item.name || "-"}</strong>
              <span>{formatMoney(item.default_price)}</span>
              <span>{item.stock ?? "-"}</span>
              <span>{item.category_name || "-"}</span>
              <span>{item.family_name || "-"}</span>
              <span className={`bulk-import-status is-${normalizeBulkImportStatus(item.status)}`}>
                {translateBulkImportStatus(item.status)}
              </span>
              <span>{formatBulkImportMessages(item.messages)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildCatalogEntityOptions(items = [], currentEntity) {
  const map = new Map()

  items.forEach((item) => {
    if (!item?.id || !item?.name) return

    map.set(Number(item.id), {
      id: Number(item.id),
      name: item.name,
    })
  })

  if (currentEntity?.id && currentEntity?.name) {
    map.set(Number(currentEntity.id), {
      id: Number(currentEntity.id),
      name: currentEntity.name,
    })
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function normalizeEntityCatalog(response) {
  const data = response?.data?.data || response?.data || response || []

  return Array.isArray(data)
    ? data
        .map((item) => ({
          id: Number(item.id),
          name: item.name || "",
        }))
        .filter((item) => item.id && item.name)
    : []
}

function sortGalleryItems(items = []) {
  return [...items].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
}

function sortVariants(items = []) {
  return [...items].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
}

function sortVariantAttributes(items = []) {
  return [...items]
    .map((attribute) => ({
      ...attribute,
      values: Array.isArray(attribute.values)
        ? [...attribute.values].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
        : [],
    }))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
}

function buildProductVariantAttributes(product = {}) {
  if (Array.isArray(product.variant_attributes) && Array.isArray(product.variant_attribute_values)) {
    return sortVariantAttributes(
      product.variant_attributes.map((attribute) => ({
        ...attribute,
        values: product.variant_attribute_values.filter(
          (value) => Number(value.variant_attribute_id) === Number(attribute.id)
        ),
      }))
    )
  }

  if (Array.isArray(product.variant_options)) {
    return sortVariantAttributes(
      product.variant_options.map((option, index) => ({
        id: option.id,
        name: option.name,
        slug: option.slug,
        sort_order: option.sort_order ?? index + 1,
        is_active: true,
        values: Array.isArray(option.values) ? option.values : [],
      }))
    )
  }

  return []
}

function buildPanelTitle(mode, form) {
  const name = form.name?.trim()

  if (name) return name

  return mode === "create" ? "Nuevo producto" : "Detalle del producto"
}

function buildInlineProductPayload(product = {}, overrides = {}) {
  const payload = {
    category_id: product.category_id ?? product.category?.id ?? "",
    family_id: product.family_id ?? product.family?.id ?? "",
    name: product.name ?? "",
    slug: product.slug ?? "",
    description: product.description ?? "",
    short_description: product.short_description ?? "",
    default_price: Number(overrides.default_price ?? product.default_price_number ?? product.default_price ?? 0),
    stock: Object.prototype.hasOwnProperty.call(overrides, "stock")
      ? overrides.stock
      : product.stock ?? null,
    sku: product.sku ?? "",
    brand: product.brand ?? "",
    keyword: product.keyword ?? "",
    is_active: Boolean(product.is_active),
    processed: Boolean(product.processed),
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => {
      if (key === "stock") return true
      return value !== "" && value !== undefined
    })
  )
}

function formatAdminStock(product = {}) {
  const status = product.stock_status || "untracked"
  const stock = product.stock
  const labels = {
    untracked: "Sin control",
    out_of_stock: "Sin inventario",
    low_stock: stock === null || stock === undefined ? "Pocas piezas" : `${stock} pzas.`,
    in_stock: stock === null || stock === undefined ? "Disponible" : `${stock} pzas.`,
  }

  return labels[status] || "Sin control"
}

function mapPriceScaleResponseToForm(data = {}) {
  const scales = Array.isArray(data.scales) && data.scales.length
    ? data.scales.map((scale) => ({
        from_quantity: scale.from_quantity ?? "",
        to_quantity: scale.to_quantity ?? "",
        discount_percentage: scale.discount_percentage ?? "",
        is_active: Boolean(scale.is_active ?? true),
      }))
    : INITIAL_PRICE_SCALE_FORM.scales

  return {
    scales,
  }
}

function buildPriceScalePayload(form, product = {}) {
  return {
    name: `Escalas ${product.name || ""}`.trim() || "Escalas de precio",
    description: null,
    is_active: true,
    starts_at: null,
    ends_at: null,
    scales: form.scales.map((scale) => ({
      from_quantity: Number(scale.from_quantity || 0),
      to_quantity:
        scale.to_quantity === "" || scale.to_quantity === null
          ? null
          : Number(scale.to_quantity),
      discount_percentage: Number(scale.discount_percentage || 0),
      is_active: Boolean(scale.is_active),
    })),
  }
}

function validateProductPriceScales(scales = []) {
  if (!Array.isArray(scales) || scales.length === 0) {
    return { valid: false, message: "Agrega al menos una escala." }
  }

  for (let index = 0; index < scales.length; index += 1) {
    const scale = scales[index]
    const from = Number(scale.from_quantity)
    const to = scale.to_quantity === null ? null : Number(scale.to_quantity)
    const discount = Number(scale.discount_percentage)

    if (!Number.isFinite(from) || from < 1) {
      return { valid: false, message: "Cada escala debe tener una cantidad inicial válida." }
    }

    if (to !== null && (!Number.isFinite(to) || to < from)) {
      return { valid: false, message: "La cantidad final debe ser mayor o igual a la inicial." }
    }

    if (!Number.isFinite(discount) || discount <= 0) {
      return { valid: false, message: "Cada escala debe tener un descuento mayor a 0." }
    }

    if (to === null && index < scales.length - 1) {
      return { valid: false, message: "Una escala sin límite debe ser la última." }
    }

    const next = scales[index + 1]
    if (next && to !== null && Number(next.from_quantity) !== to + 1) {
      return { valid: false, message: "Las escalas deben ser consecutivas, sin huecos ni traslapes." }
    }
  }

  return { valid: true, message: "" }
}

function normalizeProductMedia(product = {}) {
  return {
    ...product,
    image_url: normalizeMediaUrl(product.image_url),
    gallery: Array.isArray(product.gallery)
      ? product.gallery.map(normalizeGalleryItemMedia)
      : product.gallery,
  }
}

function findVariantAttributeByName(attributes = [], name = "") {
  const normalizedName = name.trim().toLowerCase()

  return attributes.find((attribute) => attribute.name?.trim().toLowerCase() === normalizedName)
}

function findAttributeByValueId(attributes = [], valueId) {
  return attributes.find((attribute) => {
    return (attribute.values || []).some((value) => Number(value.id) === Number(valueId))
  })
}

function buildVariantPayload(form, defaultSortOrder = 1) {
  const metadata = {}

  if (form.metadata_barcode) metadata.barcode = form.metadata_barcode
  if (form.metadata_supplier_code) metadata.supplier_code = form.metadata_supplier_code

  return {
    sku: form.sku.trim(),
    name: form.name.trim(),
    price: form.price === "" ? null : Number(form.price),
    compare_price: form.compare_price === "" ? null : Number(form.compare_price),
    stock: form.stock === "" ? null : Number(form.stock),
    sort_order: Number(form.sort_order || defaultSortOrder),
    is_active: Boolean(form.is_active),
    applies_promotions: Boolean(form.applies_promotions),
    attribute_value_ids: (form.attribute_value_ids || []).map(Number),
    metadata,
  }
}

function buildVariantAttributeValuePayload(attribute = {}, value = {}) {
  const isColor = isColorVariantAttribute(attribute)
  const hasImage = isColor && value.image instanceof File
  const payload = hasImage ? new FormData() : {}

  function append(key, fieldValue) {
    if (fieldValue === undefined || fieldValue === null || fieldValue === "") return

    if (hasImage) {
      payload.append(key, fieldValue)
      return
    }

    payload[key] = fieldValue
  }

  append("value", value.value)
  append("slug", value.slug)
  append("sort_order", value.sort_order)
  append("is_active", value.is_active)

  if (isColor && value.hex) {
    append("metadata[hex]", value.hex)
  }

  if (hasImage) {
    payload.append("image", value.image)
  }

  if (isColor && value.remove_image) {
    append("remove_image", true)
  }

  return payload
}

function isValidVariantColorImage(file) {
  if (!(file instanceof File)) return false

  return VARIANT_COLOR_IMAGE_TYPES.includes(file.type) && file.size <= VARIANT_COLOR_IMAGE_MAX_SIZE
}

function getVariantAttributeValueErrorMessage(error, fallback) {
  const message = error?.response?.data?.message || ""
  const errors = error?.response?.data?.errors || {}
  const imageErrors = Array.isArray(errors.image) ? errors.image.join(" ") : ""
  const fullMessage = `${message} ${imageErrors}`.trim()

  if (/image field must be an image/i.test(fullMessage)) {
    return "La imagen del color debe ser un archivo de imagen válido."
  }

  if (/image.*must not be greater|image.*may not be greater/i.test(fullMessage)) {
    return "La imagen del color no debe superar 5 MB."
  }

  if (/image/i.test(fullMessage)) {
    return "No fue posible guardar la imagen del color. Verifica que sea JPG, PNG, WEBP, GIF o SVG."
  }

  return message || fallback
}

function isColorVariantAttribute(attribute = {}) {
  const normalized = `${attribute.slug || ""} ${attribute.name || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  return normalized.includes("color")
}

function buildGeneratedVariantPayload(combination, productForm = {}, defaultSortOrder = 1) {
  const suffix = combination.values
    .map((value) => value.slug || slugify(value.value || value.id))
    .filter(Boolean)
    .join("-")
  const baseSku = productForm.sku?.trim() || "VAR"
  const combinationName = combination.values.map((value) => value.value).filter(Boolean).join(" / ")

  return {
    sku: `${baseSku}-${suffix || defaultSortOrder}`.toUpperCase(),
    name: [productForm.name, combinationName].filter(Boolean).join(" - "),
    price: productForm.default_price === "" ? null : Number(productForm.default_price || 0),
    compare_price: null,
    stock: 0,
    sort_order: defaultSortOrder,
    is_active: true,
    applies_promotions: true,
    attribute_value_ids: combination.values.map((value) => Number(value.id)),
    metadata: {},
  }
}

function buildMissingVariantCombinations(attributes = [], variants = []) {
  const usableAttributes = attributes
    .map((attribute) => ({
      ...attribute,
      values: (attribute.values || []).filter((value) => value?.id && !value.pending),
    }))
    .filter((attribute) => attribute.values.length > 0)

  if (!usableAttributes.length || usableAttributes.length !== attributes.length) return []

  const existingKeys = new Set(
    variants
      .map((variant) => buildVariantCombinationKey(getVariantValueIds(variant)))
      .filter(Boolean)
  )

  return buildCombinationMatrix(usableAttributes).filter((combination) => {
    const key = buildVariantCombinationKey(combination.values.map((value) => value.id))
    return key && !existingKeys.has(key)
  })
}

function buildCombinationMatrix(attributes = [], index = 0, selectedValues = []) {
  const attribute = attributes[index]

  if (!attribute) {
    return [{ values: selectedValues }]
  }

  return attribute.values.flatMap((value) => {
    return buildCombinationMatrix(attributes, index + 1, [...selectedValues, value])
  })
}

function getVariantValueIds(variant = {}) {
  if (Array.isArray(variant.attribute_value_ids)) {
    return variant.attribute_value_ids
  }

  if (Array.isArray(variant.attribute_values)) {
    return variant.attribute_values.map((value) => value.id)
  }

  return []
}

function getSelectedVariantValues(attributes = [], selectedValueIds = []) {
  const selectedIds = new Set(selectedValueIds.map(Number).filter(Boolean))

  return attributes.flatMap((attribute) => {
    return (attribute.values || []).filter((value) => selectedIds.has(Number(value.id)))
  })
}

function buildVariantSku(productForm = {}, selectedValues = []) {
  const baseSku = productForm.sku?.trim() || "VAR"
  const suffix = selectedValues
    .map((value) => value.slug || slugify(value.value || value.id))
    .filter(Boolean)
    .join("-")

  return suffix ? `${baseSku}-${suffix}`.toUpperCase() : ""
}

function buildVariantCombinationKey(valueIds = []) {
  const normalizedIds = valueIds.map(Number).filter(Boolean).sort((a, b) => a - b)

  return normalizedIds.length ? normalizedIds.join(":") : ""
}

function slugify(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizeGalleryItemMedia(item = {}) {
  return {
    ...item,
    media_url: normalizeMediaUrl(item.media_url),
  }
}
