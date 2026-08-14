import Header from "../components/common/Header/Header"
import { Outlet, useLocation } from "react-router-dom"
import Footer from "../components/common/Footer/Footer"
import { useSettings } from "../context/SettingsContext"
import "./mainLayout.css"


function MainLayout() {
  const { pathname } = useLocation()
  const { settings, loading } = useSettings()
  const isFullscreenRoute = [
    "/login",
    "/registro",
    "/recuperar-password",
    "/reset-password",
  ].includes(pathname)
  const isConstructionHome =
    pathname === "/" && settings.storefront?.is_published === false
  const hideLayoutChrome = isFullscreenRoute || isConstructionHome

  if (loading && !isFullscreenRoute) {
    return <StorefrontLayoutSkeleton />
  }

  return (
    <>
      {!hideLayoutChrome ? <Header /> : null}

      <main>
        <Outlet />
      </main>

      {!hideLayoutChrome ? <Footer /> : null}
    </>
  )
}

function StorefrontLayoutSkeleton() {
  return (
    <div className="storefront-layout-skeleton" aria-label="Cargando diseño de tienda">
      <div className="storefront-layout-skeleton__top" />
      <div className="storefront-layout-skeleton__nav">
        <span />
        <span />
        <span />
        <span />
      </div>
      <main className="storefront-layout-skeleton__main">
        <section className="storefront-layout-skeleton__hero">
          <div>
            <span />
            <span />
            <span />
          </div>
        </section>
        <section className="storefront-layout-skeleton__grid">
          <span />
          <span />
          <span />
        </section>
      </main>
      <div className="storefront-layout-skeleton__footer" />
    </div>
  )
}

export default MainLayout
