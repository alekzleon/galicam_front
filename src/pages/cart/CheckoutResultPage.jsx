import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
  confirmStripeCheckoutSession,
  getCheckoutOrder,
  restoreCheckoutOrderCart,
} from "../../services/api/checkoutService.js"
import { notifyError, notifySuccess, notifyWarning } from "../../utils/toast"
import { useLocalization } from "../../context/LocalizationContext"
import { trackMetaPurchase } from "../../utils/metaPixel"
import "./checkout.css"

const CART_SUMMARY_STORAGE_KEY = "ecommerce_cart_summary"
const STRIPE_SUCCESS_RETURN_STORAGE_KEY = "ecommerce_stripe_success_return"

function CheckoutResultPage({ type = "success" }) {
  const { t } = useLocalization()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get("order_id") || searchParams.get("order")
  const orderNumber = searchParams.get("order_number")
  const sessionId = searchParams.get("session_id")
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(Boolean(orderId))
  const [confirmingPayment, setConfirmingPayment] = useState(type === "success" && Boolean(sessionId))
  const [restoredCart, setRestoredCart] = useState(null)
  const restoreAttemptedRef = useRef(false)
  const confirmAttemptedRef = useRef(false)

  useEffect(() => {
    if (type === "success" && sessionId) {
      sessionStorage.setItem(
        STRIPE_SUCCESS_RETURN_STORAGE_KEY,
        JSON.stringify({
          session_id: sessionId,
          timestamp: Date.now(),
        })
      )

      if (!confirmAttemptedRef.current) {
        confirmAttemptedRef.current = true

        async function confirmPayment() {
          try {
            setConfirmingPayment(true)
            setLoading(true)
            const response = await confirmStripeCheckoutSession({
              session_id: sessionId,
            })
            const confirmedOrder = response?.data || null

            if (confirmedOrder) {
              setOrder(confirmedOrder)
              clearCartSummary()
              trackMetaPurchase(confirmedOrder)
            }

            notifySuccess(response?.message || t("checkoutPaymentConfirmed"))
            navigate("/", { replace: true })
          } catch (error) {
            console.error("Error al confirmar sesión de Stripe:", error?.response?.data || error)
            notifyWarning(
              error?.response?.data?.message ||
                t("checkoutPaymentConfirmingWarning")
            )
          } finally {
            setConfirmingPayment(false)
            setLoading(false)
          }
        }

        confirmPayment()
        return
      }
    }

    if (!orderId) return
    if (type === "cancel") {
      if (restoreAttemptedRef.current) return
      restoreAttemptedRef.current = true

      async function restoreCart() {
        try {
          setLoading(true)
          const response = await restoreCheckoutOrderCart(orderId, {
            reason: "stripe_cancelled",
          })
          const cart = response?.data?.cart || null

          if (cart) {
            setRestoredCart(cart)
            syncCartSummary(cart)
          }

          notifySuccess(response?.message || t("cartRecovered"))
        } catch (error) {
          console.error("Error al recuperar carrito:", error?.response?.data || error)
          notifyError(error?.response?.data?.message || t("cartRecoverError"))
        } finally {
          setLoading(false)
        }
      }

      restoreCart()
      return
    }

    async function fetchOrder() {
      try {
        setLoading(true)
        const response = await getCheckoutOrder(orderId)
        const nextOrder = response?.data || null
        setOrder(nextOrder)
        if (type === "success" && nextOrder) {
          trackMetaPurchase(nextOrder)
        }
      } catch (error) {
        console.error("Error al consultar pedido:", error?.response?.data || error)
        notifyError(error?.response?.data?.message || t("checkoutOrderLoadError"))
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [navigate, orderId, sessionId, type])

  const copy = useMemo(() => {
    if (type === "cancel") {
      return {
        eyebrow: t("checkoutPaymentCanceled"),
        title: t("checkoutPaymentNotCompleted"),
        message:
          t("checkoutRecoveringCartText"),
        icon: "bi-x-circle-fill",
        statusClass: "is-cancel",
      }
    }

    return {
      eyebrow: t("checkoutPaymentInProgress"),
      title: confirmingPayment ? t("checkoutConfirmingPayment") : t("checkoutPaymentReceived"),
      message:
        t("checkoutStripeValidationText"),
      icon: "bi-check-circle-fill",
      statusClass: "is-success",
    }
  }, [confirmingPayment, t, type])

  return (
    <div className="checkout_page">
      <div className="checkout_shell">
        <section className={`checkout_result ${copy.statusClass}`}>
          <div className="checkout_result_icon">
            <i className={`bi ${copy.icon}`} aria-hidden="true" />
          </div>

          <p className="checkout_eyebrow">{copy.eyebrow}</p>
          <h1 className="checkout_title">{copy.title}</h1>
          <p className="checkout_result_message">{copy.message}</p>

          {loading ? (
            <div className="checkout_result_order">
              {type === "cancel"
                ? t("cartRecovering")
                : confirmingPayment
                ? t("checkoutConfirmingStripe")
                : t("checkoutLoadingOrder")}
            </div>
          ) : restoredCart ? (
            <div className="checkout_result_order">
              <span>{t("cartRecoveredTitle")}</span>
              <strong>{orderNumber || `${t("order")} #${orderId}`}</strong>
              <small>{t("checkoutRecoveredProductsReady", { count: restoredCart.items_count ?? 0 })}</small>
              <strong>{formatMoney(restoredCart.total)}</strong>
            </div>
          ) : order ? (
            <div className="checkout_result_order">
              <span>{t("order")}</span>
              <strong>{order.number || `#${order.id}`}</strong>
              <small>
                {t("status")}: {formatStatus(order.status)} · {t("payment")}:{" "}
                {formatStatus(order.payment_status)}
              </small>
              <strong>{formatMoney(order.total)}</strong>
            </div>
          ) : orderId ? (
            <div className="checkout_result_order">
              <span>{t("order")}</span>
              <strong>#{orderId}</strong>
              <small>{t("checkoutOrderDetailUnavailable")}</small>
            </div>
          ) : null}

          <div className="checkout_result_actions">
            <Link to="/carrito" className="btn btn_primary btn_link_like">
              {t("backToCart")}
            </Link>
            <Link to={type === "cancel" ? "/checkout" : "/mi-cuenta"} className="btn btn_secondary btn_link_like">
              {type === "cancel" ? t("tryAgain") : t("goToMyAccount")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

function syncCartSummary(cart) {
  const summary = {
    id: cart?.id ?? null,
    items_count: Number(cart?.items_count ?? 0),
    subtotal: Number(cart?.subtotal ?? 0),
    discount: Number(cart?.discount ?? 0),
    tax: Number(cart?.tax ?? 0),
    tax_breakdown: cart?.tax_breakdown ?? null,
    total: Number(cart?.total ?? 0),
  }

  localStorage.setItem(CART_SUMMARY_STORAGE_KEY, JSON.stringify(summary))
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: summary }))
}

function clearCartSummary() {
  localStorage.removeItem(CART_SUMMARY_STORAGE_KEY)
  window.dispatchEvent(
    new CustomEvent("cart:updated", {
      detail: {
        id: null,
        items_count: 0,
        subtotal: 0,
        discount: 0,
        tax: 0,
        tax_breakdown: {
          total: 0,
          items: [],
        },
        total: 0,
      },
    })
  )
}

function formatStatus(value) {
  if (!value) return "-"

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export default CheckoutResultPage
