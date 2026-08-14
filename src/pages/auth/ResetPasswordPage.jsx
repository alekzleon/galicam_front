import { useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useLocalization } from "../../context/LocalizationContext"
import { useSettings } from "../../context/SettingsContext"
import { resetPasswordRequest } from "../../services/api/authService"
import loginBusiness from "../../assets/images/auth/login-business.png"
import "./loginpage.css"

const EMPTY_FORM = {
  password: "",
  password_confirmation: "",
}

function ResetPasswordPage() {
  const { t } = useLocalization()
  const { brandName, logoUrl } = useSettings()
  const location = useLocation()
  const navigate = useNavigate()
  const query = useMemo(() => {
    const params = new URLSearchParams(location.search)

    return {
      email: params.get("email") || "",
      token: params.get("token") || "",
    }
  }, [location.search])
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function validate() {
    const nextErrors = {}

    if (!query.email) nextErrors.general = t("resetLinkMissingEmail")
    if (!query.token) nextErrors.general = t("resetLinkInvalid")
    if (!form.password) {
      nextErrors.password = t("passwordRequired")
    } else if (form.password.length < 8) {
      nextErrors.password = t("passwordMinLength")
    }
    if (form.password_confirmation !== form.password) {
      nextErrors.password_confirmation = t("passwordsDoNotMatch")
    }

    return nextErrors
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validate()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    try {
      setSubmitting(true)
      const response = await resetPasswordRequest({
        email: query.email,
        token: query.token,
        password: form.password,
        password_confirmation: form.password_confirmation,
      })

      toast.success(response?.message || t("passwordUpdated"))
      navigate("/login", { replace: true })
    } catch (requestError) {
      const normalizedErrors = normalizeResetErrors(requestError, t)
      setErrors(normalizedErrors)
      toast.error(normalizedErrors.general || t("passwordUpdateError"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="login-page">
      <div className="login-page__content">
        <img
          src={loginBusiness}
          alt=""
          className="login-page__watermark"
          aria-hidden="true"
        />

        <nav className="login-page__nav login-page__nav--center" aria-label={t("resetNavigation")}>
          <Link to="/" className="login-page__brand" aria-label={t("goHome")}>
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="login-page__logo" />
            ) : (
              <span className="login-page__brand-name">{brandName}</span>
            )}
          </Link>
        </nav>

        <div className="login-page__main login-page__main--single">
          <div className="login-page__copy login-page__copy--center">
            <h1 className="login-page__title">{t("resetPasswordTitle")}</h1>
            <p className="login-page__switch">
              {t("resetPasswordIntro")} <Link to="/login">{t("login")}</Link> {t("resetPasswordIntroSuffix")}
            </p>
          </div>

          <div className="login-page__form-panel login-page__form-panel--single">
            <form className="login-form__form" onSubmit={handleSubmit} noValidate>
              {errors.general ? <div className="login-form__alert">{errors.general}</div> : null}

              <div className={`login-form__field ${errors.password ? "is-error" : ""}`}>
                <label htmlFor="reset-password" className="login-form__label">
                  {t("newPassword")}
                </label>
                <input
                  id="reset-password"
                  name="password"
                  type="password"
                  className="login-form__input"
                  placeholder={t("passwordMinPlaceholder")}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                {errors.password ? <span className="login-form__error">{errors.password}</span> : null}
              </div>

              <div className={`login-form__field ${errors.password_confirmation ? "is-error" : ""}`}>
                <label htmlFor="reset-password-confirmation" className="login-form__label">
                  {t("confirmPassword")}
                </label>
                <input
                  id="reset-password-confirmation"
                  name="password_confirmation"
                  type="password"
                  className="login-form__input"
                  placeholder={t("repeatPasswordPlaceholder")}
                  value={form.password_confirmation}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                {errors.password_confirmation ? (
                  <span className="login-form__error">{errors.password_confirmation}</span>
                ) : null}
              </div>

              <div className="login-form__actions">
                <button type="submit" className="login-form__submit" disabled={submitting}>
                  {submitting ? t("saving") : t("updatePassword")}
                </button>

                <Link to="/login" className="login-form__signup">
                  {t("backToLogin")}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

function normalizeResetErrors(error, t) {
  const nextErrors = {}
  const apiErrors = error?.errors || {}

  Object.entries(apiErrors).forEach(([field, messages]) => {
    nextErrors[field] = Array.isArray(messages) ? messages[0] : String(messages)
  })

  if (!Object.keys(nextErrors).length) {
    nextErrors.general = error?.message || t("passwordUpdateError")
  }

  return nextErrors
}

export default ResetPasswordPage
