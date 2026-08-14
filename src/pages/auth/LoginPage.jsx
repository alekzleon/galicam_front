import { Link, useLocation } from "react-router-dom"
import LoginForm from "../../components/auth/LoginForm/LoginForm"
import { useLocalization } from "../../context/LocalizationContext"
import { useSettings } from "../../context/SettingsContext"
import { PENDING_CART_RECOVER_URL_KEY } from "../../utils/cartRecovery"
import loginBusiness from "../../assets/images/auth/login-business.png"
import "./loginpage.css"

function LoginPage() {
  const { t } = useLocalization()
  const { brandName, logoUrl } = useSettings()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const isRecoveringCart =
    params.get("recover_cart") === "1" ||
    params.get("redirect") === "/carrito/recuperar" ||
    Boolean(localStorage.getItem(PENDING_CART_RECOVER_URL_KEY))

  return (
    <section className="login-page">
      <div className="login-page__content">
        <nav className="login-page__nav" aria-label={t("loginNavigation")}>
          <Link to="/" className="login-page__brand" aria-label={t("goHome")}>
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="login-page__logo" />
            ) : (
              <span className="login-page__brand-name">{brandName}</span>
            )}
          </Link>

          <div className="login-page__nav-links">
            <Link to="/" className="is-active">{t("home")}</Link>
            <Link to="/productos">{t("products")}</Link>
            <Link to="/ofertas">{t("offers")}</Link>
            <Link to="/registro">{t("register")}</Link>
          </div>
        </nav>

        <div className="login-page__main login-page__main--register">
          <div className="login-page__register-hero">
            <div className="login-page__copy">
              <h1 className="login-page__title">
                {isRecoveringCart
                  ? t("loginRecoverCartTitle")
                  : t("loginPageTitle")}
              </h1>
              {isRecoveringCart ? (
                <p className="login-page__text">
                  {t("loginRecoverCartText")}
                </p>
              ) : null}
              <p className="login-page__switch">
                {t("loginNoAccount")} <Link to="/registro">{t("signUp")}</Link>
              </p>
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
            {isRecoveringCart ? (
              <div className="login-page__notice" role="status">
                {t("loginRecoverCartNotice")}
              </div>
            ) : null}

            <LoginForm />
          </div>
        </div>
      </div>
    </section>
  )
}

export default LoginPage
