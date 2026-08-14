let initializedPixelId = ""

export function loadMetaPixel(pixelId) {
  const cleanPixelId = String(pixelId || "").trim()

  if (!cleanPixelId || typeof window === "undefined" || typeof document === "undefined") return

  if (!window.fbq) {
    !(function(f, b, e, v, n, t, s) {
      if (f.fbq) return
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      }
      if (!f._fbq) f._fbq = n
      n.push = n
      n.loaded = true
      n.version = "2.0"
      n.queue = []
      t = b.createElement(e)
      t.async = true
      t.src = v
      s = b.getElementsByTagName(e)[0]
      s.parentNode.insertBefore(t, s)
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js")
  }

  if (initializedPixelId !== cleanPixelId) {
    window.fbq("init", cleanPixelId)
    initializedPixelId = cleanPixelId
  }

  trackMeta("PageView")
}

export function trackMeta(eventName, payload = {}) {
  if (typeof window === "undefined" || !window.fbq || !eventName) return

  window.fbq("track", eventName, payload)
}

export function trackMetaPageView() {
  trackMeta("PageView")
}

export function trackMetaViewContent(product = {}) {
  if (!product?.id) return

  trackMeta("ViewContent", {
    content_ids: [String(product.id)],
    content_type: "product",
    content_name: product.name || "",
    value: getMetaPrice(product),
    currency: "MXN",
  })
}

export function trackMetaAddToCart(product = {}, quantity = 1) {
  const productId = product?.id || product?.productId || product?.product_id

  if (!productId) return

  const safeQuantity = Number(quantity || 1)
  const itemPrice = getMetaPrice(product)

  trackMeta("AddToCart", {
    content_ids: [String(productId)],
    content_type: "product",
    content_name: product.name || product.productName || "",
    contents: [
      {
        id: String(productId),
        quantity: safeQuantity,
        item_price: itemPrice,
      },
    ],
    value: itemPrice * safeQuantity,
    currency: "MXN",
  })
}

export function trackMetaInitiateCheckout(checkout = {}) {
  const items = Array.isArray(checkout.items) ? checkout.items : []
  if (!items.length) return

  trackMeta("InitiateCheckout", {
    content_ids: items.map((item) => String(item.product_id || item.productId || item.id)).filter(Boolean),
    content_type: "product",
    contents: items.map((item) => ({
      id: String(item.product_id || item.productId || item.id),
      quantity: Number(item.quantity || 0),
      item_price: Number(item.final_unit_price || item.unit_price || item.price || 0),
    })),
    value: Number(checkout.totals?.total || checkout.total || checkout.amount_due || 0),
    currency: "MXN",
  })
}

export function trackMetaPurchase(order = {}) {
  const items = Array.isArray(order.items) ? order.items : []
  if (!items.length) return

  trackMeta("Purchase", {
    content_ids: items.map((item) => String(item.product_id || item.productId || item.id)).filter(Boolean),
    content_type: "product",
    contents: items.map((item) => ({
      id: String(item.product_id || item.productId || item.id),
      quantity: Number(item.quantity || 0),
      item_price: Number(item.unit_price || item.final_unit_price || item.price || 0),
    })),
    value: Number(order.total || order.totals?.total || order.amount_due || 0),
    currency: "MXN",
  })
}

export function trackMetaCompleteRegistration() {
  trackMeta("CompleteRegistration", {
    content_name: "customer_registration",
    status: true,
  })
}

function getMetaPrice(product = {}) {
  return Number(
    product.price ||
      product.final_price ||
      product.finalPrice ||
      product.default_price ||
      product.unit_price ||
      0
  )
}
