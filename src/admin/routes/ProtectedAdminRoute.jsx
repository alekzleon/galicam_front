import { Navigate, Outlet } from "react-router-dom"
import { can } from "../../utils/adminAccess"

function ProtectedAdminRoute({ sessionReady, isAuthenticated, isInternal }) {
  if (!sessionReady) {
    return <div style={{ padding: "2rem" }}>Cargando panel...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isInternal) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default ProtectedAdminRoute

export function ProtectedAdminModule({ module, user, children }) {
  if (module && !can(user, module)) {
    return <Navigate to="/admin/forbidden" replace />
  }

  return children
}
