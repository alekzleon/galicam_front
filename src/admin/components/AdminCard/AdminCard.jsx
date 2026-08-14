import "./AdminCard.css"

function AdminCard({ title, subtitle, children, right }) {
  return (
    <section className="admin-card admin-card-box">
      {(title || subtitle || right) && (
        <div className="admin-card-box__header">
          <div>
            {title ? <h3 className="admin-card-box__title">{title}</h3> : null}
            {subtitle ? <p className="admin-card-box__subtitle">{subtitle}</p> : null}
          </div>

          {right ? <div className="admin-card-box__right">{right}</div> : null}
        </div>
      )}

      <div className="admin-card-box__body">{children}</div>
    </section>
  )
}

export default AdminCard