import { Outlet, useLocation } from "react-router-dom"
import { useState } from "react"
import AdminSidebar from "../AdminSidebar/AdminSidebar"
import AdminHeader from "../AdminHeader/AdminHeader"
import adminMenuMap from "../../utils/adminMenuMap"
import "./AdminLayout.css"
import "../../styles/admin-theme.css"

function AdminLayout({ currentUser, menu = [], onLogout }) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const pageMeta = adminMenuMap.find((item) => item.path === location.pathname)

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev)
  }

  const handleCloseSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="admin-v2-page admin-shell">
      <div className="admin-v2-layout">
        <AdminSidebar
          menu={menu}
          currentUser={currentUser}
          isOpen={sidebarOpen}
          onClose={handleCloseSidebar}
        />

        {sidebarOpen ? (
          <button
            type="button"
            className="admin-v2-overlay"
            onClick={handleCloseSidebar}
            aria-label="Cerrar menú"
          />
        ) : null}

        <main className="admin-v2-main">
          <AdminHeader
            title={pageMeta?.title || "Dashboard"}
            subtitle={pageMeta?.subtitle || "Resumen general del sistema."}
            currentUser={currentUser}
            onToggleSidebar={handleToggleSidebar}
            onLogout={onLogout}
          />

          <section className="admin-v2-content">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
