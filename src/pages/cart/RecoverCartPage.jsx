import { useEffect, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { savePendingCartRecovery } from "../../utils/cartRecovery"
import "./cart.css"

function RecoverCartPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, sessionReady } = useAuth()

  const query = useMemo(() => {
    const params = new URLSearchParams(location.search)

    return {
      cartId: params.get("cart_id") || "",
      recoverUrl: params.get("recover_url") || "",
    }
  }, [location.search])

  useEffect(() => {
    if (!sessionReady) return

    if (!query.recoverUrl) {
      navigate("/carrito", { replace: true })
      return
    }

    if (!isAuthenticated) {
      savePendingCartRecovery({
        recoverUrl: query.recoverUrl,
        cartId: query.cartId,
      })
      navigate("/login?redirect=/carrito/recuperar&recover_cart=1", { replace: true })
      return
    }

    window.location.href = query.recoverUrl
  }, [isAuthenticated, navigate, query.cartId, query.recoverUrl, sessionReady])

  const needsLogin = sessionReady && query.recoverUrl && !isAuthenticated

  return (
    <div className="cart_page">
      <div className="cart_shell">
        <div className="cart_empty cart_empty--full">
          <h3>{needsLogin ? "Inicia sesión para recuperar tu carrito" : "Recuperando carrito..."}</h3>
          <p>
            {needsLogin
              ? "Te llevaremos al login para continuar con la recuperación."
              : "Estamos validando tu sesión antes de activar el carrito."}
          </p>
        </div>
      </div>
    </div>
  )
}

export default RecoverCartPage
