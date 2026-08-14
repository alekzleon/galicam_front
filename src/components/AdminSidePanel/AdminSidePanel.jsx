import "./AdminSidePanel.css"

function AdminSidePanel({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = "xl",
  closeDisabled = false,
}) {
  if (!isOpen) return null

  return (
    <div className="admin-side-panel" role="dialog" aria-modal="true" aria-labelledby="admin-side-panel-title">
      <div className="admin-side-panel__backdrop" />

      <aside className={`admin-side-panel__panel admin-side-panel__panel--${width}`}>
        <header className="admin-side-panel__header">
          <div className="admin-side-panel__header-content">
            <h2 id="admin-side-panel-title" className="admin-side-panel__title">
              {title}
            </h2>

            {subtitle ? (
              <p className="admin-side-panel__subtitle">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="admin-side-panel__header-actions">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onClose}
              disabled={closeDisabled}
            >
              Cerrar
            </button>
          </div>
        </header>

        <div className="admin-side-panel__body">
          {children}
        </div>

        {footer ? (
          <footer className="admin-side-panel__footer">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  )
}

export default AdminSidePanel