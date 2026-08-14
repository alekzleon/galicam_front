import "./AdminForbiddenPage.css"
import forbiddenImage from "../../../assets/images/admin-forbidden-404.svg"

function AdminForbiddenPage() {
  return (
    <div className="admin-forbidden">
      <section className="admin-forbidden__box" aria-labelledby="admin-forbidden-title">
        <img
          className="admin-forbidden__image"
          src={forbiddenImage}
          alt=""
          aria-hidden="true"
        />
        <h1 id="admin-forbidden-title">No tienes acceso a este módulo</h1>
        <p>Tu rol actual no tiene permisos para entrar a esta sección.</p>
      </section>
    </div>
  )
}

export default AdminForbiddenPage
