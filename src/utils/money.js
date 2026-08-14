const PRICE_UNAVAILABLE_SOURCE = "precios_articulos_default_missing"

export function getMoneyFormatted(money) {
  return money && typeof money === "object" && money.formatted
    ? String(money.formatted)
    : ""
}

export function getProductPriceMoney(product) {
  return getMoneyFormatted(product?.price_money || product?.priceMoney)
}

export function getProductCompareMoney(product) {
  return getMoneyFormatted(
    product?.compare_price_money ||
      product?.comparePriceMoney ||
      product?.old_price_money ||
      product?.oldPriceMoney
  )
}

export function hasAvailablePrice(product, fallbackPrice = null) {
  const priceInfo = product?.priceInfo || product?.price_info || {}
  const price = fallbackPrice === null || fallbackPrice === undefined
    ? Number(product?.price ?? product?.default_price ?? 0)
    : Number(fallbackPrice || 0)

  return Boolean(getProductPriceMoney(product) || (price > 0 && priceInfo.source !== PRICE_UNAVAILABLE_SOURCE))
}

export { PRICE_UNAVAILABLE_SOURCE }
