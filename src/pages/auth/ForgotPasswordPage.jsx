import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { useLocalization } from "../../context/LocalizationContext"
import { useSettings } from "../../context/SettingsContext"
import { forgotPasswordRequest } from "../../services/api/authService"
import loginBusiness from "../../assets/images/auth/login-business.png"
import "./loginpage.css"

function ForgotPasswordPage() {
  const { t } = useLocalization()
  const { brandName, logoUrl } = useSettings()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const nextEmail = email.trim()

    setError("")
    setMessage("")

    if (!nextEmail) {
      setError(t("emailRequired"))
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setError(t("emailInvalid"))
      return
    }

    try {
      setSubmitting(true)
      const response = await forgotPasswordRequest({ email: nextEmail })
      const successMessage =
        response?.message || t("forgotPasswordSuccess")

      setMessage(successMessage)
      toast.success(successMessage)
    } catch (requestError) {
      const errorMessage =
        requestError?.errors?.email?.[0] ||
        requestError?.message ||
        t("forgotPasswordError")

      setError(errorMessage)
      toast.error(errorMessage)
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

        <nav className="login-page__nav login-page__nav--center" aria-label={t("recoveryNavigation")}>
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
            <h1 className="login-page__title">{t("forgotPasswordTitle")}</h1>
            <p className="login-page__switch">
              {t("forgotPasswordRemembered")} <Link to="/login">{t("login")}</Link>
            </p>
          </div>

          <div className="login-page__form-panel login-page__form-panel--single">
            <form className="login-form__form" onSubmit={handleSubmit} noValidate>
              {message ? <div className="login-form__alert login-form__alert--success">{message}</div> : null}
              {error ? <div className="login-form__alert">{error}</div> : null}

              <div className={`login-form__field ${error ? "is-error" : ""}`}>
                <label htmlFor="forgot-email" className="login-form__label">
                  {t("email")}
                </label>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  className="login-form__input"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="login-form__actions">
                <button type="submit" className="login-form__submit" disabled={submitting}>
                  {submitting ? t("sending") : t("sendInstructions")}
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

export default ForgotPasswordPage
