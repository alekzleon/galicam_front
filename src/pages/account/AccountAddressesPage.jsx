import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  createAccountAddress,
  deleteAccountAddress,
  getAccountAddresses,
  setAccountAddressDefault,
  updateAccountAddress,
} from "../../services/api/accountService"
import {
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
} from "../../utils/toast"
import { useLocalization } from "../../context/LocalizationContext"
import "./account-addresses.css"

const emptyAddressForm = {
  alias: "",
  street: "",
  address_line_2: "",
  zip_code: "",
  neighborhood: "",
  state: "",
  delivery_note: "",
  contact_name: "",
  phone: "",
  is_default: false,
}

function AccountAddressesPage() {
  const { t } = useLocalization()
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [defaultingId, setDefaultingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [form, setForm] = useState(emptyAddressForm)

  useEffect(() => {
    loadInitialData()
  }, [])

  const sortedAddresses = useMemo(() => {
    return [...addresses].sort((a, b) => Number(b.is_default) - Number(a.is_default))
  }, [addresses])

  async function loadInitialData() {
    try {
      setLoading(true)
      const addressesResponse = await getAccountAddresses()

      setAddresses(normalizeAddresses(addressesResponse))
    } catch (error) {
      console.error("Error al cargar direcciones:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || t("checkoutLoadAddressError"))
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingAddressId(null)
    setForm({
      ...emptyAddressForm,
      is_default: addresses.length === 0,
    })
    setModalOpen(true)
  }

  function openEditModal(address) {
    setEditingAddressId(address.id)
    setForm({
      alias: address.alias || "",
      street: address.street || "",
      address_line_2: address.address_line_2 || "",
      zip_code: address.zip_code || "",
      neighborhood: address.neighborhood || "",
      state: address.state || "",
      delivery_note: address.delivery_note || "",
      contact_name: address.contact_name || "",
      phone: address.phone || "",
      is_default: Boolean(address.is_default),
    })
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setEditingAddressId(null)
    setForm(emptyAddressForm)
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.alias.trim() || !form.street.trim() || !form.zip_code.trim()) {
      notifyWarning(t("checkoutAddressRequiredFields"))
      return
    }

    try {
      setSaving(true)
      const payload = buildAddressPayload(form)
      const response = editingAddressId
        ? await updateAccountAddress(editingAddressId, payload)
        : await createAccountAddress(payload)

      notifySuccess(
        response?.message ||
          (editingAddressId ? t("accountAddressUpdated") : t("accountAddressAdded"))
      )
      setModalOpen(false)
      setEditingAddressId(null)
      setForm(emptyAddressForm)
      await loadInitialData()
    } catch (error) {
      console.error("Error al guardar dirección:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || t("accountAddressSaveError"))
    } finally {
      setSaving(false)
    }
  }

  async function handleSetDefault(address) {
    if (address.is_default) {
      notifyInfo(t("accountAddressAlreadyDefault"))
      return
    }

    try {
      setDefaultingId(address.id)
      const response = await setAccountAddressDefault(address.id)
      notifySuccess(response?.message || t("accountAddressDefaultUpdated"))
      await loadInitialData()
    } catch (error) {
      console.error("Error al marcar default:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || t("accountAddressDefaultError"))
    } finally {
      setDefaultingId(null)
    }
  }

  async function handleDeleteAddress(address) {
    if (!window.confirm(t("accountAddressDeleteConfirm", { alias: address.alias }))) return

    try {
      setDeletingId(address.id)
      const response = await deleteAccountAddress(address.id)
      notifySuccess(response?.message || t("accountAddressDeleted"))
      await loadInitialData()
    } catch (error) {
      console.error("Error al eliminar dirección:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || t("accountAddressDeleteError"))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="account_addresses_page">
      <div className="account_addresses_shell">
        <div className="account_addresses_breadcrumb">
          <Link to="/mi-cuenta">{t("myAccount")}</Link>
          <span>›</span>
          <span>{t("accountAddressesTitle")}</span>
        </div>

        <header className="account_addresses_header">
          <div>
            <h1 className="account_addresses_title">{t("accountAddressesTitle")}</h1>
            <p className="account_addresses_text">
              {t("accountAddressesIntro")}
            </p>
          </div>
          <button type="button" className="address_header_btn" onClick={openCreateModal}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            {t("checkoutAddAddress")}
          </button>
        </header>

        {loading ? (
          <div className="address_empty_state">
            <h2>{t("checkoutAddressesLoading")}</h2>
            <p>{t("accountAddressesLoadingText")}</p>
          </div>
        ) : sortedAddresses.length === 0 ? (
          <div className="address_empty_state">
            <h2>{t("accountAddressesEmptyTitle")}</h2>
            <p>{t("accountAddressesEmptyText")}</p>
            <button type="button" className="address_btn address_btn_primary" onClick={openCreateModal}>
              {t("checkoutAddAddress")}
            </button>
          </div>
        ) : (
          <section className="account_addresses_grid">
            <button type="button" className="address_add_card" onClick={openCreateModal}>
              <span className="address_add_plus">+</span>
              <span className="address_add_text">{t("checkoutAddAddress")}</span>
            </button>

            {sortedAddresses.map((address) => (
              <article className="address_card" key={address.id}>
                <div className="address_card_top">
                  <div className="address_card_top_label">
                    {address.is_default ? (
                      <>
                        <span className="address_default_text">{t("checkoutAddressDefault")}:</span>
                        <span className="address_default_brand">{t("defaultStoreName")}</span>
                      </>
                    ) : (
                      <span className="address_secondary_text">{t("accountSavedAddress")}</span>
                    )}
                  </div>
                </div>

                <div className="address_card_body">
                  <h2 className="address_name">{address.contact_name || t("checkoutNoContact")}</h2>

                  <p className="address_line">
                    <strong>{address.alias || t("accountNoAlias")}</strong>
                  </p>

                  <p className="address_line">{address.street || "-"}</p>
                  {address.address_line_2 ? (
                    <p className="address_line">{address.address_line_2}</p>
                  ) : null}
                  <p className="address_line">{address.neighborhood || "-"}</p>
                  <p className="address_line">
                    {[address.zip_code, address.state].filter(Boolean).join(", ") || "-"}
                  </p>
                  <p className="address_line">{t("phoneNumber")}: {address.phone || "-"}</p>

                  {address.delivery_note ? (
                    <button
                      type="button"
                      className="address_instruction_link"
                      onClick={() => notifyInfo(`${t("checkoutAddressDeliveryInstructions")}: ${address.delivery_note}`)}
                    >
                      {t("accountViewDeliveryInstructions")}
                    </button>
                  ) : null}
                </div>

                <div className="address_card_actions">
                  <button
                    type="button"
                    className={`address_favorite_btn ${address.is_default ? "is-active" : ""}`}
                    onClick={() => handleSetDefault(address)}
                    disabled={defaultingId === address.id || address.is_default}
                    aria-label={address.is_default ? t("checkoutAddressDefault") : t("accountMarkAsDefault")}
                    title={address.is_default ? t("checkoutAddressDefault") : t("accountMarkAsDefault")}
                  >
                    <i className={`bi ${address.is_default ? "bi-heart-fill" : "bi-heart"}`} aria-hidden="true" />
                  </button>

                  <div className="address_card_footer_links">
                    <button
                      type="button"
                      className="address_action_link"
                      onClick={() => openEditModal(address)}
                    >
                      {t("edit")}
                    </button>

                    <button
                      type="button"
                      className="address_action_link address_action_link--danger"
                      onClick={() => handleDeleteAddress(address)}
                      disabled={deletingId === address.id}
                    >
                      {deletingId === address.id ? t("cartRemoving") : t("cartRemove")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {modalOpen ? (
        <div className="address_modal_overlay" role="dialog" aria-modal="true">
          <form className="address_modal" onSubmit={handleSubmit}>
            <div className="address_modal_header">
              <div>
                <h2>{editingAddressId ? t("accountEditAddress") : t("checkoutAddAddress")}</h2>
                <p>{t("accountAddressModalText")}</p>
              </div>
              <button type="button" className="address_modal_close" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="address_modal_body">
              <div className="address_form_grid">
                <label>
                  {t("checkoutAddressFormAlias")}
                  <input name="alias" value={form.alias} onChange={handleFormChange} placeholder={t("addressAliasHomePlaceholder")} />
                </label>
                <label>
                  {t("checkoutAddressFormContact")}
                  <input name="contact_name" value={form.contact_name} onChange={handleFormChange} placeholder={t("contactNamePlaceholder")} />
                </label>
                <label>
                  {t("checkoutAddressFormPhone")}
                  <input name="phone" value={form.phone} onChange={handleFormChange} placeholder="3312345678" />
                </label>
                <label className="address_form_full">
                  {t("checkoutAddressFormStreet")}
                  <input name="street" value={form.street} onChange={handleFormChange} placeholder={t("addressStreetPlaceholder")} />
                </label>
                <label className="address_form_full">
                  {t("checkoutAddressFormComplement")}
                  <input name="address_line_2" value={form.address_line_2} onChange={handleFormChange} placeholder={t("addressComplementPlaceholder")} />
                </label>
                <label>
                  {t("checkoutAddressFormZip")}
                  <input name="zip_code" value={form.zip_code} onChange={handleFormChange} placeholder="44100" />
                </label>
                <label>
                  {t("checkoutAddressFormNeighborhood")}
                  <input name="neighborhood" value={form.neighborhood} onChange={handleFormChange} placeholder={t("addressNeighborhoodPlaceholder")} />
                </label>
                <label>
                  {t("checkoutAddressFormState")}
                  <input name="state" value={form.state} onChange={handleFormChange} placeholder={t("addressStatePlaceholder")} />
                </label>
                <label className="address_form_full">
                  {t("checkoutAddressDeliveryInstructions")}
                  <textarea name="delivery_note" value={form.delivery_note} onChange={handleFormChange} rows="3" placeholder={t("checkoutDeliveryPlaceholder")} />
                </label>
                <label className="address_default_check">
                  <input type="checkbox" name="is_default" checked={form.is_default} onChange={handleFormChange} />
                  {t("checkoutAddressDefaultUse")}
                </label>
              </div>
            </div>

            <div className="address_modal_actions">
              <button type="button" className="address_btn address_btn_secondary" onClick={closeModal}>
                {t("cancel")}
              </button>
              <button type="submit" className="address_btn address_btn_primary" disabled={saving}>
                {saving ? t("saving") : editingAddressId ? t("accountSaveAddress") : t("checkoutAddAddress")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function normalizeAddresses(response) {
  const data = response?.data?.data || response?.data || response || []
  return Array.isArray(data) ? data : []
}

function buildAddressPayload(form) {
  return {
    alias: form.alias.trim(),
    street: form.street.trim(),
    address_line_2: form.address_line_2.trim(),
    zip_code: form.zip_code.trim(),
    neighborhood: form.neighborhood.trim(),
    state: form.state.trim(),
    delivery_note: form.delivery_note.trim(),
    contact_name: form.contact_name.trim(),
    phone: form.phone.trim(),
    is_default: Boolean(form.is_default),
  }
}

export default AccountAddressesPage
