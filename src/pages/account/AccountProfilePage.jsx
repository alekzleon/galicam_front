import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLocalization } from "../../context/LocalizationContext";
import { useLoading } from "../../context/LoadingContext";
import {
  changeAccountPassword,
  getAccountProfile,
  getCustomerPfrProfile,
  saveCustomerPfrProfile,
} from "../../services/api/accountService";
import {
  notifySuccess,
  notifyError,
  notifyWarning,
} from "../../utils/toast";
import "./account.css";

const INITIAL_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const INITIAL_PFR_FORM = {
  commercial_name: "",
  purchasing_contact_name: "",
  quote_email: "",
  business_phone: "",
  secondary_contact_name: "",
  secondary_phone: "",
  business_activity: "",
  payment_method: "transferencia_electronica",
  price_list: "",
  requires_invoice: true,
  fiscal_name: "",
  rfc: "",
  fiscal_street: "",
  fiscal_external_number: "",
  fiscal_internal_number: "",
  fiscal_zip_code: "",
  fiscal_neighborhood: "",
  fiscal_city: "",
  fiscal_state: "",
  xml_email: "",
  cfdi_use: "",
  delivery_same_as_fiscal: false,
  delivery_address: "",
  delivery_schedule: "",
  delivery_observations: "",
  distintivo_h: "",
  tax_certificate: null,
};

const PAYMENT_METHODS = [
  { value: "efectivo", labelKey: "paymentCash" },
  { value: "transferencia_electronica", labelKey: "paymentTransfer" },
  { value: "cheque", labelKey: "paymentCheck" },
  { value: "efectivo_transferencia", labelKey: "paymentCashTransfer" },
  { value: "otro", labelKey: "other" },
];

const CFDI_USES = [
  { value: "", label: "Selecciona uso CFDI" },
  { value: "G01", label: "G01 - Adquisición de mercancías" },
  { value: "G02", label: "G02 - Devoluciones, descuentos o bonificaciones" },
  { value: "G03", label: "G03 - Gastos en general" },
  { value: "I01", label: "I01 - Construcciones" },
  { value: "I02", label: "I02 - Mobiliario y equipo de oficina por inversiones" },
  { value: "I03", label: "I03 - Equipo de transporte" },
  { value: "I04", label: "I04 - Equipo de cómputo y accesorios" },
  { value: "I05", label: "I05 - Dados, troqueles, moldes, matrices y herramental" },
  { value: "I06", label: "I06 - Comunicaciones telefónicas" },
  { value: "I07", label: "I07 - Comunicaciones satelitales" },
  { value: "I08", label: "I08 - Otra maquinaria y equipo" },
  { value: "D01", label: "D01 - Honorarios médicos, dentales y hospitalarios" },
  { value: "D02", label: "D02 - Gastos médicos por incapacidad o discapacidad" },
  { value: "D03", label: "D03 - Gastos funerales" },
  { value: "D04", label: "D04 - Donativos" },
  { value: "D05", label: "D05 - Intereses reales por créditos hipotecarios" },
  { value: "D06", label: "D06 - Aportaciones voluntarias al SAR" },
  { value: "D07", label: "D07 - Primas por seguros de gastos médicos" },
  { value: "D08", label: "D08 - Gastos de transportación escolar obligatoria" },
  { value: "D09", label: "D09 - Depósitos en cuentas para el ahorro" },
  { value: "D10", label: "D10 - Pagos por servicios educativos" },
  { value: "S01", label: "S01 - Sin efectos fiscales" },
  { value: "CP01", label: "CP01 - Pagos" },
  { value: "CN01", label: "CN01 - Nómina" },
];

const PFR_STEPS = [
  {
    id: "commercial",
    titleKey: "pfrCommercialProfile",
    shortTitleKey: "pfrCommercialShort",
    descriptionKey: "pfrCommercialDescription",
  },
  {
    id: "fiscal",
    titleKey: "pfrFiscalData",
    shortTitleKey: "pfrFiscalShort",
    descriptionKey: "pfrFiscalDescription",
  },
  {
    id: "delivery",
    titleKey: "checkoutShipping",
    shortTitleKey: "checkoutShipping",
    descriptionKey: "pfrDeliveryDescription",
  },
];

