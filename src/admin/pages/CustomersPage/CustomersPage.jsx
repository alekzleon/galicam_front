import { useEffect, useMemo, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel.jsx"
import {
  getAdminCustomers,
  getAdminCustomer,
  inviteAdminCustomer,
  updateAdminCustomer,
  updateAdminCustomerStatus,
} from "../../../services/api/customersService.js"
import {
  CUSTOMER_STATUS,
  CUSTOMER_STATUS_OPTIONS,
  getCustomerStatusLabel,
  getCustomerStatusVariant,
} from "../../../constants/customerStatus"
import { notifyError, notifySuccess } from "../../../utils/toast.js"
import "./CustomersPage.css"

const INITIAL_MODAL_FORM = {
  name: "",
  username: "",
  email: "",
  profile: {
    status: CUSTOMER_STATUS.ACTIVO,
    credit_limit: "",
    credit_days: "",
    discount_percent: "",
    assigned_seller_id: "",
    route: "",
    notes: "",
  },
  pfr: {
    price_list: "",
  },
}

const INITIAL_INVITE_FORM = {
  commercial_name: "",
  email: "",
  whatsapp: "",
}

const PFR_SECTION_LABELS = {
  general: "General",
  billing: "Facturación",
  delivery: "Entrega",
}

const PRICE_LIST_OPTIONS = ["Lista 1", "Lista 3", "Lista 5", "Lista 20"]

function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const [filters, setFilters] = useState({
    search: "",
    status: "",
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

  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)
  const [panelSaving, setPanelSaving] = useState(false)
  const [panelForm, setPanelForm] = useState(INITIAL_MODAL_FORM)
  const [invitePanelOpen, setInvitePanelOpen] = useState(false)
  const [inviteSaving, setInviteSaving] = useState(false)
  const [inviteForm, setInviteForm] = useState(INITIAL_INVITE_FORM)

  useEffect(() => {
    fetchCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.per_page, filters.status])

  const statusOptions = useMemo(() => {
    return [{ value: "", label: "Todos los estatus" }, ...CUSTOMER_STATUS_OPTIONS]
  }, [])

  async function fetchCustomers(customSearch = null) {
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

      if (filters.status) {
        params.status = filters.status
      }

      const response = await getAdminCustomers(params)
      const paginated = response?.data || {}

      setCustomers(Array.isArray(paginated.data) ? paginated.data : [])
      setPagination({
        current_page: paginated.current_page || 1,
        last_page: paginated.last_page || 1,
        per_page: Number(paginated.per_page || filters.per_page),
        total: paginated.total || 0,
        from: paginated.from || 0,
        to: paginated.to || 0,
      })
    } catch (error) {
      console.error("Error al obtener clientes:", error)
      notifyError("No fue posible cargar los clientes.")
      setCustomers([])
    } finally {
      setLoading(false)
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

    fetchCustomers(filters.search)
  }

  function handleClearFilters() {
    const resetFilters = {
      search: "",
      status: "",
      page: 1,
      per_page: 10,
    }

    setFilters(resetFilters)
    fetchCustomers("")
  }

  function getAvailableActions(status) {
    switch (status) {
      case CUSTOMER_STATUS.ACTIVO:
        return [
          {
            label: "Suspender",
            nextStatus: CUSTOMER_STATUS.SUSPENDIDO_CREDITO,
            className: "btn-warning",
          },
          {
            label: "Baja",
            nextStatus: CUSTOMER_STATUS.BAJA,
            className: "btn-outline-danger",
          },
        ]

      case CUSTOMER_STATUS.SUSPENDIDO_CREDITO:
        return [
          {
            label: "Activar",
            nextStatus: CUSTOMER_STATUS.ACTIVO,
            className: "btn-success",
          },
          {
            label: "Baja",
            nextStatus: CUSTOMER_STATUS.BAJA,
            className: "btn-outline-danger",
          },
        ]

      case CUSTOMER_STATUS.BAJA:
        return [
          {
            label: "Activar",
            nextStatus: CUSTOMER_STATUS.ACTIVO,
            className: "btn-success",
          },
        ]

      default:
        return [
          {
            label: "Activar",
            nextStatus: CUSTOMER_STATUS.ACTIVO,
            className: "btn-success",
          },
        ]
    }
  }

  async function handleStatusChange(customerId, nextStatus) {
    try {
      setActionLoadingId(customerId)

      await updateAdminCustomerStatus(customerId, {
        status: nextStatus,
      })

      setCustomers((prev) =>
        prev.map((customer) => {
          if (customer.id !== customerId) return customer

          return {
            ...customer,
            customer_profile: {
              ...(customer.customer_profile || {}),
              status: nextStatus,
            },
          }
        })
      )

      if (selectedCustomerId === customerId) {
        setPanelForm((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            status: nextStatus,
          },
        }))
      }

      notifySuccess("Estatus actualizado correctamente.")
    } catch (error) {
      console.error("Error al actualizar status del cliente:", error)
      notifyError("No fue posible actualizar el estatus.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleOpenPanel(customerId) {
    try {
      setPanelOpen(true)
      setSelectedCustomerId(customerId)
      setPanelLoading(true)

      const response = await getAdminCustomer(customerId)
      const customer = response?.data || {}

      const profile = customer.customer_profile || customer.customerProfile || {}
      const pfrProfile = customer.customer_pfr_profile || customer.customerPfrProfile || {}
      setSelectedCustomerDetail(customer)

      setPanelForm({
        name: customer.name || "",
        username: customer.username || "",
        email: customer.email || "",
        profile: {
          status: profile.status || CUSTOMER_STATUS.ACTIVO,
          credit_limit: profile.credit_limit ?? "",
          credit_days: profile.credit_days ?? "",
          discount_percent: profile.discount_percent ?? "",
          assigned_seller_id: profile.assigned_seller_id ?? "",
          route: profile.route || "",
          notes: profile.notes || "",
        },
        pfr: {
          price_list: pfrProfile.price_list || "",
        },
      })
    } catch (error) {
      console.error("Error al cargar detalle del cliente:", error)
      notifyError("No fue posible cargar el detalle del cliente.")
      setPanelOpen(false)
      setSelectedCustomerId(null)
    } finally {
      setPanelLoading(false)
    }
  }

  function handleClosePanel() {
    if (panelSaving) return

    setPanelOpen(false)
    setSelectedCustomerId(null)
    setSelectedCustomerDetail(null)
    setPanelForm(INITIAL_MODAL_FORM)
  }

  function handleOpenInvitePanel() {
    setInviteForm(INITIAL_INVITE_FORM)
    setInvitePanelOpen(true)
  }

  function handleCloseInvitePanel() {
    if (inviteSaving) return
    setInvitePanelOpen(false)
    setInviteForm(INITIAL_INVITE_FORM)
  }

  function handleInviteChange(event) {
    const { name, value } = event.target

    setInviteForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleInviteSubmit(event) {
    event.preventDefault()

    const commercialName = inviteForm.commercial_name.trim()
    const email = inviteForm.email.trim()
    const whatsapp = inviteForm.whatsapp.trim()

    if (!commercialName || !email || !whatsapp) {
      notifyError("Completa nombre comercial, correo y WhatsApp.")
      return
    }

    try {
      setInviteSaving(true)

      const response = await inviteAdminCustomer({
        commercial_name: commercialName,
        email,
        whatsapp,
      })

      const invitedCustomer = response?.data

      if (invitedCustomer?.id) {
        setCustomers((prev) => [invitedCustomer, ...prev].slice(0, Number(filters.per_page)))
        setPagination((prev) => ({
          ...prev,
          total: Number(prev.total || 0) + 1,
          to: Math.min(Number(prev.to || 0) + 1, Number(filters.per_page)),
        }))
      } else {
        fetchCustomers(filters.search)
      }

      notifySuccess(response?.message || "Cliente dado de alta e invitación enviada correctamente.")
      setInvitePanelOpen(false)
      setInviteForm(INITIAL_INVITE_FORM)
    } catch (error) {
      console.error("Error al invitar cliente:", error)
      notifyError(error?.response?.data?.message || "No fue posible dar de alta al cliente.")
    } finally {
      setInviteSaving(false)
    }
  }

  function handlePanelChange(event) {
    const { name, value } = event.target

    if (name.startsWith("profile.")) {
      const key = name.replace("profile.", "")
      setPanelForm((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          [key]: value,
        },
      }))
      return
    }

    if (name.startsWith("pfr.")) {
      const key = name.replace("pfr.", "")
      setPanelForm((prev) => ({
        ...prev,
        pfr: {
          ...prev.pfr,
          [key]: value,
        },
      }))
      return
    }

    setPanelForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handlePanelSubmit(event) {
    event.preventDefault()

    if (!selectedCustomerId) return

    try {
      setPanelSaving(true)

      const payload = {
        name: panelForm.name,
        username: panelForm.username,
        email: panelForm.email,
        profile: {
          ...panelForm.profile,
          credit_limit:
            panelForm.profile.credit_limit === "" ? null : Number(panelForm.profile.credit_limit),
          credit_days:
            panelForm.profile.credit_days === "" ? null : Number(panelForm.profile.credit_days),
          discount_percent:
            panelForm.profile.discount_percent === ""
              ? null
              : Number(panelForm.profile.discount_percent),
          assigned_seller_id:
            panelForm.profile.assigned_seller_id === ""
              ? null
              : Number(panelForm.profile.assigned_seller_id),
        },
        customer_pfr_profile: {
          price_list: panelForm.pfr.price_list || null,
        },
      }

      const response = await updateAdminCustomer(selectedCustomerId, payload)
      const updatedCustomer = response?.data || {}
      const updatedProfile =
        updatedCustomer.customer_profile || updatedCustomer.customerProfile || {}

      setCustomers((prev) =>
        prev.map((item) => {
          if (item.id !== selectedCustomerId) return item
          return {
            ...item,
            ...updatedCustomer,
          }
        })
      )

      setPanelForm((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          status: updatedProfile.status || prev.profile.status,
        },
      }))

      if (updatedCustomer?.id) {
        setSelectedCustomerDetail((prev) => ({
          ...(prev || {}),
          ...updatedCustomer,
          customer_pfr_profile: {
            ...(prev?.customer_pfr_profile || prev?.customerPfrProfile || {}),
            ...(updatedCustomer.customer_pfr_profile || updatedCustomer.customerPfrProfile || {}),
            price_list: panelForm.pfr.price_list || null,
          },
        }))
      }

      notifySuccess("Cliente actualizado correctamente.")
    } catch (error) {
      console.error("Error al actualizar cliente:", error)
      notifyError(
        error?.response?.data?.message || "No fue posible actualizar la información del cliente."
      )
    } finally {
      setPanelSaving(false)
    }
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > pagination.last_page) return

    setFilters((prev) => ({
      ...prev,
      page: nextPage,
    }))
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
      <div className="customer-page__pagination">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => handlePageChange(pagination.current_page - 1)}
          disabled={pagination.current_page === 1 || loading}
        >
          Anterior
        </button>

        <div className="customer-page__pagination-pages">
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

  function getPfrCompletion() {
    return selectedCustomerDetail?.pfr_completion || {}
  }

  function getPfrProfile() {
    return selectedCustomerDetail?.customer_pfr_profile || selectedCustomerDetail?.customerPfrProfile || {}
  }

  function getCustomerProfile() {
    return selectedCustomerDetail?.customer_profile || selectedCustomerDetail?.customerProfile || {}
  }

  function getOnboardingLabel(status) {
    const labels = {
      invited: "Invitado",
      in_progress: "En captura",
      profile_completed: "Perfil completo",
    }

    return labels[status] || status || "Sin iniciar"
  }

  function formatBoolean(value) {
    if (value === true) return "Sí"
    if (value === false) return "No"
    return "-"
  }

  function renderAdminPfrSummary() {
    const completion = getPfrCompletion()
    const percentage = Number(completion.percentage || 0)
    const missingFields = Array.isArray(completion.missing_fields) ? completion.missing_fields : []
    const sections = completion.sections || {}

    return (
      <section className="customer-detail__card customer-detail__pfr-card">
        <div className="customer-detail__card-head">
          <div>
            <h4 className="customer-detail__card-title">Avance PFR</h4>
            <p className="customer-detail__card-text">
              {completion.completed_fields ?? 0} de {completion.total_fields ?? 0} campos completos
            </p>
          </div>

          <strong className="customer-detail__pfr-percent">{percentage}%</strong>
        </div>

        <div className="customer-detail__progress">
          <span style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }} />
        </div>

        <div className="customer-detail__section-progress">
          {Object.entries(sections).map(([key, section]) => (
            <div key={key} className="customer-detail__section-item">
              <span>{PFR_SECTION_LABELS[key] || key}</span>
              <strong>{Number(section?.percentage || 0)}%</strong>
            </div>
          ))}
        </div>

        {missingFields.length > 0 ? (
          <div className="customer-detail__missing">
            <span className="customer-detail__missing-title">Falta completar</span>
            <div className="customer-detail__missing-list">
              {missingFields.map((item) => (
                <span key={item.field || item.label}>{item.label || item.field}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="customer-detail__complete-note">Perfil PFR completo.</div>
        )}
      </section>
    )
  }

  function renderAdminPfrForms() {
    const pfrProfile = getPfrProfile()
    const customerProfile = getCustomerProfile()
    const taxCertificateHref = normalizeMediaUrl(pfrProfile.tax_certificate_url)

    return (
      <>
        <section className="customer-detail__card customer-detail__readonly-card">
          <div className="customer-detail__card-head">
            <div>
              <h4 className="customer-detail__card-title">Alta e invitación</h4>
              <p className="customer-detail__card-text">Datos mínimos con los que se invitó al cliente.</p>
            </div>
          </div>

          <div className="row g-3">
            <ReadonlyField label="Nombre comercial" value={customerProfile.commercial_name || pfrProfile.commercial_name} />
            <ReadonlyField label="WhatsApp" value={customerProfile.whatsapp} />
            <ReadonlyField label="Onboarding" value={getOnboardingLabel(customerProfile.onboarding_status)} />
            <ReadonlyField label="Invitado el" value={formatDateTime(selectedCustomerDetail?.invited_at)} />
            <ReadonlyField
              label="Debe cambiar contraseña"
              value={formatBoolean(Boolean(selectedCustomerDetail?.must_change_password))}
            />
          </div>
        </section>

        <section className="customer-detail__card customer-detail__readonly-card">
          <div className="customer-detail__card-head">
            <div>
              <h4 className="customer-detail__card-title">PFR · General</h4>
              <p className="customer-detail__card-text">Contacto de compra y condiciones declaradas por el cliente.</p>
            </div>
          </div>

          <div className="row g-3">
            <ReadonlyField label="Nombre comercial" value={pfrProfile.commercial_name} />
            <ReadonlyField label="Contacto de compras" value={pfrProfile.purchasing_contact_name} />
            <ReadonlyField label="Correo para cotizaciones" value={pfrProfile.quote_email} />
            <ReadonlyField label="Teléfono de negocio" value={pfrProfile.business_phone} />
            <ReadonlyField label="Contacto secundario" value={pfrProfile.secondary_contact_name} />
            <ReadonlyField label="Teléfono secundario" value={pfrProfile.secondary_phone} />
            <ReadonlyField label="Giro" value={pfrProfile.business_activity} />
            <ReadonlyField label="Método de pago" value={formatPaymentMethod(pfrProfile.payment_method)} />
            <div className="col-12 col-md-4">
              <label className="form-label">Lista de precios</label>
              <select
                name="pfr.price_list"
                className="form-select"
                value={panelForm.pfr.price_list}
                onChange={handlePanelChange}
              >
                <option value="">Sin asignar</option>
                {PRICE_LIST_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <ReadonlyField label="Requiere factura" value={formatBoolean(pfrProfile.requires_invoice)} />
          </div>
        </section>

        <section className="customer-detail__card customer-detail__readonly-card">
          <div className="customer-detail__card-head">
            <div>
              <h4 className="customer-detail__card-title">PFR · Facturación</h4>
              <p className="customer-detail__card-text">Información fiscal y constancia cargada por el cliente.</p>
            </div>
          </div>

          <div className="row g-3">
            <ReadonlyField label="Razón social" value={pfrProfile.fiscal_name} />
            <ReadonlyField label="RFC" value={pfrProfile.rfc} />
            <ReadonlyField label="Calle fiscal" value={pfrProfile.fiscal_street} />
            <ReadonlyField label="No. exterior" value={pfrProfile.fiscal_external_number} />
            <ReadonlyField label="No. interior" value={pfrProfile.fiscal_internal_number} />
            <ReadonlyField label="Código postal" value={pfrProfile.fiscal_zip_code} />
            <ReadonlyField label="Colonia" value={pfrProfile.fiscal_neighborhood} />
            <ReadonlyField label="Ciudad" value={pfrProfile.fiscal_city} />
            <ReadonlyField label="Estado" value={pfrProfile.fiscal_state} />
            <ReadonlyField label="Correo XML" value={pfrProfile.xml_email} />
            <ReadonlyField label="Uso CFDI" value={pfrProfile.cfdi_use} />
            <div className="col-12 col-md-4">
              <label className="form-label">Constancia fiscal</label>
              <div className="customer-detail__readonly-control">
                {taxCertificateHref ? (
                  <a href={taxCertificateHref} target="_blank" rel="noreferrer">
                    Ver PDF
                  </a>
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="customer-detail__card customer-detail__readonly-card">
          <div className="customer-detail__card-head">
            <div>
              <h4 className="customer-detail__card-title">PFR · Entrega</h4>
              <p className="customer-detail__card-text">Dirección y observaciones de entrega del cliente.</p>
            </div>
          </div>

          <div className="row g-3">
            <ReadonlyField
              label="Entrega igual a fiscal"
              value={formatBoolean(pfrProfile.delivery_same_as_fiscal)}
            />
            <ReadonlyTextarea label="Dirección de entrega" value={pfrProfile.delivery_address} />
            <ReadonlyField label="Horario de entrega" value={pfrProfile.delivery_schedule} />
            <ReadonlyTextarea label="Observaciones de entrega" value={pfrProfile.delivery_observations} />
            <ReadonlyTextarea label="Distintivo H" value={pfrProfile.distintivo_h} />
          </div>
        </section>
      </>
    )
  }

  function formatPaymentMethod(value) {
    const labels = {
      efectivo: "Efectivo",
      transferencia_electronica: "Transferencia electrónica",
      cheque: "Cheque",
      efectivo_transferencia: "Efectivo y transferencia",
      otro: "Otro",
    }

    return labels[value] || value || "-"
  }

  function formatDateTime(value) {
    if (!value) return "-"

    try {
      return new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    } catch {
      return value
    }
  }

  return (
    <>
      <AdminCard title="Clientes" subtitle="Listado general de clientes registrados">
        <div className="customer-page">
          <form className="customer-page__filters row g-3 align-items-end" onSubmit={handleSearchSubmit}>
            <div className="col-12 col-md-5">
              <label className="form-label">Buscar cliente</label>
              <input
                type="text"
                name="search"
                className="form-control"
                placeholder="Nombre, username o correo..."
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Estatus</label>
              <select
                name="status"
                className="form-select"
                value={filters.status}
                onChange={handleFilterChange}
              >
                {statusOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
              <div className="customer-page__filter-actions">
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

          <div className="customer-page__summary">
            <div className="customer-page__summary-text">
              {loading ? (
                <span>Cargando clientes...</span>
              ) : (
                <span>
                  Mostrando <strong>{pagination.from || 0}</strong> - <strong>{pagination.to || 0}</strong> de{" "}
                  <strong>{pagination.total}</strong> clientes
                </span>
              )}
            </div>

            <button type="button" className="btn btn-primary" onClick={handleOpenInvitePanel}>
              Agregar cliente
            </button>
          </div>

          <div className="table-responsive customer-page__table-wrapper">
            <table className="table table-hover align-middle customer-page__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Username</th>
                  <th>Correo</th>
                  <th>Estatus</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      Cargando información...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      No se encontraron clientes.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => {
                    const profile = customer.customer_profile || customer.customerProfile || {}
                    const status = profile.status || ""
                    const actions = getAvailableActions(status)

                    return (
                      <tr
                        key={customer.id}
                        className="customer-page__row"
                        onClick={() => handleOpenPanel(customer.id)}
                      >
                        <td className="fw-semibold">{customer.id}</td>
                        <td>{customer.name}</td>
                        <td>{customer.username}</td>
                        <td>{customer.email}</td>
                        <td>
                          <span className={`badge text-bg-${getCustomerStatusVariant(status)}`}>
                            {getCustomerStatusLabel(status)}
                          </span>
                        </td>
                        <td className="text-end">
                          <div
                            className="customer-page__actions"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {actions.map((action) => (
                              <button
                                key={action.nextStatus}
                                type="button"
                                className={`btn btn-sm ${action.className}`}
                                onClick={() => handleStatusChange(customer.id, action.nextStatus)}
                                disabled={actionLoadingId === customer.id}
                              >
                                {actionLoadingId === customer.id ? "Procesando..." : action.label}
                              </button>
                            ))}
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

      <AdminSidePanel
        isOpen={invitePanelOpen}
        title="Agregar cliente"
        subtitle="Crea el acceso mínimo y envía la invitación con contraseña temporal"
        onClose={handleCloseInvitePanel}
        closeDisabled={inviteSaving}
        width="md"
        footer={
          <div className="customer-detail__footer-actions">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleCloseInvitePanel}
              disabled={inviteSaving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              form="customer-invite-form"
              className="btn btn-primary"
              disabled={inviteSaving}
            >
              {inviteSaving ? "Enviando..." : "Enviar invitación"}
            </button>
          </div>
        }
      >
        <form id="customer-invite-form" onSubmit={handleInviteSubmit} className="customer-detail">
          <section className="customer-detail__card">
            <h4 className="customer-detail__card-title">Alta mínima</h4>

            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Nombre comercial</label>
                <input
                  type="text"
                  name="commercial_name"
                  className="form-control"
                  value={inviteForm.commercial_name}
                  onChange={handleInviteChange}
                  placeholder="Abarrotes La Esquina"
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Correo</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={inviteForm.email}
                  onChange={handleInviteChange}
                  placeholder="cliente@correo.com"
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">WhatsApp</label>
                <input
                  type="tel"
                  name="whatsapp"
                  className="form-control"
                  value={inviteForm.whatsapp}
                  onChange={handleInviteChange}
                  placeholder="5512345678"
                  required
                />
              </div>
            </div>
          </section>

          <section className="customer-detail__card customer-detail__notice">
            <h4 className="customer-detail__card-title">Flujo de acceso</h4>
            <p>
              El backend generará la contraseña temporal, marcará al cliente para cambiarla en su
              primer ingreso y enviará el correo de invitación.
            </p>
          </section>
        </form>
      </AdminSidePanel>

      <AdminSidePanel
        isOpen={panelOpen}
        title="Detalle del cliente"
        subtitle="Consulta y actualiza la información sin salir del listado"
        onClose={handleClosePanel}
        closeDisabled={panelSaving}
        width="xl"
        footer={
          !panelLoading ? (
            <div className="customer-detail__footer-actions">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleClosePanel}
                disabled={panelSaving}
              >
                Cerrar
              </button>

              <button
                type="submit"
                form="customer-detail-form"
                className="btn btn-primary"
                disabled={panelSaving}
              >
                {panelSaving ? "Actualizando..." : "Actualizar cliente"}
              </button>
            </div>
          ) : null
        }
      >
        {panelLoading ? (
          <div className="customer-page__panel-loading">Cargando detalle del cliente...</div>
        ) : (
          <form id="customer-detail-form" onSubmit={handlePanelSubmit} className="customer-detail">
            <div className="customer-detail__hero">
              <div>
                <h3 className="customer-detail__hero-title">{panelForm.name || "Cliente sin nombre"}</h3>
                <div className="customer-detail__hero-meta">
                  <span>#{selectedCustomerId}</span>
                  <span>{panelForm.email || "Sin correo"}</span>
                  <span>{panelForm.username || "Sin username"}</span>
                  <span>
                    Onboarding:{" "}
                    {getOnboardingLabel(
                      selectedCustomerDetail?.customer_profile?.onboarding_status ||
                        selectedCustomerDetail?.customerProfile?.onboarding_status
                    )}
                  </span>
                </div>
              </div>

              <span className={`badge text-bg-${getCustomerStatusVariant(panelForm.profile.status)}`}>
                {getCustomerStatusLabel(panelForm.profile.status)}
              </span>
            </div>

            <div className="customer-detail__layout">
              <div className="customer-detail__main">
                {renderAdminPfrForms()}

                <section className="customer-detail__card">
                  <h4 className="customer-detail__card-title">Datos generales</h4>

                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <label className="form-label">Nombre</label>
                      <input
                        type="text"
                        name="name"
                        className="form-control"
                        value={panelForm.name}
                        onChange={handlePanelChange}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">Username</label>
                      <input
                        type="text"
                        name="username"
                        className="form-control"
                        value={panelForm.username}
                        onChange={handlePanelChange}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">Correo</label>
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        value={panelForm.email}
                        onChange={handlePanelChange}
                      />
                    </div>

                  </div>
                </section>

                <section className="customer-detail__card">
                  <h4 className="customer-detail__card-title">Perfil comercial</h4>

                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <label className="form-label">Estatus</label>
                      <select
                        name="profile.status"
                        className="form-select"
                        value={panelForm.profile.status}
                        onChange={handlePanelChange}
                      >
                        {CUSTOMER_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">Ruta</label>
                      <input
                        type="text"
                        name="profile.route"
                        className="form-control"
                        value={panelForm.profile.route}
                        onChange={handlePanelChange}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">Límite crédito</label>
                      <input
                        type="number"
                        step="0.01"
                        name="profile.credit_limit"
                        className="form-control"
                        value={panelForm.profile.credit_limit}
                        onChange={handlePanelChange}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">Días crédito</label>
                      <input
                        type="number"
                        name="profile.credit_days"
                        className="form-control"
                        value={panelForm.profile.credit_days}
                        onChange={handlePanelChange}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">Descuento %</label>
                      <input
                        type="number"
                        step="0.01"
                        name="profile.discount_percent"
                        className="form-control"
                        value={panelForm.profile.discount_percent}
                        onChange={handlePanelChange}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Vendedor asignado</label>
                      <input
                        type="number"
                        name="profile.assigned_seller_id"
                        className="form-control"
                        value={panelForm.profile.assigned_seller_id}
                        onChange={handlePanelChange}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Observaciones</label>
                      <textarea
                        name="profile.notes"
                        className="form-control"
                        rows="3"
                        value={panelForm.profile.notes}
                        onChange={handlePanelChange}
                      />
                    </div>
                  </div>
                </section>

              </div>

              <aside className="customer-detail__aside">
                {renderAdminPfrSummary()}

                <section className="customer-detail__card">
                  <h4 className="customer-detail__card-title">Resumen comercial</h4>

                  <div className="customer-detail__stats">
                    <div className="customer-detail__stat">
                      <span className="customer-detail__stat-label">Ruta</span>
                      <strong className="customer-detail__stat-value">
                        {panelForm.profile.route || "-"}
                      </strong>
                    </div>

                    <div className="customer-detail__stat">
                      <span className="customer-detail__stat-label">Límite crédito</span>
                      <strong className="customer-detail__stat-value">
                        {panelForm.profile.credit_limit || "0"}
                      </strong>
                    </div>

                    <div className="customer-detail__stat">
                      <span className="customer-detail__stat-label">Días crédito</span>
                      <strong className="customer-detail__stat-value">
                        {panelForm.profile.credit_days || "0"}
                      </strong>
                    </div>

                    <div className="customer-detail__stat">
                      <span className="customer-detail__stat-label">Descuento %</span>
                      <strong className="customer-detail__stat-value">
                        {panelForm.profile.discount_percent || "0"}
                      </strong>
                    </div>

                    <div className="customer-detail__stat">
                      <span className="customer-detail__stat-label">Estatus</span>
                      <strong className="customer-detail__stat-value">
                        {getCustomerStatusLabel(panelForm.profile.status)}
                      </strong>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </form>
        )}
      </AdminSidePanel>
    </>
  )
}

function InfoItem({ label, value, wide = false }) {
  return (
    <div className={`customer-detail__info-item ${wide ? "customer-detail__info-item--wide" : ""}`}>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  )
}

function ReadonlyField({ label, value }) {
  return (
    <div className="col-12 col-md-4">
      <label className="form-label">{label}</label>
      <div className="customer-detail__readonly-control">
        <span>{value || "-"}</span>
      </div>
    </div>
  )
}

function ReadonlyTextarea({ label, value }) {
  return (
    <div className="col-12">
      <label className="form-label">{label}</label>
      <div className="customer-detail__readonly-control customer-detail__readonly-control--textarea">
        <span>{value || "-"}</span>
      </div>
    </div>
  )
}

function normalizeMediaUrl(url) {
  const value = String(url || "").trim()
  const mediaBaseUrl = String(
    import.meta.env.VITE_MEDIA_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      ""
  )
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/+$/, "")

  if (!value) return ""
  if (!mediaBaseUrl) return value

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsedUrl = new URL(value)
      return `${mediaBaseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
    } catch {
      return value
    }
  }

  return `${mediaBaseUrl}/${value.replace(/^\/+/, "")}`
}

export default CustomersPage
