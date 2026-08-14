import AdminSidePanel from "../../components/AdminSidePanel/AdminSidePanel"
import {
  CUSTOMER_STATUS_OPTIONS,
} from "../../../constants/customerStatus"
import "./CustomerDetailPanel.css"

function CustomerDetailPanel({
  isOpen,
  loading,
  saving,
  form,
  onClose,
  onChange,
  onSubmit,
}) {
  const footer = (
    <div className="customer-detail-panel__footer-actions">
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={onClose}
        disabled={saving}
      >
        Cerrar
      </button>

      <button type="submit" form="customer-detail-form" className="btn btn-primary" disabled={saving}>
        {saving ? "Actualizando..." : "Actualizar cliente"}
      </button>
    </div>
  )

  return (
    <AdminSidePanel
      isOpen={isOpen}
      title="Detalle del cliente"
      subtitle="Consulta, organiza y actualiza la información del cliente"
      onClose={onClose}
      closeDisabled={saving}
      footer={footer}
      width="980px"
    >
      {loading ? (
        <div className="customer-detail-panel__loading">Cargando detalle del cliente...</div>
      ) : (
        <form id="customer-detail-form" onSubmit={onSubmit} className="customer-detail-panel">
          <section className="customer-detail-panel__section">
            <div className="customer-detail-panel__section-header">
              <h3>Datos generales</h3>
              <span>Acceso y datos base</span>
            </div>

            <div className="customer-detail-panel__grid customer-detail-panel__grid--3">
              <div>
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={form.name}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">Username</label>
                <input
                  type="text"
                  name="username"
                  className="form-control"
                  value={form.username}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">Correo</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={form.email}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">Nueva contraseña</label>
                <input
                  type="password"
                  name="password"
                  className="form-control"
                  value={form.password}
                  onChange={onChange}
                  placeholder="Solo si deseas cambiarla"
                />
              </div>
            </div>
          </section>

          <section className="customer-detail-panel__section">
            <div className="customer-detail-panel__section-header">
              <h3>Perfil comercial</h3>
              <span>Crédito, ruta y operación</span>
            </div>

            <div className="customer-detail-panel__grid customer-detail-panel__grid--4">
              <div>
                <label className="form-label">Estatus</label>
                <select
                  name="profile.status"
                  className="form-select"
                  value={form.profile.status}
                  onChange={onChange}
                >
                  {CUSTOMER_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Límite crédito</label>
                <input
                  type="number"
                  step="0.01"
                  name="profile.credit_limit"
                  className="form-control"
                  value={form.profile.credit_limit}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">Días crédito</label>
                <input
                  type="number"
                  name="profile.credit_days"
                  className="form-control"
                  value={form.profile.credit_days}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">Descuento %</label>
                <input
                  type="number"
                  step="0.01"
                  name="profile.discount_percent"
                  className="form-control"
                  value={form.profile.discount_percent}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">Vendedor asignado</label>
                <input
                  type="number"
                  name="profile.assigned_seller_id"
                  className="form-control"
                  value={form.profile.assigned_seller_id}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">Ruta</label>
                <input
                  type="text"
                  name="profile.route"
                  className="form-control"
                  value={form.profile.route}
                  onChange={onChange}
                />
              </div>

              <div className="customer-detail-panel__span-4">
                <label className="form-label">Observaciones</label>
                <textarea
                  name="profile.notes"
                  className="form-control"
                  rows="3"
                  value={form.profile.notes}
                  onChange={onChange}
                />
              </div>
            </div>
          </section>

          <section className="customer-detail-panel__section">
            <div className="customer-detail-panel__section-header">
              <h3>Dirección default</h3>
              <span>Información principal de envío</span>
            </div>

            <div className="customer-detail-panel__grid customer-detail-panel__grid--4">
              <div>
                <label className="form-label">Alias</label>
                <input
                  type="text"
                  name="address.alias"
                  className="form-control"
                  value={form.address.alias}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">Nombre contacto</label>
                <input
                  type="text"
                  name="address.contact_name"
                  className="form-control"
                  value={form.address.contact_name}
                  onChange={onChange}
                />
              </div>

              <div className="customer-detail-panel__span-2">
                <label className="form-label">Calle</label>
                <input
                  type="text"
                  name="address.street"
                  className="form-control"
                  value={form.address.street}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">No.</label>
                <input
                  type="text"
                  name="address.external_number"
                  className="form-control"
                  value={form.address.external_number}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">Int.</label>
                <input
                  type="text"
                  name="address.internal_number"
                  className="form-control"
                  value={form.address.internal_number}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">Colonia</label>
                <input
                  type="text"
                  name="address.neighborhood"
                  className="form-control"
                  value={form.address.neighborhood}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">CP</label>
                <input
                  type="text"
                  name="address.zip_code"
                  className="form-control"
                  value={form.address.zip_code}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">Ciudad</label>
                <input
                  type="text"
                  name="address.city"
                  className="form-control"
                  value={form.address.city}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">Estado</label>
                <input
                  type="text"
                  name="address.state"
                  className="form-control"
                  value={form.address.state}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="form-label">Teléfono</label>
                <input
                  type="text"
                  name="address.phone"
                  className="form-control"
                  value={form.address.phone}
                  onChange={onChange}
                />
              </div>

              <div className="customer-detail-panel__span-4">
                <label className="form-label">Referencias</label>
                <textarea
                  name="address.references"
                  className="form-control"
                  rows="3"
                  value={form.address.references}
                  onChange={onChange}
                />
              </div>
            </div>
          </section>
        </form>
      )}
    </AdminSidePanel>
  )
}

export default CustomerDetailPanel
