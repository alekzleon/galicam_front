import { useEffect, useRef, useState } from "react"
import { useSettings } from "../../../context/SettingsContext"
import "./AdminHeader.css"

function AdminHeader({ title, subtitle, currentUser, onToggleSidebar, onLogout }) {
  const { brandName } = useSettings()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const userName = currentUser?.name || "Usuario"
  const userEmail = currentUser?.email || "Sin correo"
  const userInitial = userName.charAt(0)?.toUpperCase() || "U"

  useEffect(() => {
    if (!profileMenuOpen) return

    function handleDocumentClick(event) {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleDocumentClick)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [profileMenuOpen])

  function handleLogoutClick() {
    setProfileMenuOpen(false)
    onLogout?.()
  }

  return (
    <header className="admin-header">
      <div className="admin-header__left">
        <button
          type="button"
          className="admin-header__menu-btn"
          aria-label="Abrir menú"
          onClick={onToggleSidebar}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="admin-header__title-block">
          <p className="admin-header__eyebrow">{brandName}</p>
          <h1 className="admin-header__title">{title}</h1>
          {subtitle ? <p className="admin-header__subtitle">{subtitle}</p> : null}
        </div>
      </div>

      <div className="admin-header__right">
        <div className="admin-header__role-pill">
          <span className="admin-header__role-dot" />
          <span>{currentUser?.role?.display_name || "Usuario"}</span>
        </div>

        <div className="admin-header__profile-menu" ref={profileMenuRef}>
          <button
            type="button"
            className={`admin-header__profile ${profileMenuOpen ? "is-open" : ""}`}
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
          >
            <div className="admin-header__avatar">{userInitial}</div>

            <div className="admin-header__profile-meta">
              <strong>{userName}</strong>
              <span>{userEmail}</span>
            </div>

            <span className="admin-header__profile-chevron" aria-hidden="true">
              ▾
            </span>
          </button>

          {profileMenuOpen ? (
            <div className="admin-header__dropdown" role="menu">
              <button
                type="button"
                className="admin-header__dropdown-item"
                role="menuitem"
                disabled
              >
                <i className="bi bi-person" aria-hidden="true" />
                <span>Perfil</span>
              </button>

              <button
                type="button"
                className="admin-header__dropdown-item admin-header__dropdown-item--danger"
                role="menuitem"
                onClick={handleLogoutClick}
              >
                <i className="bi bi-box-arrow-right" aria-hidden="true" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default AdminHeader
