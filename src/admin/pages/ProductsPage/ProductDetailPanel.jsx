import { useMemo, useState } from "react"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel"
import AdminTranslationsFields from "../../components/AdminTranslationsFields/AdminTranslationsFields"
import RichTextEditor from "./RichTextEditor"
import "./ProductDetailPanel.css"

function RequiredMark() {
  return <span className="product-detail__required">*</span>
}

function EntityAutocomplete({
  label,
  required = false,
  value,
  entity,
  options,
  placeholder,
  type,
  onSelect,
  onCreate,
  disabled = false,
}) {
  const [query, setQuery] = useState(entity?.name || value || "")
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options.slice(0, 6)

    return options
      .filter((option) => {
        return (
          option.name.toLowerCase().includes(normalizedQuery) ||
          String(option.id).includes(normalizedQuery)
        )
      })
      .slice(0, 6)
  }, [normalizedQuery, options])
  const hasExactMatch = options.some((option) => {
    return option.name.toLowerCase() === normalizedQuery || String(option.id) === normalizedQuery
  })

  function handleSelect(option) {
    setQuery(option ? option.name : "")
    onSelect(type, option)
  }

  function handleCreate() {
    if (!query.trim()) return

    onCreate(type, query.trim())
  }

  return (
    <div className="product-detail__field product-detail__autocomplete">
      <label className="form-label">
        {label} {required ? <RequiredMark /> : null}
      </label>
      <input
        type="text"
        className="form-control"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          if (!event.target.value.trim()) handleSelect(null)
        }}
        placeholder={placeholder}
        required={required && !value}
        disabled={disabled}
      />
      <input type="hidden" name={`${type}_id`} value={value || ""} readOnly />

      {query.trim() ? (
        <div className="product-detail__autocomplete-menu">
          {filteredOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={Number(value) === Number(option.id) ? "is-selected" : ""}
              onClick={() => handleSelect(option)}
              disabled={disabled}
            >
              <span>{option.name}</span>
              <small>#{option.id}</small>
            </button>
          ))}

          {!hasExactMatch ? (
            <button type="button" className="is-create" onClick={handleCreate} disabled={disabled}>
              Crear “{query.trim()}”
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ProductDetailPanel({
  isOpen,
  loading,
  saving,
  mode,
  form,
  locales = [],
  title,
  categoryOptions = [],
  familyOptions = [],
  galleryEnabled,
  galleryItems = [],
  galleryLoading,
  gallerySaving,
  galleryForm,
  activeVariantAttribute = null,
  variantCatalog = [],
  variantCatalogLoading = false,
  variants = [],
  variantsLoading,
  variantsSaving,
  variantValueDrafts = {},
  variantForm,
  variantCatalogForm,
  generatedVariantSku = "",
  variantFormIncomplete = false,
  onClose,
  onChange,
  onTranslationChange,
  onEntitySelect,
  onEntityCreate,
  onGalleryToggle,
  onGalleryFormChange,
  onGalleryAdd,
  onGalleryItemChange,
  onGalleryItemToggle,
  onGalleryDelete,
  onGalleryMove,
  onVariantValueDraftChange,
  onVariantAttributeValueAdd,
  onVariantAttributeValueDelete,
  onVariantAttributeValueImageUpdate,
  onVariantAttributeValueImageRemove,
  onVariantAttributeDelete,
  onVariantCatalogFormChange,
  onVariantCatalogAttributeChange,
  onVariantCatalogCreateAttribute,
  onVariantCatalogImport,
  onVariantFormChange,
  onVariantValueToggle,
  onVariantSave,
  onVariantEdit,
  onVariantStatusChange,
  onVariantDelete,
  onSubmit,
}) {
  const isCreate = mode === "create"
  const galleryBusy = galleryLoading || gallerySaving || saving
  const variantsBusy = variantsLoading || variantsSaving || saving
  const [selectedGalleryItemId, setSelectedGalleryItemId] = useState(null)
  const selectedGalleryItem = galleryItems.find((item) => item.id === selectedGalleryItemId) || null
  const showCustomAttributeForm = variantCatalogForm?.catalog_attribute_id === "custom"
  const activeAttributeIsColor = isColorVariantAttribute(activeVariantAttribute)

  function handleBooleanSelect(name, value) {
    onChange({
      target: {
        name,
        value: value === "1",
        type: "checkbox",
        checked: value === "1",
      },
    })
  }

  function handleDescriptionChange(value) {
    onChange({
      target: {
        name: "description",
        value,
        type: "text",
      },
    })
  }

  const footer = !loading ? (
    <div className="product-detail__footer-actions">
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={onClose}
        disabled={saving}
      >
        Cerrar
      </button>

      <button
        type="submit"
        form="product-detail-form"
        className="btn btn-primary"
        disabled={saving}
      >
        {saving
          ? isCreate
            ? "Creando..."
            : "Actualizando..."
          : isCreate
          ? "Crear producto"
          : "Actualizar producto"}
      </button>
    </div>
  ) : null

  return (
    <AdminSidePanel
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      closeDisabled={saving}
      footer={footer}
      width="lg"
    >
      {loading ? (
        <div className="product-page__panel-loading">Cargando detalle del producto...</div>
      ) : (
        <form id="product-detail-form" onSubmit={onSubmit} className="product-detail">
          <fieldset className="product-detail__section product-detail__locked-section">
            <div className="product-detail__section-head">
              <div>
                <h4 className="product-detail__section-title">Información del producto</h4>
                <p className="product-detail__section-subtitle">Nombre y descripciones visibles en tienda.</p>
              </div>
            </div>

            <div className="product-detail__field">
              <label className="form-label">
                Título <RequiredMark />
              </label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={form.name}
                onChange={onChange}
                placeholder="Camiseta de manga corta"
                required
              />
            </div>

            <div className="product-detail__field">
              <label className="form-label">Descripción</label>
              <RichTextEditor
                value={form.description}
                onChange={handleDescriptionChange}
                disabled={saving}
              />
            </div>

            <div className="product-detail__field">
              <label className="form-label">Descripción corta</label>
              <textarea
                name="short_description"
                className="form-control"
                rows="3"
                value={form.short_description}
                onChange={onChange}
                placeholder="Texto breve para el listado"
              />
            </div>

            <AdminTranslationsFields
              locales={locales}
              translations={form.translations}
              fields={[
                {
                  name: "name",
                  label: "Título",
                  placeholder: "Título traducido",
                },
                {
                  name: "description",
                  label: "Descripción",
                  type: "textarea",
                  placeholder: "Descripción traducida",
                },
                {
                  name: "short_description",
                  label: "Descripción corta",
                  type: "textarea",
                  placeholder: "Descripción corta traducida",
                },
              ]}
              onChange={onTranslationChange}
            />
          </fieldset>

          <section className="product-detail__section">
            <div className="product-detail__section-head">
              <div>
                <h4 className="product-detail__section-title">Multimedia</h4>
                <p className="product-detail__section-subtitle">
                  Imagen principal y recursos adicionales del producto.
                </p>
              </div>
              <button
                type="button"
                className={`btn btn-sm ${galleryEnabled ? "btn-primary" : "btn-outline-primary"}`}
                onClick={onGalleryToggle}
              >
                Galería
              </button>
            </div>

            <div className={`product-detail__media-box ${form.image_url ? "has-preview" : ""}`}>
              <div className="product-detail__media-copy">
                <strong>Imagen principal</strong>
                <span>Será la primera imagen del producto en listados y detalle.</span>
              </div>

              <div className="product-detail__media-actions">
                <label className="btn btn-outline-secondary product-detail__upload-button">
                  Subir nuevo
                  <input
                    type="file"
                    name="image"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={onChange}
                  />
                </label>
                <button type="button" className="btn btn-link" disabled>
                  Seleccionar existente
                </button>
              </div>

              {form.image_url ? (
                <div className="product-detail__media-preview">
                  <img src={form.image_url} alt={form.name || "Vista previa del producto"} />
                </div>
              ) : null}

              <p>Acepta imágenes JPG, PNG o WEBP. Máximo 4 MB.</p>
            </div>
          </section>

          {galleryEnabled ? (
            <section className="product-detail__section">
              <div className="product-detail__section-head">
                <div>
                  <h4 className="product-detail__section-title">Galería</h4>
                  <p className="product-detail__section-subtitle">
                    Agrega varias imágenes o videos, revisa su preview y acomódalos en el orden correcto.
                  </p>
                </div>
              </div>

              <div className="product-detail__media-box product-detail__gallery-upload">
                <div className="product-detail__media-actions">
                  <label className="btn btn-outline-secondary product-detail__upload-button">
                    Agregar archivos
                    <input
                      type="file"
                      name="media"
                      accept=".jpg,.jpeg,.png,.mp4,.webm,.mov,image/jpeg,image/png,video/mp4,video/webm,video/quicktime"
                      multiple
                      onChange={onGalleryFormChange}
                    />
                  </label>
                </div>

                <p>Acepta JPG, PNG, MP4, WEBM o MOV. Puedes seleccionar varios archivos a la vez.</p>
              </div>

              {!isCreate && galleryForm.media ? (
                <>
                  <div className="product-detail__grid product-detail__grid--two">
                    <div className="product-detail__field">
                      <label className="form-label">Título</label>
                      <input
                        type="text"
                        name="title"
                        className="form-control"
                        value={galleryForm.title}
                        onChange={onGalleryFormChange}
                        placeholder="Vista frontal"
                        disabled={galleryBusy}
                      />
                    </div>

                    <div className="product-detail__field">
                      <label className="form-label">Orden</label>
                      <input
                        type="number"
                        name="sort_order"
                        className="form-control"
                        value={galleryForm.sort_order}
                        onChange={onGalleryFormChange}
                        placeholder={String(galleryItems.length + 1)}
                        disabled={galleryBusy}
                      />
                    </div>

                    <div className="product-detail__field product-detail__field--full">
                      <label className="form-label">Descripción</label>
                      <textarea
                        name="description"
                        className="form-control"
                        rows="2"
                        value={galleryForm.description}
                        onChange={onGalleryFormChange}
                        placeholder="Imagen principal del empaque"
                        disabled={galleryBusy}
                      />
                    </div>
                  </div>

                  <label className="product-detail__check">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={galleryForm.is_active}
                      onChange={onGalleryFormChange}
                      disabled={galleryBusy}
                    />
                    Activo
                  </label>

                  <div>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={onGalleryAdd}
                      disabled={galleryBusy || !galleryForm.media}
                    >
                      {gallerySaving ? "Guardando..." : "Agregar a galería"}
                    </button>
                  </div>
                </>
              ) : null}

              <div className="product-detail__gallery-list">
                {galleryLoading ? (
                  <div className="product-detail__gallery-empty">Cargando galería...</div>
                ) : galleryItems.length === 0 ? (
                  <div className="product-detail__gallery-empty">Sin archivos en galería.</div>
                ) : (
                  galleryItems.map((item, index) => (
                    <article className="product-detail__gallery-card" key={item.id}>
                      <button
                        type="button"
                        className={`product-detail__gallery-tile ${
                          selectedGalleryItemId === item.id ? "is-selected" : ""
                        }`}
                        onClick={() => {
                          if (!isCreate && !item.pending) setSelectedGalleryItemId(item.id)
                        }}
                      >
                        <div className="product-detail__gallery-thumb">
                          {item.media_type === "video" ? (
                            <video src={item.media_url} />
                          ) : (
                            <img src={item.media_url} alt={item.title || "Archivo de galería"} />
                          )}
                        </div>

                        <span>{item.sort_order || index + 1}</span>
                      </button>

                      <div className="product-detail__gallery-card-body">
                        <strong>{item.title || item.media?.name || `Archivo ${index + 1}`}</strong>
                        <span>{item.pending ? "Pendiente de guardar" : item.is_active ? "Activo" : "Inactivo"}</span>
                      </div>

                      <div className="product-detail__gallery-card-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => onGalleryMove(item.id, -1)}
                          disabled={galleryBusy || index === 0}
                        >
                          Subir
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => onGalleryMove(item.id, 1)}
                          disabled={galleryBusy || index === galleryItems.length - 1}
                        >
                          Bajar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => onGalleryDelete(item.id)}
                          disabled={galleryBusy}
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {!isCreate && galleryItems.length > 0 && !selectedGalleryItem ? (
                <div className="product-detail__gallery-empty">
                  Selecciona una imagen de la galería para editarla.
                </div>
              ) : null}
            </section>
          ) : null}

          <fieldset className="product-detail__section product-detail__locked-section">
            <div className="product-detail__section-head">
              <div>
                <h4 className="product-detail__section-title">Precio e inventario</h4>
                <p className="product-detail__section-subtitle">Datos operativos principales del producto.</p>
              </div>
            </div>

            <div className="product-detail__grid product-detail__grid--two">
              <div className="product-detail__field">
                <label className="form-label">
                  Precio <RequiredMark />
                </label>
                <div className="product-detail__money-input">
                  <span>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="default_price"
                    className="form-control"
                    value={form.default_price}
                    onChange={onChange}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="product-detail__field">
                <label className="form-label">
                  SKU <RequiredMark />
                </label>
                <input
                  type="text"
                  name="sku"
                  className="form-control"
                  value={form.sku}
                  onChange={onChange}
                  placeholder="SKU-PRUEBA-001"
                  required
                />
              </div>

              <div className="product-detail__field">
                <label className="form-label">Stock</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="stock"
                  className="form-control"
                  value={form.stock}
                  onChange={onChange}
                  placeholder="Vacío = no controlar"
                />
                <small className="product-detail__help">Déjalo vacío para no controlar inventario.</small>
              </div>

              <div className="product-detail__field">
                <label className="form-label">Estatus</label>
                <select
                  name="is_active"
                  className="form-select"
                  value={form.is_active ? "1" : "0"}
                  onChange={(event) => handleBooleanSelect("is_active", event.target.value)}
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>

              <div className="product-detail__field">
                <label className="form-label">Procesado</label>
                <select
                  name="processed"
                  className="form-select"
                  value={form.processed ? "1" : "0"}
                  onChange={(event) => handleBooleanSelect("processed", event.target.value)}
                >
                  <option value="0">No</option>
                  <option value="1">Sí</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="product-detail__section product-detail__locked-section">
            <div className="product-detail__section-head">
              <div>
                <h4 className="product-detail__section-title">Variantes</h4>
                <p className="product-detail__section-subtitle">Opciones, SKU, precios y stock por variante.</p>
              </div>
            </div>

            <div className="product-detail__variant-builder">
              {isCreate ? (
                <div className="product-detail__variant-notice">
                  Guarda el producto para importar atributos del catálogo y generar combinaciones.
                </div>
              ) : null}

              <div className="product-detail__variant-step">
                <div className="product-detail__variant-step-head">
                  <span>1</span>
                  <div>
                    <strong>Elige atributos del catálogo</strong>
                    <p>Selecciona el atributo que tendrá este producto. Los valores se capturan en el paso 2.</p>
                  </div>
                </div>

                <div
                  className={`product-detail__variant-catalog ${
                    showCustomAttributeForm ? "is-custom" : ""
                  }`}
                >
                  <div className="product-detail__field">
                    <label className="form-label">Atributo</label>
                    <select
                      className="form-select"
                      value={variantCatalogForm?.catalog_attribute_id || ""}
                      onChange={onVariantCatalogAttributeChange}
                      disabled={variantsBusy || variantCatalogLoading}
                    >
                      <option value="">
                        {variantCatalogLoading ? "Cargando catálogo..." : "Selecciona un atributo"}
                      </option>
                      {variantCatalog.map((attribute) => (
                        <option key={attribute.id} value={attribute.id}>
                          {attribute.name}
                          {attribute.scope === "custom" ? " · personalizado" : ""}
                        </option>
                      ))}
                      <option value="custom">Atributo personalizado</option>
                    </select>
                  </div>

                  {!showCustomAttributeForm ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => onVariantCatalogImport()}
                      disabled={
                        variantsBusy ||
                        !variantCatalogForm?.catalog_attribute_id
                      }
                    >
                      Usar atributo
                    </button>
                  ) : null}
                </div>

                {showCustomAttributeForm ? (
                  <div className="product-detail__variant-custom">
                    <div className="product-detail__grid">
                      <div className="product-detail__field">
                        <label className="form-label">Atributo personalizado</label>
                        <input
                          type="text"
                          name="custom_attribute_name"
                          className="form-control"
                          value={variantCatalogForm?.custom_attribute_name || ""}
                          onChange={onVariantCatalogFormChange}
                          placeholder="Origen, Aroma, Presentación..."
                          disabled={variantsBusy}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={onVariantCatalogCreateAttribute}
                      disabled={variantsBusy || !variantCatalogForm?.custom_attribute_name?.trim()}
                    >
                      Crear atributo personalizado
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="product-detail__variant-step">
                <div className="product-detail__variant-step-head">
                  <span>2</span>
                  <div>
                    <strong>Valores del producto</strong>
                    <p>Estos valores se usan para armar cada variante vendible.</p>
                  </div>
                </div>

                <div className="product-detail__variant-options">
                  {!activeVariantAttribute ? (
                    <div className="product-detail__gallery-empty is-incomplete">
                      Primero selecciona un atributo en el paso 1.
                    </div>
                  ) : (
                      <div className="product-detail__variant-option" key={activeVariantAttribute.id}>
                        <div className="product-detail__variant-option-handle">
                          <i className="bi bi-grip-vertical" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="product-detail__variant-option-title">
                            <strong>{activeVariantAttribute.name}</strong>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => onVariantAttributeDelete(activeVariantAttribute)}
                              disabled={variantsBusy}
                            >
                              Eliminar atributo
                            </button>
                          </div>
                          <div className="product-detail__variant-chips">
                            {(activeVariantAttribute.values || []).map((value) => (
                              <span
                                key={value.id}
                                className="product-detail__variant-chip-group"
                              >
                                <button
                                  type="button"
                                  className={`product-detail__variant-chip ${
                                    variantForm.attribute_value_ids?.some(
                                      (selectedValueId) => Number(selectedValueId) === Number(value.id)
                                    )
                                      ? "is-selected"
                                      : ""
                                  }`}
                                  onClick={() => onVariantValueToggle(activeVariantAttribute.id, value.id)}
                                >
                                  {getVariantColorImageUrl(value) ? (
                                    <span className="product-detail__variant-swatch product-detail__variant-swatch--image">
                                      <img src={getVariantColorImageUrl(value)} alt={value.value} />
                                    </span>
                                  ) : value.metadata?.hex ? (
                                    <span
                                      className="product-detail__variant-swatch"
                                      style={{ backgroundColor: value.metadata.hex }}
                                    />
                                  ) : null}
                                  {value.value}
                                </button>
                                <button
                                  type="button"
                                  className="product-detail__variant-chip-remove"
                                  onClick={() => onVariantAttributeValueDelete(activeVariantAttribute, value)}
                                  disabled={variantsBusy}
                                  title={`Eliminar ${value.value}`}
                                  aria-label={`Eliminar ${value.value}`}
                                >
                                  <i className="bi bi-x-lg" aria-hidden="true" />
                                </button>
                                {activeAttributeIsColor ? (
                                  <span className="product-detail__variant-chip-image-actions">
                                    <label
                                      className="product-detail__variant-chip-image-button"
                                      title={`Subir imagen para ${value.value}`}
                                    >
                                      <i className="bi bi-image" aria-hidden="true" />
                                      <input
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.webp,.gif,.svg,image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                                        onChange={(event) => {
                                          const file = event.target.files?.[0] || null
                                          if (file) onVariantAttributeValueImageUpdate(activeVariantAttribute, value, file)
                                          event.target.value = ""
                                        }}
                                        disabled={variantsBusy || value.pending}
                                      />
                                    </label>
                                    {getVariantColorImageUrl(value) ? (
                                      <button
                                        type="button"
                                        className="product-detail__variant-chip-image-button"
                                        onClick={() => onVariantAttributeValueImageRemove(activeVariantAttribute, value)}
                                        disabled={variantsBusy || value.pending}
                                        title={`Quitar imagen de ${value.value}`}
                                      >
                                        <i className="bi bi-image-alt" aria-hidden="true" />
                                      </button>
                                    ) : null}
                                  </span>
                                ) : null}
                              </span>
                            ))}
                          </div>

                          <div className="product-detail__variant-value-add">
                            <input
                              type="text"
                              className="form-control"
                              value={getVariantValueDraft(variantValueDrafts, activeVariantAttribute.id).value}
                              onChange={(event) =>
                                onVariantValueDraftChange(activeVariantAttribute.id, "value", event.target.value)
                              }
                              placeholder={`Agregar valores para ${activeVariantAttribute.name}`}
                            />
                            {activeAttributeIsColor ? (
                              <>
                                <input
                                  type="color"
                                  className="form-control form-control-color product-detail__variant-color-input"
                                  value={getVariantValueDraft(variantValueDrafts, activeVariantAttribute.id).hex || "#000000"}
                                  onChange={(event) =>
                                    onVariantValueDraftChange(activeVariantAttribute.id, "hex", event.target.value)
                                  }
                                  title="Color"
                                />
                                <label className="btn btn-outline-secondary product-detail__variant-image-upload">
                                  Imagen
                                  <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.gif,.svg,image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                                    onChange={(event) => {
                                      const file = event.target.files?.[0] || null
                                      if (!file) return
                                      onVariantValueDraftChange(activeVariantAttribute.id, "image", file)
                                      onVariantValueDraftChange(
                                        activeVariantAttribute.id,
                                        "preview_url",
                                        URL.createObjectURL(file)
                                      )
                                    }}
                                  />
                                </label>
                                {getVariantValueDraft(variantValueDrafts, activeVariantAttribute.id).preview_url ? (
                                  <span className="product-detail__variant-draft-preview">
                                    <img
                                      src={getVariantValueDraft(variantValueDrafts, activeVariantAttribute.id).preview_url}
                                      alt="Preview color"
                                    />
                                  </span>
                                ) : null}
                              </>
                            ) : null}
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              onClick={() => onVariantAttributeValueAdd(activeVariantAttribute)}
                              disabled={
                                variantsBusy ||
                                !getVariantValueDraft(variantValueDrafts, activeVariantAttribute.id).value?.trim()
                              }
                            >
                              Agregar
                            </button>
                          </div>
                        </div>
                      </div>
                  )}
                </div>
              </div>

              <div className="product-detail__variant-step product-detail__variant-step--generate">
                <div className="product-detail__variant-step-head">
                  <span>3</span>
                  <div>
                    <strong>Configura la variante</strong>
                    <p>
                      Selecciona un valor arriba, agrega precio y stock, y guarda la variante.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`product-detail__variant-form ${variantFormIncomplete ? "is-incomplete" : ""}`}>
              <div className="product-detail__grid product-detail__grid--two">
                <div className="product-detail__field">
                  <label className="form-label">SKU calculado</label>
                  <input
                    type="text"
                    className="form-control"
                    value={generatedVariantSku || "Selecciona un valor para calcular SKU"}
                    readOnly
                  />
                </div>
                <div className="product-detail__field">
                  <label className="form-label">
                    Precio <RequiredMark />
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="price"
                    className="form-control"
                    value={variantForm.price}
                    onChange={onVariantFormChange}
                  />
                </div>
                <div className="product-detail__field">
                  <label className="form-label">
                    Stock <RequiredMark />
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="stock"
                    className="form-control"
                    value={variantForm.stock}
                    onChange={onVariantFormChange}
                  />
                </div>
              </div>

              <div className="product-detail__variant-toggles">
                <label className="product-detail__check">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={variantForm.is_active}
                    onChange={onVariantFormChange}
                  />
                  Activa
                </label>
                <label className="product-detail__check">
                  <input
                    type="checkbox"
                    name="applies_promotions"
                    checked={variantForm.applies_promotions}
                    onChange={onVariantFormChange}
                  />
                  Aplica promociones
                </label>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={onVariantSave}
                disabled={variantsBusy}
              >
                {variantForm.id ? "Actualizar variante" : "Agregar variante"}
              </button>
            </div>

            <div className="product-detail__variant-list">
              {variantsLoading ? (
                <div className="product-detail__gallery-empty">Cargando variantes...</div>
              ) : variants.length === 0 ? (
                <div className="product-detail__gallery-empty">Sin variantes registradas.</div>
              ) : (
                variants.map((variant) => (
                  <div className="product-detail__variant-row" key={variant.id}>
                    <div>
                      <strong>{variant.name || variant.sku}</strong>
                      <span>{variant.sku}</span>
                      <div className="product-detail__variant-chips">
                        {(variant.attribute_values || []).map((value) => (
                          <span className="product-detail__variant-chip" key={value.id}>
                            {value.value}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="product-detail__variant-row-meta">
                      <span>${Number(variant.price_number ?? variant.price ?? 0).toFixed(2)}</span>
                      <span>Stock {variant.stock ?? 0}</span>
                    </div>
                    <div className="product-detail__variant-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => onVariantEdit(variant)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${variant.is_active ? "btn-warning" : "btn-success"}`}
                        onClick={() => onVariantStatusChange(variant.id, !variant.is_active)}
                        disabled={variantsBusy}
                      >
                        {variant.is_active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onVariantDelete(variant)}
                        disabled={variantsBusy}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </fieldset>

          <fieldset className="product-detail__section product-detail__locked-section">
            <div className="product-detail__section-head">
              <div>
                <h4 className="product-detail__section-title">Categoría</h4>
                <p className="product-detail__section-subtitle">Clasificación para filtros y búsqueda.</p>
              </div>
            </div>

            <div className="product-detail__grid product-detail__grid--two">
              <EntityAutocomplete
                key={`category-${form.category_id}-${form.category?.name || ""}`}
                label="Categoría"
                required
                value={form.category_id}
                entity={form.category}
                options={categoryOptions}
                placeholder="Elige una categoría de producto"
                type="category"
                onSelect={onEntitySelect}
                onCreate={onEntityCreate}
                disabled={saving}
              />

              <EntityAutocomplete
                key={`family-${form.family_id}-${form.family?.name || ""}`}
                label="Familia"
                value={form.family_id}
                entity={form.family}
                options={familyOptions}
                placeholder={form.category_id ? "Elige una familia" : "Primero elige una categoría"}
                type="family"
                onSelect={onEntitySelect}
                onCreate={onEntityCreate}
                disabled={saving || !form.category_id}
              />
            </div>

            <p className="product-detail__hint">
              Determina las tasas de impuestos y mejora la búsqueda, los filtros y las ventas multicanal.
            </p>
          </fieldset>

          <fieldset className="product-detail__section product-detail__locked-section">
            <div className="product-detail__section-head">
              <div>
                <h4 className="product-detail__section-title">Organización</h4>
                <p className="product-detail__section-subtitle">Marca, URL y palabras clave internas.</p>
              </div>
            </div>

            <div className="product-detail__grid product-detail__grid--two">
              <div className="product-detail__field">
                <label className="form-label">Marca</label>
                <input
                  type="text"
                  name="brand"
                  className="form-control"
                  value={form.brand}
                  onChange={onChange}
                />
              </div>

              <div className="product-detail__field">
                <label className="form-label">Slug</label>
                <input
                  type="text"
                  name="slug"
                  className="form-control"
                  value={form.slug}
                  onChange={onChange}
                  placeholder="Se puede dejar vacío"
                />
              </div>

              <div className="product-detail__field">
                <label className="form-label">Keyword</label>
                <input
                  type="text"
                  name="keyword"
                  className="form-control"
                  value={form.keyword}
                  onChange={onChange}
                  placeholder="abarrotes, prueba"
                />
              </div>
            </div>
          </fieldset>
        </form>
      )}

      {!isCreate && selectedGalleryItem ? (
        <div className="product-detail__asset-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="product-detail__asset-backdrop"
            onClick={() => setSelectedGalleryItemId(null)}
            aria-label="Cerrar editor de recurso"
          />

          <div className="product-detail__asset-dialog">
            <button
              type="button"
              className="product-detail__asset-close"
              onClick={() => setSelectedGalleryItemId(null)}
              aria-label="Cerrar"
            >
              Cerrar
            </button>

            <div className="product-detail__asset-editor">
              <div className="product-detail__asset-preview">
                {selectedGalleryItem.media_type === "video" ? (
                  <video src={selectedGalleryItem.media_url} controls />
                ) : (
                  <img
                    src={selectedGalleryItem.media_url}
                    alt={selectedGalleryItem.title || "Recurso de galería"}
                  />
                )}
              </div>

              <div className="product-detail__asset-info">
                <div className="product-detail__asset-panel">
                  <h5>Información</h5>

                  <div className="product-detail__field">
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedGalleryItem.title || ""}
                      onChange={(event) =>
                        onGalleryItemChange(selectedGalleryItem.id, "title", event.target.value)
                      }
                      placeholder="Vista frontal"
                      disabled={galleryBusy}
                    />
                  </div>

                  <div className="product-detail__field">
                    <label className="form-label">Texto alternativo</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedGalleryItem.description || ""}
                      onChange={(event) =>
                        onGalleryItemChange(
                          selectedGalleryItem.id,
                          "description",
                          event.target.value
                        )
                      }
                      disabled={galleryBusy}
                    />
                  </div>

                  <div className="product-detail__asset-details">
                    <strong>Detalles</strong>
                    <span>{selectedGalleryItem.media_type || "image"}</span>
                    <span>Orden {selectedGalleryItem.sort_order || "-"}</span>
                    <span>{selectedGalleryItem.is_active ? "Activo" : "Inactivo"}</span>
                  </div>

                  <div className="product-detail__field">
                    <label className="form-label">Orden</label>
                    <input
                      type="number"
                      className="form-control"
                      value={selectedGalleryItem.sort_order || ""}
                      onChange={(event) =>
                        onGalleryItemChange(
                          selectedGalleryItem.id,
                          "sort_order",
                          event.target.value
                        )
                      }
                      disabled={galleryBusy}
                    />
                  </div>
                </div>

                <div className="product-detail__asset-actions">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => onGalleryMove(selectedGalleryItem.id, -1)}
                    disabled={
                      galleryBusy ||
                      galleryItems.findIndex((item) => item.id === selectedGalleryItem.id) === 0
                    }
                  >
                    Subir posición
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => onGalleryMove(selectedGalleryItem.id, 1)}
                    disabled={
                      galleryBusy ||
                      galleryItems.findIndex((item) => item.id === selectedGalleryItem.id) ===
                        galleryItems.length - 1
                    }
                  >
                    Bajar posición
                  </button>
                  <button
                    type="button"
                    className={`btn ${selectedGalleryItem.is_active ? "btn-warning" : "btn-success"}`}
                    onClick={() => onGalleryItemToggle(selectedGalleryItem.id)}
                    disabled={galleryBusy}
                  >
                    {selectedGalleryItem.is_active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => {
                      onGalleryDelete(selectedGalleryItem.id)
                      setSelectedGalleryItemId(null)
                    }}
                    disabled={galleryBusy}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminSidePanel>
  )
}

export default ProductDetailPanel

function getVariantValueDraft(drafts = {}, attributeId) {
  const draft = drafts[attributeId]

  if (!draft) return { value: "", hex: "", image: null, preview_url: "" }
  if (typeof draft === "string") return { value: draft, hex: "", image: null, preview_url: "" }

  return {
    value: draft.value || "",
    hex: draft.hex || "",
    image: draft.image || null,
    preview_url: draft.preview_url || "",
  }
}

function isColorVariantAttribute(attribute = {}) {
  const normalized = `${attribute?.slug || ""} ${attribute?.name || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  return normalized.includes("color")
}

function getVariantColorImageUrl(value = {}) {
  return (
    value.color_image?.url ||
    value.image_url ||
    value.image_path ||
    value.thumbnail_url ||
    value.thumbnail_path ||
    value.media_url ||
    value.media_path ||
    value.metadata?.image_url ||
    value.metadata?.image_path ||
    ""
  )
}
