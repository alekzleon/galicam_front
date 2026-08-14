import { Link } from "react-router-dom"
import RegisterForm from "../../components/auth/RegisterForm/RegisterForm"
import { useLocalization } from "../../context/LocalizationContext"
import { useSettings } from "../../context/SettingsContext"
import loginBusiness from "../../assets/images/auth/login-business.png"
import "./loginpage.css"

function RegisterPage() {
  const { t } = useLocalization()
  const { brandName, logoUrl } = useSettings()

  return (
    <section className="login-page">
      <div className="login-page__content">
        <nav className="login-page__nav" aria-label={t("registerNavigation")}>
          <Link to="/" className="login-page__brand" aria-label={t("goHome")}>
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="login-page__logo" />
            ) : (
              <span className="login-page__brand-name">{brandName}</span>
            )}
          </Link>

          <div className="login-page__nav-links">
            <Link to="/">{t("home")}</Link>
            <Link to="/productos">{t("products")}</Link>
            <Link to="/ofertas">{t("offers")}</Link>
            <Link to="/login" className="is-active">{t("login")}</Link>
          </div>
        </nav>

        <div className="login-page__main login-page__main--register">
          <div className="login-page__register-hero">
            <div className="login-page__copy">
              <h1 className="login-page__title">
                {t("registerPageTitle")}
              </h1>
            </div>

            <div className="login-page__illustration-wrap login-page__illustration-wrap--register">
              <img
                src={loginBusiness}
                alt={t("businessPersonAlt")}
                className="login-page__illustration"
              />
            </div>
          </div>

          <div className="login-page__form-panel login-page__form-panel--register">
            <RegisterForm />
          </div>
        </div>
      </div>
    </section>
  )
}

export default RegisterPage