function AccountProfilePage() {
  const { user, refreshMe } = useAuth();
  const { t } = useLocalization();
  const { withLoading } = useLoading();

  const [accountProfile, setAccountProfile] = useState(null);
  const [pfrForm, setPfrForm] = useState(INITIAL_PFR_FORM);
  const [taxCertificateUrl, setTaxCertificateUrl] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingPfr, setSavingPfr] = useState(false);
  const [currentPfrStep, setCurrentPfrStep] = useState(0);
  const [pfrErrors, setPfrErrors] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState(INITIAL_PASSWORD_FORM);

  const mustChangePassword = Boolean(user?.must_change_password);

  useEffect(() => {
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mustChangePassword) {
      setShowPasswordModal(true);
    }
  }, [mustChangePassword]);

  const displayProfile = useMemo(() => {
    const profile = accountProfile?.data || accountProfile || {};

    return {
      name: profile.name || user?.name || "-",
      customerNumber: profile.customer_number || user?.id || "-",
      email: profile.email || user?.email || "-",
      phone: profile.phone || profile.whatsapp || "-",
    };
  }, [accountProfile, user]);

  const activeStep = PFR_STEPS[currentPfrStep];
  const isFirstPfrStep = currentPfrStep === 0;
  const isLastPfrStep = currentPfrStep === PFR_STEPS.length - 1;
  const taxCertificateHref = useMemo(
    () => normalizeMediaUrl(taxCertificateUrl),
    [taxCertificateUrl]
  );
  const pfrCompletion = useMemo(
    () => calculateLocalPfrCompletion(pfrForm, taxCertificateUrl, t),
    [pfrForm, taxCertificateUrl, t]
  );

  async function loadProfileData() {
    try {
      setLoadingProfile(true);

      const [profileResponse, pfrResponse] = await Promise.all([
        getAccountProfile().catch(() => null),
        getCustomerPfrProfile().catch(() => null),
      ]);

      const profileData = profileResponse?.data || profileResponse || null;
      setAccountProfile(profileData);

      const pfrData = pfrResponse?.data || null;
      const normalizedPfr = normalizePfrData(pfrData || {});
      const commercialNameFallback = getCommercialNameFallback(profileData, user);

      if (pfrData) {
        setPfrForm((prev) => ({
          ...prev,
          ...normalizedPfr,
          commercial_name: normalizedPfr.commercial_name || commercialNameFallback,
          quote_email: normalizedPfr.quote_email || prev.quote_email || user?.email || "",
          tax_certificate: null,
        }));
        setTaxCertificateUrl(pfrData.tax_certificate_url || "");
      } else {
        setPfrForm((prev) => ({
          ...prev,
          commercial_name: commercialNameFallback,
          quote_email: user?.email || "",
        }));
      }
    } catch (error) {
      console.error("Error al cargar datos de cuenta:", error);
      notifyError(t("accountProfileLoadError"));
    } finally {
      setLoadingProfile(false);
    }
  }

  function normalizePfrData(data) {
    return Object.keys(INITIAL_PFR_FORM).reduce((next, key) => {
      if (key === "tax_certificate") return next;

      if (!Object.prototype.hasOwnProperty.call(data, key)) {
        return next;
      }

      if (typeof INITIAL_PFR_FORM[key] === "boolean") {
        next[key] = Boolean(data[key]);
        return next;
      }

      next[key] = data[key] ?? INITIAL_PFR_FORM[key];
      return next;
    }, {});
  }

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePfrChange = (event) => {
    const { name, value, type, checked, files } = event.target;
    let nextValue = value;

    if (name === "commercial_name") return;

    if (name === "tax_certificate") {
      const file = files?.[0] || null;

      if (file && file.type !== "application/pdf") {
        setPfrErrors((prev) => ({
          ...prev,
          tax_certificate: t("pfrPdfRequired"),
        }));
        event.target.value = "";
        return;
      }

      nextValue = file;
    }

    if (name === "fiscal_name") {
      nextValue = normalizeUpperNoAccents(value);
    }

    if (name === "rfc") {
      nextValue = normalizeUpperNoAccents(value).replace(/[^A-Z0-9]/g, "").slice(0, 14);
    }

    if (name === "fiscal_zip_code") {
      nextValue = value.replace(/\D/g, "").slice(0, 5);
    }

    if (name === "business_phone" || name === "secondary_phone") {
      nextValue = value.replace(/[^\d+\s()-]/g, "").slice(0, 20);
    }

    if (name === "fiscal_external_number" || name === "fiscal_internal_number") {
      nextValue = normalizeUpperNoAccents(value).replace(/[^A-Z0-9\s-]/g, "").slice(0, 20);
    }

    setPfrForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : nextValue,
    }));

    setPfrErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmitPassword = async () => {
    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      notifyError(t("completeAllFields"));
      return;
    }

    if (newPassword.length < 8) {
      notifyWarning(t("passwordMinLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      notifyError(t("passwordMismatch"));
      return;
    }

    if (currentPassword === newPassword) {
      notifyWarning(t("passwordMustBeDifferent"));
      return;
    }

    try {
      await withLoading(async () => {
        await changeAccountPassword({
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        });
      }, t("passwordUpdating"));

      notifySuccess(t("passwordUpdated"));

      setPasswordForm(INITIAL_PASSWORD_FORM);
      setShowPasswordModal(false);
      refreshMe();
    } catch (error) {
      console.error("Error al actualizar contraseña:", error);
      notifyError(error?.response?.data?.message || t("passwordUpdateError"));
    }
  };

  function buildPfrFormData() {
    const formData = new FormData();
    const deliveryAddress = pfrForm.delivery_same_as_fiscal
      ? buildFiscalAddress(pfrForm)
      : pfrForm.delivery_address;

    Object.entries(pfrForm).forEach(([key, value]) => {
      if (key === "tax_certificate") {
        if (value) formData.append(key, value);
        return;
      }

      if (key === "delivery_address") {
        formData.append(key, deliveryAddress || "");
        return;
      }

      if (typeof value === "boolean") {
        formData.append(key, value ? "1" : "0");
        return;
      }

      formData.append(key, value ?? "");
    });

    return formData;
  }

  function validatePfrStep(stepIndex = currentPfrStep) {
    const stepId = PFR_STEPS[stepIndex]?.id;
    const nextErrors = {};

    if (stepId === "commercial") {
      if (!pfrForm.commercial_name.trim()) {
        nextErrors.commercial_name = t("commercialNameRequired");
      }

      if (pfrForm.quote_email && !isValidEmail(pfrForm.quote_email)) {
        nextErrors.quote_email = t("validEmail");
      }

      if (pfrForm.business_phone && !isValidPhone(pfrForm.business_phone)) {
        nextErrors.business_phone = t("validPhone");
      }

      if (pfrForm.secondary_phone && !isValidPhone(pfrForm.secondary_phone)) {
        nextErrors.secondary_phone = t("validPhone");
      }
    }

    if (stepId === "fiscal") {
      if (pfrForm.rfc && !isValidRfc(pfrForm.rfc)) {
        nextErrors.rfc = t("validRfc");
      }

      if (pfrForm.fiscal_zip_code && !/^\d{5}$/.test(pfrForm.fiscal_zip_code)) {
        nextErrors.fiscal_zip_code = t("validZipCode");
      }

      if (pfrForm.xml_email && !isValidEmail(pfrForm.xml_email)) {
        nextErrors.xml_email = t("validEmail");
      }

      if (pfrForm.cfdi_use && !CFDI_USES.some((item) => item.value === pfrForm.cfdi_use)) {
        nextErrors.cfdi_use = t("validCfdiUse");
      }

      if (pfrForm.tax_certificate && pfrForm.tax_certificate.type !== "application/pdf") {
        nextErrors.tax_certificate = t("pfrPdfRequired");
      }
    }

    if (stepId === "delivery" && !pfrForm.delivery_same_as_fiscal && !pfrForm.delivery_address.trim()) {
      nextErrors.delivery_address = t("deliveryAddressRequired");
    }

    setPfrErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      notifyWarning(t("reviewMarkedFields"));
      return false;
    }

    return true;
  }

  async function persistPfrProfile(successMessage = t("progressSaved")) {
    try {
      setSavingPfr(true);

      const response = await saveCustomerPfrProfile(buildPfrFormData());
      const savedProfile = response?.data || {};

      setTaxCertificateUrl(savedProfile.tax_certificate_url || taxCertificateUrl);
      setPfrForm((prev) => ({
        ...prev,
        ...normalizePfrData(savedProfile),
        tax_certificate: null,
      }));

      notifySuccess(successMessage || response?.message || t("pfrSaved"));
      return true;
    } catch (error) {
      console.error("Error al guardar perfil PFR:", error);
      notifyError(error?.response?.data?.message || t("pfrSaveError"));
      return false;
    } finally {
      setSavingPfr(false);
    }
  }

  async function handleSubmitPfr(event) {
    event.preventDefault();
    if (!validateAllPfrSteps()) return;
    await persistPfrProfile(t("pfrSaved"));
  }

  async function handleNextPfrStep() {
    if (!validatePfrStep(currentPfrStep)) return;

    const saved = await persistPfrProfile(t("progressSaved"));

    if (saved) {
      setCurrentPfrStep((prev) => Math.min(prev + 1, PFR_STEPS.length - 1));
    }
  }

  function handlePreviousPfrStep() {
    setCurrentPfrStep((prev) => Math.max(prev - 1, 0));
  }

  async function handleSelectPfrStep(stepIndex) {
    if (stepIndex === currentPfrStep || savingPfr) return;

    if (stepIndex < currentPfrStep) {
      setCurrentPfrStep(stepIndex);
      return;
    }

    if (!validatePfrStep(currentPfrStep)) return;

    const saved = await persistPfrProfile(t("progressSaved"));

    if (saved) {
      setCurrentPfrStep(stepIndex);
    }
  }

  function validateAllPfrSteps() {
    for (let index = 0; index < PFR_STEPS.length; index += 1) {
      if (!validatePfrStep(index)) {
        setCurrentPfrStep(index);
        return false;
      }
    }

    return true;
  }

  function renderPfrStepFields() {
    if (activeStep.id === "commercial") {
      return (
        <div className="account_form_grid account_form_grid_two">
          <Field label={t("commercialName")} name="commercial_name" value={pfrForm.commercial_name} onChange={handlePfrChange} error={pfrErrors.commercial_name} readOnly required />
          <Field label={t("purchasingContact")} name="purchasing_contact_name" value={pfrForm.purchasing_contact_name} onChange={handlePfrChange} />
          <Field label={t("quoteEmail")} name="quote_email" type="email" value={pfrForm.quote_email} onChange={handlePfrChange} error={pfrErrors.quote_email} />
          <Field label={t("businessPhone")} name="business_phone" type="tel" value={pfrForm.business_phone} onChange={handlePfrChange} error={pfrErrors.business_phone} />
          <Field label={t("secondaryContact")} name="secondary_contact_name" value={pfrForm.secondary_contact_name} onChange={handlePfrChange} />
          <Field label={t("secondaryPhone")} name="secondary_phone" type="tel" value={pfrForm.secondary_phone} onChange={handlePfrChange} error={pfrErrors.secondary_phone} />
          <Field label={t("businessActivity")} name="business_activity" value={pfrForm.business_activity} onChange={handlePfrChange} />

          <div className="form_field">
            <label>{t("paymentMethod")}</label>
            <select name="payment_method" value={pfrForm.payment_method} onChange={handlePfrChange}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {t(method.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <label className="account_checkbox_field">
            <input
              type="checkbox"
              name="requires_invoice"
              checked={pfrForm.requires_invoice}
              onChange={handlePfrChange}
            />
            <span>{t("requiresInvoice")}</span>
          </label>
        </div>
      );
    }

    if (activeStep.id === "fiscal") {
      return (
        <div className="account_form_grid account_form_grid_two">
          <Field label={t("fiscalName")} name="fiscal_name" value={pfrForm.fiscal_name} onChange={handlePfrChange} />
          <Field label="RFC" name="rfc" value={pfrForm.rfc} onChange={handlePfrChange} error={pfrErrors.rfc} />
          <Field label={t("fiscalStreet")} name="fiscal_street" value={pfrForm.fiscal_street} onChange={handlePfrChange} />
          <Field label={t("externalNumber")} name="fiscal_external_number" value={pfrForm.fiscal_external_number} onChange={handlePfrChange} />
          <Field label={t("internalNumber")} name="fiscal_internal_number" value={pfrForm.fiscal_internal_number} onChange={handlePfrChange} />
          <Field label={t("checkoutAddressFormZip")} name="fiscal_zip_code" inputMode="numeric" maxLength={5} value={pfrForm.fiscal_zip_code} onChange={handlePfrChange} error={pfrErrors.fiscal_zip_code} />
          <Field label={t("checkoutAddressFormNeighborhood")} name="fiscal_neighborhood" value={pfrForm.fiscal_neighborhood} onChange={handlePfrChange} />
          <Field label={t("city")} name="fiscal_city" value={pfrForm.fiscal_city} onChange={handlePfrChange} />
          <Field label={t("checkoutAddressFormState")} name="fiscal_state" value={pfrForm.fiscal_state} onChange={handlePfrChange} />
          <Field label="Correo XML" name="xml_email" type="email" value={pfrForm.xml_email} onChange={handlePfrChange} error={pfrErrors.xml_email} />

          <div className={`form_field ${pfrErrors.cfdi_use ? "is_invalid" : ""}`}>
            <label>{t("cfdiUse")}</label>
            <select name="cfdi_use" value={pfrForm.cfdi_use} onChange={handlePfrChange}>
              {CFDI_USES.map((use) => (
                <option key={use.value || "empty"} value={use.value}>
                  {use.label}
                </option>
              ))}
            </select>
            {pfrErrors.cfdi_use ? <span className="form_error">{pfrErrors.cfdi_use}</span> : null}
          </div>

          <div className={`form_field form_field_full ${pfrErrors.tax_certificate ? "is_invalid" : ""}`}>
            <label>{t("taxCertificatePdf")}</label>
            <input
              type="file"
              name="tax_certificate"
              accept="application/pdf"
              onChange={handlePfrChange}
            />
            {pfrErrors.tax_certificate ? <span className="form_error">{pfrErrors.tax_certificate}</span> : null}
            {taxCertificateHref ? (
              <a href={taxCertificateHref} target="_blank" rel="noreferrer" className="account_file_link">
                {t("viewCurrentCertificate")}
              </a>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className="account_form_grid account_form_grid_two">
        <label className="account_checkbox_field form_field_full">
          <input
            type="checkbox"
            name="delivery_same_as_fiscal"
            checked={pfrForm.delivery_same_as_fiscal}
            onChange={handlePfrChange}
          />
          <span>{t("deliverySameAsFiscal")}</span>
        </label>

        {pfrForm.delivery_same_as_fiscal ? (
          <div className="account_delivery_preview form_field_full">
            <span>{t("shippingAddress")}</span>
            <strong>{buildFiscalAddress(pfrForm) || t("completeFiscalAddress")}</strong>
          </div>
        ) : (
          <TextArea label={t("shippingAddress")} name="delivery_address" value={pfrForm.delivery_address} onChange={handlePfrChange} error={pfrErrors.delivery_address} />
        )}
        <Field label={t("deliverySchedule")} name="delivery_schedule" value={pfrForm.delivery_schedule} onChange={handlePfrChange} />
        <TextArea label={t("deliveryObservations")} name="delivery_observations" value={pfrForm.delivery_observations} onChange={handlePfrChange} />
        <TextArea
          label="Distintivo H"
          name="distintivo_h"
          value={pfrForm.distintivo_h}
          onChange={handlePfrChange}
          placeholder={t("distintivoHHelp")}
          helpText={t("distintivoHHelp")}
        />
      </div>
    );
  }

  return (
    <div className="account_detail_page">
      <div className="account_detail_shell">
        <div className="account_detail_breadcrumb">
          <Link to="/mi-cuenta">{t("myAccount")}</Link>
          <span>›</span>
          <span>{t("accountProfileTitle")}</span>
        </div>

        <header className="account_detail_header">
          <div>
            <h1 className="account_detail_title">{t("accountProfileTitle")}</h1>
            <p className="account_detail_text">
              {t("accountProfileIntro")}
            </p>
          </div>
        </header>

        <section className="account_settings_card account_compact_profile">
          <div className="account_compact_identity">
            <div className="account_compact_avatar">
              {(displayProfile.name || "C").charAt(0)}
            </div>

            <div className="account_compact_main">
              <h2>{loadingProfile ? "Cargando..." : displayProfile.name}</h2>
              <div className="account_compact_meta">
                <span>{t("customer")}: {loadingProfile ? "..." : displayProfile.customerNumber}</span>
                <span>{loadingProfile ? "..." : displayProfile.email}</span>
                <span>{loadingProfile ? "..." : displayProfile.phone}</span>
              </div>
            </div>
          </div>

          <div className="account_compact_security">
            <div>
              <span className="account_compact_label">{t("password")}</span>
              <strong>{mustChangePassword ? t("passwordChangePending") : t("passwordUpdatedStatus")}</strong>
            </div>

            <button
              type="button"
              className="account_password_link"
              onClick={() => setShowPasswordModal(true)}
            >
              {t("change")}
            </button>
          </div>
        </section>

        <form className="account_pfr_form" onSubmit={handleSubmitPfr}>
          <section className="account_settings_card account_pfr_card account_pfr_wizard">
            <div className="account_pfr_wizard_top">
              <div className="account_pfr_section_head">
                <span className="account_pfr_kicker">
                  {t("pfrStepProgress", {
                    current: currentPfrStep + 1,
                    total: PFR_STEPS.length,
                    percent: pfrCompletion.percentage,
                  })}
                </span>
                <h2>{t(activeStep.titleKey)}</h2>
                <p>{t(activeStep.descriptionKey)}</p>
              </div>

              <div className="account_pfr_progress" aria-hidden="true">
                <span style={{ width: `${pfrCompletion.percentage}%` }} />
              </div>
            </div>

            {pfrCompletion.missingFields.length > 0 ? (
              <div className="account_pfr_missing">
                <span>{t("pendingFields")}:</span>
                <strong>{pfrCompletion.missingFields.slice(0, 4).join(", ")}</strong>
              </div>
            ) : (
              <div className="account_pfr_complete">{t("pfrComplete")}</div>
            )}

            <div className="account_pfr_tabs" role="tablist" aria-label="Secciones del perfil PFR">
              {PFR_STEPS.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={currentPfrStep === index}
                  className={`account_pfr_tab ${currentPfrStep === index ? "is_active" : ""} ${
                    currentPfrStep > index ? "is_done" : ""
                  }`}
                  onClick={() => handleSelectPfrStep(index)}
                  disabled={savingPfr}
                >
                  <span className="account_pfr_tab_number">{index + 1}</span>
                  <span>{t(step.shortTitleKey)}</span>
                </button>
              ))}
            </div>

            <div className="account_pfr_step_panel" role="tabpanel">
              {renderPfrStepFields()}
            </div>
          </section>

          <div className="account_pfr_actions">
            <button
              type="button"
              className="btn btn_secondary"
              onClick={handlePreviousPfrStep}
              disabled={savingPfr || isFirstPfrStep}
            >
              {t("previous")}
            </button>

            {isLastPfrStep ? (
              <button type="submit" className="btn btn_primary" disabled={savingPfr}>
                {savingPfr ? t("saving") : t("saveProfile")}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn_primary"
                onClick={handleNextPfrStep}
                disabled={savingPfr}
              >
                {savingPfr ? t("saving") : t("saveAndContinue")}
              </button>
            )}
          </div>
        </form>
      </div>

      {showPasswordModal ? (
        <div
          className="account_modal_overlay"
          onClick={() => {
            if (!mustChangePassword) setShowPasswordModal(false);
          }}
        >
          <div className="account_modal" onClick={(e) => e.stopPropagation()}>
            <div className="account_modal_header">
              <h3>{mustChangePassword ? t("changeTemporaryPassword") : t("changePassword")}</h3>

              {!mustChangePassword ? (
                <button
                  type="button"
                  className="account_modal_close"
                  onClick={() => setShowPasswordModal(false)}
                >
                  x
                </button>
              ) : null}
            </div>

            <div className="account_modal_body">
              <p className="account_modal_text">
                {t("changePasswordText")}
              </p>

              <div className="account_form_grid">
                <Field
                  label={t("currentPassword")}
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                  placeholder={t("currentPasswordPlaceholder")}
                />
                <Field
                  label={t("newPassword")}
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                  placeholder={t("newPasswordPlaceholder")}
                />
                <Field
                  label={t("confirmPassword")}
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                  placeholder={t("confirmPasswordPlaceholder")}
                />
              </div>

              <div className="account_modal_actions">
                {!mustChangePassword ? (
                  <button
                    type="button"
                    className="btn btn_secondary"
                    onClick={() => setShowPasswordModal(false)}
                  >
                    {t("cancel")}
                  </button>
                ) : null}

                <button type="button" className="btn btn_primary" onClick={handleSubmitPassword}>
                  {t("confirm")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function normalizeUpperNoAccents(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function isValidRfc(value) {
  return /^[A-Z0-9]{13,14}$/.test(value.trim());
}

function buildFiscalAddress(form) {
  return [
    form.fiscal_street,
    form.fiscal_external_number ? `No. ${form.fiscal_external_number}` : "",
    form.fiscal_internal_number ? `Int. ${form.fiscal_internal_number}` : "",
    form.fiscal_neighborhood ? `Col. ${form.fiscal_neighborhood}` : "",
    form.fiscal_zip_code ? `CP ${form.fiscal_zip_code}` : "",
    form.fiscal_city,
    form.fiscal_state,
  ]
    .filter(Boolean)
    .join(", ");
}

function calculateLocalPfrCompletion(form, taxCertificateUrl, t) {
  const fields = [
    [t("commercialName"), form.commercial_name],
    [t("purchasingContact"), form.purchasing_contact_name],
    [t("quoteEmail"), form.quote_email],
    [t("businessPhone"), form.business_phone],
    [t("businessActivity"), form.business_activity],
    [t("paymentMethod"), form.payment_method],
    [t("fiscalName"), form.fiscal_name],
    ["RFC", form.rfc],
    [t("fiscalStreet"), form.fiscal_street],
    [t("externalNumber"), form.fiscal_external_number],
    [t("checkoutAddressFormZip"), form.fiscal_zip_code],
    [t("checkoutAddressFormNeighborhood"), form.fiscal_neighborhood],
    [t("city"), form.fiscal_city],
    [t("checkoutAddressFormState"), form.fiscal_state],
    ["Correo XML", form.xml_email],
    [t("cfdiUse"), form.cfdi_use],
    [t("taxCertificatePdf"), form.tax_certificate || taxCertificateUrl],
    [
      t("shippingAddress"),
      form.delivery_same_as_fiscal ? buildFiscalAddress(form) : form.delivery_address,
    ],
  ];

  const completedFields = fields.filter(([, value]) => {
    if (value instanceof File) return true;
    return String(value || "").trim().length > 0;
  });

  return {
    percentage: Math.round((completedFields.length / fields.length) * 100),
    completedFields: completedFields.length,
    totalFields: fields.length,
    missingFields: fields
      .filter(([, value]) => {
        if (value instanceof File) return false;
        return String(value || "").trim().length === 0;
      })
      .map(([label]) => label),
  };
}

function getCommercialNameFallback(profile, user) {
  return (
    profile?.customer_profile?.commercial_name ||
    profile?.customerProfile?.commercial_name ||
    profile?.commercial_name ||
    user?.customer_profile?.commercial_name ||
    user?.customerProfile?.commercial_name ||
    user?.name ||
    ""
  );
}

function normalizeMediaUrl(url) {
  const value = String(url || "").trim();
  const mediaBaseUrl = getMediaBaseUrl();

  if (!value) return "";

  if (!mediaBaseUrl) return value;

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsedUrl = new URL(value);
      return `${mediaBaseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    } catch {
      return value;
    }
  }

  return `${mediaBaseUrl}/${value.replace(/^\/+/, "")}`;
}

function getMediaBaseUrl() {
  return String(
    import.meta.env.VITE_MEDIA_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      ""
  )
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/+$/, "");
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  error = "",
  readOnly = false,
  inputMode,
  maxLength,
}) {
  return (
    <div className={`form_field ${error ? "is_invalid" : ""}`}>
      <label>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        readOnly={readOnly}
        inputMode={inputMode}
        maxLength={maxLength}
      />
      {error ? <span className="form_error">{error}</span> : null}
    </div>
  );
}

function TextArea({ label, name, value, onChange, placeholder = "", error = "", helpText = "" }) {
  return (
    <div className={`form_field form_field_full ${error ? "is_invalid" : ""}`}>
      <label>{label}</label>
      <textarea name={name} value={value} onChange={onChange} rows="3" placeholder={placeholder} />
      {helpText ? <span className="form_help">{helpText}</span> : null}
      {error ? <span className="form_error">{error}</span> : null}
    </div>
  );
}

export default AccountProfilePage;
