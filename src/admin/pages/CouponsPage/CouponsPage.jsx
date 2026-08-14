import { useEffect, useMemo, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel"
import {
  createAdminCoupon,
  deleteAdminCoupon,
  getAdminCoupon,
  getAdminCouponFormOptions,
  getAdminCoupons,
  sendAdminCoupon,
  toggleAdminCoupon,
  updateAdminCoupon,
} from "../../../services/api/adminCouponService"
import { notifyError, notifySuccess, notifyWarning } from "../../../utils/toast"
import "./CouponsPage.css"

const EMPTY_COUPON_FORM = {
  code: "",
  name: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  usage_limit: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
  is_general: true,
  user_ids: [],
}

const EMPTY_SEND_FORM = {
  channels: ["email"],
  user_ids: [],
  emails: "",
  whatsapp_numbers: "",
  subject: "",
  message: "",
}

const DEFAULT_OPTIONS = {
  discount_types: [
    { value: "percentage", label: "Porcentaje" },
    { value: "fixed", label: "Monto fijo" },
  ],
  clients: [],
  channels: [
    { value: "email", label: "Correo" },
    { value: "whatsapp", label: "WhatsApp" },
  ],
}

function CouponsPage() {
  const [coupons, setCoupons] = useState([])
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [panelOpen, setPanelOpen] = useState(false)
  const [sendPanelOpen, setSendPanelOpen] = useState(false)
  const [assignPanelOpen, setAssignPanelOpen] = useState(false)
  const [editingCouponId, setEditingCouponId] = useState(null)
  const [selectedCoupon, setSelectedCoupon] = useState(null)
  const [assignmentCoupon, setAssignmentCoupon] = useState(null)
  const [assignmentSearch, setAssignmentSearch] = useState("")
  const [assignmentUserIds, setAssignmentUserIds] = useState([])
  const [form, setForm] = useState(EMPTY_COUPON_FORM)
  const [sendForm, setSendForm] = useState(EMPTY_SEND_FORM)

  useEffect(() => {
    loadCouponsModule()
  }, [])

  const filteredCoupons = useMemo(() => {
    const term = search.trim().toLowerCase()

    return coupons.filter((coupon) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && coupon.is_active) ||
        (statusFilter === "inactive" && !coupon.is_active)

      if (!matchesStatus) return false
      if (!term) return true

      return [coupon.code, coupon.name, coupon.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [coupons, search, statusFilter])

  const activeCount = coupons.filter((coupon) => coupon.is_active).length
  const totalUses = coupons.reduce((sum, coupon) => sum + Number(coupon.usage_count || 0), 0)
  const assignedCount = coupons.filter((coupon) => !coupon.is_general).length
  const isEditing = Boolean(editingCouponId)
  const filteredAssignmentClients = useMemo(() => {
    const term = assignmentSearch.trim().toLowerCase()

    const source = term
      ? options.clients.filter((client) =>
      [client.name, client.email, client.username, client.whatsapp]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
      )
      : options.clients

    return source.slice(0, 5)
  }, [assignmentSearch, options.clients])
  const assignmentHiddenCount = useMemo(() => {
    const term = assignmentSearch.trim().toLowerCase()
    const total = term
      ? options.clients.filter((client) =>
          [client.name, client.email, client.username, client.whatsapp]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(term)
        ).length
      : options.clients.length

    return Math.max(total - filteredAssignmentClients.length, 0)
  }, [assignmentSearch, filteredAssignmentClients.length, options.clients])
  const assignedClients = useMemo(() => {
    const assignedSet = new Set(assignmentUserIds.map(Number))
    return options.clients.filter((client) => assignedSet.has(Number(client.id)))
  }, [assignmentUserIds, options.clients])

  async function loadCouponsModule() {
    try {
      setLoading(true)
      const [couponsResponse, optionsResponse] = await Promise.all([
        getAdminCoupons(),
        getAdminCouponFormOptions(),
      ])

      setCoupons(normalizeCoupons(couponsResponse))
      setOptions(normalizeOptions(optionsResponse))
    } catch (error) {
      console.error("Error al cargar cupones:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar los cupones.")
    } finally {
      setLoading(false)
    }
  }

  function openCreatePanel() {
    setEditingCouponId(null)
    setForm(EMPTY_COUPON_FORM)
    setPanelOpen(true)
  }

  function openEditPanel(coupon) {
    setEditingCouponId(coupon.id)
    setForm(mapCouponToForm(coupon))
    setPanelOpen(true)
  }

  function openSendPanel(coupon) {
    setSelectedCoupon(coupon)
    setSendForm({
      ...EMPTY_SEND_FORM,
      subject: `Cupón ${coupon.code}`,
    })
    setSendPanelOpen(true)
  }

  async function openAssignPanel(coupon) {
    setAssignPanelOpen(true)
    setAssignmentLoading(true)
    setAssignmentSearch("")
    setAssignmentCoupon(coupon)
    setAssignmentUserIds(Array.isArray(coupon.user_ids) ? coupon.user_ids.map(Number) : [])

    try {
      const response = await getAdminCoupon(coupon.id)
      const freshCoupon = normalizeCoupon(response?.data ?? response ?? coupon)
      setAssignmentCoupon(freshCoupon)
      setAssignmentUserIds(Array.isArray(freshCoupon.user_ids) ? freshCoupon.user_ids.map(Number) : [])
    } catch (error) {
      console.error("Error al cargar asignaciones del cupón:", error?.response?.data || error)
      notifyWarning("No fue posible refrescar las asignaciones; se usará la información cargada.")
    } finally {
      setAssignmentLoading(false)
    }
  }

  function closePanel() {
    if (saving) return
    setPanelOpen(false)
    setEditingCouponId(null)
    setForm(EMPTY_COUPON_FORM)
  }

  function closeSendPanel() {
    if (sending) return
    setSendPanelOpen(false)
    setSelectedCoupon(null)
    setSendForm(EMPTY_SEND_FORM)
  }

  function closeAssignPanel() {
    if (assigning) return
    setAssignPanelOpen(false)
    setAssignmentCoupon(null)
    setAssignmentSearch("")
    setAssignmentUserIds([])
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target

    setForm((prev) => {
      const nextValue = type === "checkbox" ? checked : value
      const nextForm = {
        ...prev,
        [name]: nextValue,
      }

      if (name === "discount_type" && value === "fixed") {
        return nextForm
      }

      return nextForm
    })
  }

  function handleSendFieldChange(event) {
    const { name, value } = event.target
    setSendForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleSendChannelsChange(channelValue, checked) {
    setSendForm((prev) => {
      const channels = checked
        ? [...new Set([...prev.channels, channelValue])]
        : prev.channels.filter((channel) => channel !== channelValue)

      return {
        ...prev,
        channels,
      }
    })
  }

  function handleSendUsersChange(event) {
    const selectedIds = Array.from(event.target.selectedOptions).map((option) => Number(option.value))
    setSendForm((prev) => ({
      ...prev,
      user_ids: selectedIds,
    }))
  }

  function toggleAssignmentUser(userId) {
    const numericUserId = Number(userId)

    setAssignmentUserIds((prev) =>
      prev.map(Number).includes(numericUserId)
        ? prev.filter((id) => Number(id) !== numericUserId)
        : [...prev, numericUserId]
    )
    setAssignmentSearch("")
  }

  function removeAssignedUser(userId) {
    const numericUserId = Number(userId)
    setAssignmentUserIds((prev) => prev.filter((id) => Number(id) !== numericUserId))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validation = validateCouponForm(form)
    if (!validation.valid) {
      notifyWarning(validation.message)
      return
    }

    try {
      setSaving(true)
      const payload = buildCouponPayload(form)
      const response = isEditing
        ? await updateAdminCoupon(editingCouponId, payload)
        : await createAdminCoupon(payload)

      notifySuccess(response?.message || (isEditing ? "Cupón actualizado." : "Cupón creado."))
      await loadCouponsModule()
      closePanel()
    } catch (error) {
      console.error("Error al guardar cupón:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar el cupón.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleCouponStatus(couponId) {
    try {
      const response = await toggleAdminCoupon(couponId)
      notifySuccess(response?.message || "Estado del cupón actualizado.")
      await loadCouponsModule()
    } catch (error) {
      console.error("Error al cambiar estado de cupón:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cambiar el estado.")
    }
  }

  async function removeCoupon(coupon) {
    if (!window.confirm(`¿Eliminar el cupón ${coupon.code}?`)) return

    try {
      const response = await deleteAdminCoupon(coupon.id)
      notifySuccess(response?.message || "Cupón eliminado.")
      await loadCouponsModule()
    } catch (error) {
      console.error("Error al eliminar cupón:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar el cupón.")
    }
  }

  async function handleSendCoupon(event) {
    event.preventDefault()

    if (!selectedCoupon?.id) return
    if (!sendForm.channels.length) {
      notifyWarning("Selecciona al menos un canal de envío.")
      return
    }

    const payload = buildSendPayload(sendForm)
    const hasRecipients =
      payload.user_ids.length ||
      payload.emails.length ||
      payload.whatsapp_numbers.length

    if (!hasRecipients) {
      notifyWarning("Selecciona clientes o agrega destinatarios manuales.")
      return
    }

    try {
      setSending(true)
      const response = await sendAdminCoupon(selectedCoupon.id, payload)
      notifySuccess(response?.message || "Cupón enviado correctamente.")
      closeSendPanel()
    } catch (error) {
      console.error("Error al enviar cupón:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible enviar el cupón.")
    } finally {
      setSending(false)
    }
  }

  async function handleSaveAssignment() {
    if (!assignmentCoupon?.id) return

    try {
      setAssigning(true)
      const payload = buildCouponPayloadFromCoupon(assignmentCoupon, {
        is_general: assignmentUserIds.length === 0,
        user_ids: assignmentUserIds.map(Number),
      })
      const response = await updateAdminCoupon(assignmentCoupon.id, payload)

      notifySuccess(response?.message || "Asignación del cupón actualizada.")
      await loadCouponsModule()
      closeAssignPanel()
    } catch (error) {
      console.error("Error al asignar cupón:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar la asignación.")
    } finally {
      setAssigning(false)
    }
  }

  return (
    <>
      <AdminCard
        title="Cupones"
        subtitle="Crea y administra códigos promocionales para campañas de marketing."
        right={
          <button type="button" className="coupons-button coupons-button--primary" onClick={openCreatePanel}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Nuevo cupón
          </button>
        }
      >
        <div className="coupons-page">
          <section className="coupons-page__summary" aria-label="Resumen de cupones">
            <div>
              <span>Total</span>
              <strong>{coupons.length}</strong>
            </div>
            <div>
              <span>Activos</span>
              <strong>{activeCount}</strong>
            </div>
            <div>
              <span>Asignados</span>
              <strong>{assignedCount}</strong>
            </div>
            <div>
              <span>Usos registrados</span>
              <strong>{totalUses}</strong>
            </div>
          </section>

          <div className="coupons-page__toolbar">
            <label className="coupons-page__search">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por código, nombre o descripción"
              />
            </label>

            <div className="coupons-page__segmented" role="group" aria-label="Filtrar estado">
              {[
                ["all", "Todos"],
                ["active", "Activos"],
                ["inactive", "Inactivos"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={statusFilter === value ? "is-active" : ""}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="coupons-page__table-wrapper">
            <table className="coupons-page__table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descuento</th>
                  <th>Uso</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="coupons-page__empty">
                      Cargando cupones...
                    </td>
                  </tr>
                ) : filteredCoupons.length ? (
                  filteredCoupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td>
                        <div className="coupons-page__code-cell">
                          <strong>{coupon.code}</strong>
                          <span>{coupon.name}</span>
                        </div>
                      </td>
                      <td>
                        <strong>{formatDiscount(coupon)}</strong>
                      </td>
                      <td>
                        <div className="coupons-page__usage">
                          <strong>{coupon.usage_count || coupon.redemptions_count || 0}</strong>
                          <span>{coupon.usage_limit ? `de ${coupon.usage_limit}` : "sin límite"}</span>
                        </div>
                      </td>
                      <td>{formatValidity(coupon)}</td>
                      <td>
                        <label className="coupons-switch">
                          <input
                            type="checkbox"
                            checked={Boolean(coupon.is_active)}
                            onChange={() => toggleCouponStatus(coupon.id)}
                          />
                          <span>{coupon.is_active ? "Activo" : "Inactivo"}</span>
                        </label>
                      </td>
                      <td className="text-end">
                        <div className="coupons-page__actions">
                          <button
                            type="button"
                            className="coupons-action-button"
                            onClick={() => openAssignPanel(coupon)}
                          >
                            Asignar cupón
                          </button>
                          <button
                            type="button"
                            className="coupons-icon-button coupons-icon-button--send"
                            onClick={() => openSendPanel(coupon)}
                            title="Enviar cupón"
                            aria-label={`Enviar ${coupon.code}`}
                          >
                            <i className="bi bi-send" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="coupons-icon-button coupons-icon-button--edit"
                            onClick={() => openEditPanel(coupon)}
                            title="Editar cupón"
                            aria-label={`Editar ${coupon.code}`}
                          >
                            <i className="bi bi-pencil-square" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="coupons-icon-button coupons-icon-button--delete"
                            onClick={() => removeCoupon(coupon)}
                            title="Eliminar cupón"
                            aria-label={`Eliminar ${coupon.code}`}
                          >
                            <i className="bi bi-trash3" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="coupons-page__empty">
                      No hay cupones con esos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminCard>

      <AdminSidePanel
        isOpen={panelOpen}
        title={isEditing ? "Editar cupón" : "Nuevo cupón"}
        subtitle="Marketing · Cupones"
        onClose={closePanel}
        closeDisabled={saving}
        width="lg"
        footer={
          <div className="coupons-panel__footer">
            <button type="button" className="coupons-button coupons-button--secondary" onClick={closePanel} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" form="coupon-form" className="coupons-button coupons-button--primary" disabled={saving}>
              {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear cupón"}
            </button>
          </div>
        }
      >
        <form id="coupon-form" className="coupons-panel" onSubmit={handleSubmit}>
          <section className="coupons-panel__section">
            <h4>Datos generales</h4>
            <div className="coupons-panel__grid">
              <label className="coupons-panel__field">
                <span>Código</span>
                <input name="code" value={form.code} onChange={handleFormChange} placeholder="VERANO10" />
              </label>
              <label className="coupons-panel__field">
                <span>Nombre</span>
                <input name="name" value={form.name} onChange={handleFormChange} placeholder="Campaña de temporada" />
              </label>
            </div>
            <label className="coupons-panel__field">
              <span>Descripción</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleFormChange}
                rows="3"
                placeholder="Cupón general de temporada"
              />
            </label>
          </section>

          <section className="coupons-panel__section">
            <h4>Reglas del cupón</h4>
            <div className="coupons-panel__grid coupons-panel__grid--three">
              <label className="coupons-panel__field">
                <span>Tipo</span>
                <select name="discount_type" value={form.discount_type} onChange={handleFormChange}>
                  {options.discount_types.map((type) => (
                    <option value={type.value} key={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="coupons-panel__field">
                <span>Descuento</span>
                <input
                  type="number"
                  min="0"
                  max={form.discount_type === "percentage" ? "100" : undefined}
                  step="0.01"
                  name="discount_value"
                  value={form.discount_value}
                  onChange={handleFormChange}
                  placeholder={form.discount_type === "percentage" ? "10" : "200"}
                />
              </label>
              <label className="coupons-panel__field">
                <span>Límite de usos</span>
                <input
                  type="number"
                  min="0"
                  name="usage_limit"
                  value={form.usage_limit}
                  onChange={handleFormChange}
                  placeholder="Sin límite"
                />
              </label>
            </div>
          </section>

          <section className="coupons-panel__section">
            <h4>Publicación</h4>
            <div className="coupons-panel__grid">
              <label className="coupons-panel__field">
                <span>Inicio</span>
                <input type="datetime-local" name="starts_at" value={form.starts_at} onChange={handleFormChange} />
              </label>
              <label className="coupons-panel__field">
                <span>Fin</span>
                <input type="datetime-local" name="ends_at" value={form.ends_at} onChange={handleFormChange} />
              </label>
            </div>
            <label className="coupons-panel__check">
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleFormChange} />
              <span>Activo</span>
            </label>
          </section>
        </form>
      </AdminSidePanel>

      <AdminSidePanel
        isOpen={assignPanelOpen}
        title="Asignar cupón"
        subtitle={assignmentCoupon ? `${assignmentCoupon.code} · ${assignmentCoupon.name}` : "Marketing · Cupones"}
        onClose={closeAssignPanel}
        closeDisabled={assigning}
        width="lg"
        footer={
          <div className="coupons-panel__footer">
            <button type="button" className="coupons-button coupons-button--secondary" onClick={closeAssignPanel} disabled={assigning}>
              Cancelar
            </button>
            <button type="button" className="coupons-button coupons-button--primary" onClick={handleSaveAssignment} disabled={assigning || assignmentLoading}>
              {assigning ? "Guardando..." : "Guardar asignación"}
            </button>
          </div>
        }
      >
        {assignmentLoading ? (
          <div className="coupons-page__empty">Cargando asignaciones...</div>
        ) : (
          <div className="coupons-assignment">
            <section className="coupons-panel__section">
              <h4>Usuarios asignados</h4>
              {assignedClients.length ? (
                <div className="coupons-assignment__assigned-list">
                  {assignedClients.map((client) => (
                    <div className="coupons-assignment__assigned-user" key={client.id}>
                      <div>
                        <strong>{client.name || client.username || client.email}</strong>
                        <span>{client.email || client.username || "Sin correo"}</span>
                      </div>
                      <button
                        type="button"
                        className="coupons-icon-button coupons-icon-button--delete"
                        onClick={() => removeAssignedUser(client.id)}
                        title="Quitar usuario"
                        aria-label={`Quitar ${client.name || client.email || client.id}`}
                      >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="coupons-assignment__empty">Este cupón no tiene clientes asignados. Se guardará como general si no seleccionas usuarios.</p>
              )}
            </section>

            <section className="coupons-panel__section">
              <h4>Clientes disponibles</h4>
              <label className="coupons-page__search coupons-assignment__search">
                <i className="bi bi-search" aria-hidden="true" />
                <input
                  type="search"
                  value={assignmentSearch}
                  onChange={(event) => setAssignmentSearch(event.target.value)}
                  placeholder="Buscar cliente por nombre, correo, usuario o WhatsApp"
                />
              </label>

              <div className="coupons-assignment__client-list">
                {filteredAssignmentClients.length ? (
                  <>
                    {filteredAssignmentClients.map((client) => {
                      const checked = assignmentUserIds.map(Number).includes(Number(client.id))

                      return (
                        <label className="coupons-assignment__client" key={client.id}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAssignmentUser(client.id)}
                          />
                          <span>
                            <strong>{client.name || client.username || client.email}</strong>
                            <small>
                              {[client.email, client.username, client.whatsapp].filter(Boolean).join(" · ") || "Cliente sin datos de contacto"}
                            </small>
                          </span>
                        </label>
                      )
                    })}
                    {assignmentHiddenCount > 0 ? (
                      <p className="coupons-assignment__empty">
                        {assignmentHiddenCount} cliente(s) más. Usa el buscador para encontrarlos.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="coupons-assignment__empty">No hay clientes con esa búsqueda.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </AdminSidePanel>

      <AdminSidePanel
        isOpen={sendPanelOpen}
        title="Enviar cupón"
        subtitle={selectedCoupon ? `${selectedCoupon.code} · ${selectedCoupon.name}` : "Marketing · Cupones"}
        onClose={closeSendPanel}
        closeDisabled={sending}
        width="lg"
        footer={
          <div className="coupons-panel__footer">
            <button type="button" className="coupons-button coupons-button--secondary" onClick={closeSendPanel} disabled={sending}>
              Cancelar
            </button>
            <button type="submit" form="coupon-send-form" className="coupons-button coupons-button--primary" disabled={sending}>
              {sending ? "Enviando..." : "Enviar cupón"}
            </button>
          </div>
        }
      >
        <form id="coupon-send-form" className="coupons-panel" onSubmit={handleSendCoupon}>
          <section className="coupons-panel__section">
            <h4>Canales</h4>
            <div className="coupons-panel__checks">
              {options.channels.map((channel) => (
                <label className="coupons-panel__check" key={channel.value}>
                  <input
                    type="checkbox"
                    checked={sendForm.channels.includes(channel.value)}
                    onChange={(event) => handleSendChannelsChange(channel.value, event.target.checked)}
                  />
                  <span>{channel.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="coupons-panel__section">
            <h4>Destinatarios</h4>
            <label className="coupons-panel__field">
              <span>Clientes</span>
              <select multiple value={sendForm.user_ids.map(String)} onChange={handleSendUsersChange}>
                {options.clients.map((client) => (
                  <option value={client.id} key={client.id}>
                    {client.name || client.username || client.email} {client.email ? `· ${client.email}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="coupons-panel__grid">
              <label className="coupons-panel__field">
                <span>Correos extra</span>
                <input name="emails" value={sendForm.emails} onChange={handleSendFieldChange} placeholder="extra@mail.com, otro@mail.com" />
              </label>
              <label className="coupons-panel__field">
                <span>WhatsApp extra</span>
                <input name="whatsapp_numbers" value={sendForm.whatsapp_numbers} onChange={handleSendFieldChange} placeholder="5219999999999" />
              </label>
            </div>
          </section>

          <section className="coupons-panel__section">
            <h4>Mensaje</h4>
            <label className="coupons-panel__field">
              <span>Asunto</span>
              <input name="subject" value={sendForm.subject} onChange={handleSendFieldChange} placeholder="Cupón especial para ti" />
            </label>
            <label className="coupons-panel__field">
              <span>Mensaje</span>
              <textarea name="message" value={sendForm.message} onChange={handleSendFieldChange} rows="4" placeholder="Aprovecha este cupón en tu próxima compra." />
            </label>
          </section>
        </form>
      </AdminSidePanel>
    </>
  )
}

function normalizeCoupons(response) {
  const payload = response?.data ?? response ?? []
  const items =
    payload?.data && Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.coupons)
      ? payload.coupons
      : []

  return items.map(normalizeCoupon)
}

function normalizeCoupon(coupon = {}) {
  return {
    ...coupon,
    is_active: Boolean(coupon.is_active),
    is_general: Boolean(coupon.is_general),
    usage_count: Number(coupon.usage_count ?? coupon.redemptions_count ?? 0),
    users_count: Number(coupon.users_count ?? coupon.users?.length ?? 0),
    user_ids: Array.isArray(coupon.user_ids)
      ? coupon.user_ids
      : Array.isArray(coupon.users)
      ? coupon.users.map((user) => user.id)
      : [],
  }
}

function normalizeOptions(response) {
  const data = response?.data ?? response ?? {}

  return {
    discount_types: Array.isArray(data.discount_types) && data.discount_types.length
      ? data.discount_types
      : DEFAULT_OPTIONS.discount_types,
    clients: Array.isArray(data.clients) ? data.clients : [],
    channels: Array.isArray(data.channels) && data.channels.length
      ? data.channels
      : DEFAULT_OPTIONS.channels,
  }
}

function mapCouponToForm(coupon) {
  return {
    code: coupon.code || "",
    name: coupon.name || "",
    description: coupon.description || "",
    discount_type: coupon.discount_type || "percentage",
    discount_value: coupon.discount_value ?? "",
    usage_limit: coupon.usage_limit ?? "",
    starts_at: toDateTimeLocalValue(coupon.starts_at),
    ends_at: toDateTimeLocalValue(coupon.ends_at),
    is_active: Boolean(coupon.is_active),
    is_general: Boolean(coupon.is_general),
    user_ids: Array.isArray(coupon.user_ids) ? coupon.user_ids.map(Number) : [],
  }
}

function validateCouponForm(form) {
  if (!form.code.trim() || !form.name.trim()) {
    return { valid: false, message: "Completa código y nombre del cupón." }
  }

  const discountValue = Number(form.discount_value || 0)

  if (discountValue <= 0) {
    return { valid: false, message: "El descuento debe ser mayor a 0." }
  }

  if (form.discount_type === "percentage" && discountValue > 100) {
    return { valid: false, message: "El porcentaje no puede ser mayor a 100." }
  }

  return { valid: true, message: "" }
}

function buildCouponPayload(form) {
  const payload = {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value || 0),
    is_active: Boolean(form.is_active),
    is_general: Boolean(form.is_general),
    starts_at: form.starts_at ? `${form.starts_at.replace("T", " ")}:00` : null,
    ends_at: form.ends_at ? `${form.ends_at.replace("T", " ")}:00` : null,
    usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit),
    metadata: {},
  }

  if (!payload.is_general) {
    payload.user_ids = form.user_ids.map(Number)
  }

  return payload
}

function buildCouponPayloadFromCoupon(coupon, assignment) {
  const startsAt = toDateTimeLocalValue(coupon.starts_at)
  const endsAt = toDateTimeLocalValue(coupon.ends_at)
  const isGeneral = Boolean(assignment.is_general)
  const payload = {
    code: String(coupon.code || "").trim().toUpperCase(),
    name: String(coupon.name || "").trim(),
    description: coupon.description || null,
    discount_type: coupon.discount_type || "percentage",
    discount_value: Number(coupon.discount_value || 0),
    is_active: Boolean(coupon.is_active),
    is_general: isGeneral,
    starts_at: startsAt ? `${startsAt.replace("T", " ")}:00` : null,
    ends_at: endsAt ? `${endsAt.replace("T", " ")}:00` : null,
    usage_limit: coupon.usage_limit === undefined || coupon.usage_limit === "" ? null : coupon.usage_limit,
    metadata: coupon.metadata || {},
  }

  if (!isGeneral) {
    payload.user_ids = assignment.user_ids.map(Number)
  }

  return payload
}

function buildSendPayload(form) {
  return {
    channels: form.channels,
    user_ids: form.user_ids.map(Number),
    emails: splitList(form.emails),
    whatsapp_numbers: splitList(form.whatsapp_numbers),
    subject: form.subject.trim() || null,
    message: form.message.trim() || null,
  }
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatDiscount(coupon) {
  const value = Number(coupon.discount_value || 0)

  if (coupon.discount_type === "fixed") {
    return formatMoney(value)
  }

  return `${Number.isInteger(value) ? value : value.toFixed(2)}%`
}

function formatValidity(coupon) {
  const start = formatShortDate(coupon.starts_at) || "Sin inicio"
  const end = formatShortDate(coupon.ends_at) || "Sin fin"
  return `${start} - ${end}`
}

function formatShortDate(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0))
}

function toDateTimeLocalValue(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const pad = (number) => String(number).padStart(2, "0")

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default CouponsPage
