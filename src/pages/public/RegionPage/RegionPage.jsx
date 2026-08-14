import { useEffect, useMemo, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import ProductCard from "../../../components/product/ProductCard/ProductCard"
import { useCurrency } from "../../../context/CurrencyContext"
import { useLocalization } from "../../../context/LocalizationContext"
import { getRegionDetail } from "../../../services/api/productService"
import { normalizeMediaUrl } from "../../../utils/mediaUrl"
import { getProductCompareMoney, getProductPriceMoney } from "../../../utils/money"
import "./RegionPage.css"

const PRODUCT_IMAGE_PLACEHOLDER = "https://via.placeholder.com/400x400?text=Producto"
const PAGE_SIZE = 24

const SORT_OPTIONS = [
  { value: "", labelKey: "mostPopular" },
  { value: "price_asc", labelKey: "priceLowToHigh" },
  { value: "price_desc", labelKey: "priceHighToLow" },
  { value: "name_asc", labelKey: "nameAsc" },
  { value: "name_desc", labelKey: "nameDesc" },
]

function RegionPage() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { locale, t } = useLocalization()
  const { currency } = useCurrency()
  const [region, setRegion] = useState(null)
  const [products, setProducts] = useState([])
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    from: 0,
    to: 0,
  })
  const [loading, setLoading] = useState(true)
  const sort = searchParams.get("sort") || ""
  const page = Number(searchParams.get("page") || 1)

  useEffect(() => {
    let mounted = true

    async function loadRegion() {
      try {
        setLoading(true)
        const response = await getRegionDetail(slug, {
          page,
          per_page: PAGE_SIZE,
          sort,
        })
        const payload = response?.data || {}

        if (!mounted) return

        setRegion(normalizeRegion(payload.region || payload))
        setProducts(normalizeProducts(payload.products || []))
        setMeta({
          current_page: Number(response?.meta?.current_page || page),
          last_page: Number(response?.meta?.last_page || 1),
          total: Number(response?.meta?.total || payload.region?.products_count || 0),
          from: Number(response?.meta?.from || 0),
          to: Number(response?.meta?.to || 0),
        })
      } catch (error) {
        if (!mounted) return
        console.error("Error al cargar región:", error?.response?.data || error)
        setRegion(null)
        setProducts([])
        setMeta((prev) => ({ ...prev, total: 0 }))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadRegion()

    return () => {
      mounted = false
    }
  }, [currency, locale, page, slug, sort])

  const heroStyle = useMemo(() => {
    if (!region?.banner_url) return {}
    return { backgroundImage: `url("${region.banner_url}")` }
  }, [region?.banner_url])

  function handleSortChange(event) {
    const nextParams = new URLSearchParams(searchParams)
    const value = event.target.value

    if (value) nextParams.set("sort", value)
    else nextParams.delete("sort")
    nextParams.delete("page")
    setSearchParams(nextParams)
  }

  function goToPage(nextPage) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set("page", String(nextPage))
    setSearchParams(nextParams)
  }

  if (loading && !region) {
    return (
      <main className="region-page">
        <div className="region-page__hero is-loading" />
      </main>
    )
  }

  if (!region) {
    return (
      <main className="region-page">
        <section className="region-page__empty">
          <h1>{t("regionNotFound")}</h1>
          <Link to="/productos">{t("seeProducts")}</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="region-page">
      <section className={`region-page__hero ${region.banner_url ? "has-image" : ""}`} style={heroStyle}>
        <div className="container-main region-page__hero-inner">
          <div className="region-page__hero-card">
            <p>{t("regions")}</p>
            <h1>{region.name}</h1>
            {region.description ? <div>{region.description}</div> : null}
          </div>
        </div>
      </section>

      <section className="container-main region-page__content">
        <div className="region-page__main">
          <div className="region-page__toolbar">
            <strong>{t("itemsCount", { count: meta.total || region.products_count || products.length })}</strong>
            <label>
              <span>{t("sortBy")}</span>
              <select value={sort} onChange={handleSortChange}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value || "popular"} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="region-page__loading">{t("loading")}</div>
          ) : products.length ? (
            <div className="region-page__grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="region-page__loading">{t("emptyRecentProducts")}</div>
          )}

          {meta.last_page > 1 ? (
            <div className="region-page__pagination">
              <button type="button" onClick={() => goToPage(meta.current_page - 1)} disabled={meta.current_page <= 1 || loading}>
                {t("previous")}
              </button>
              <span>{meta.current_page} / {meta.last_page}</span>
              <button type="button" onClick={() => goToPage(meta.current_page + 1)} disabled={meta.current_page >= meta.last_page || loading}>
                {t("next")}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}

function normalizeRegion(value = {}) {
  return {
    id: value.id ?? null,
    name: value.name || "Región",
    slug: value.slug || "",
    description: value.description || "",
    banner_url: normalizeMediaUrl(value.banner_url || value.banner_path),
    banner_alt: value.banner_alt || value.name || "Región",
    products_count: Number(value.products_count || 0),
  }
}

function normalizeProducts(items = []) {
  return items.map((item) => {
    const price = Number(item?.default_price ?? item?.price ?? 0)
    const activePromotions = Array.isArray(item?.active_promotions) ? item.active_promotions : []
    const promotionMessage = activePromotions[0]?.message || activePromotions[0]?.name || ""

    return {
      id: item?.id ?? null,
      name: item?.name ?? "Producto sin nombre",
      slug: item?.slug ?? "",
      image: normalizeProductImage(item),
      price,
      oldPrice: Number(item?.old_price ?? price),
      priceMoneyFormatted: getProductPriceMoney(item),
      oldPriceMoneyFormatted: getProductCompareMoney(item),
      price_money: item?.price_money ?? null,
      priceInfo: item?.price_info ?? null,
      brand: item?.brand ?? "Sin marca",
      shortDescription: item?.short_description ?? "",
      description: item?.description ?? "",
      category: item?.category?.name ?? "",
      family: item?.family?.name ?? "",
      sku: item?.sku ?? "",
      rating: item?.rating ?? 4.8,
      sold: item?.sold ?? "",
      shipping: item?.shipping ?? "",
      discountLabel: "",
      badges: promotionMessage ? [promotionMessage] : [],
      activePromotions,
      promotionMessage,
      stock: item?.stock ?? null,
      stockStatus: item?.stock_status ?? "untracked",
      stockMessage: item?.stock_message ?? "",
      isFavorite: Boolean(item?.is_favorite),
    }
  })
}

function normalizeProductImage(item = {}) {
  const image = String(
    item.image_url ||
    item.image_path ||
    item.main_image_url ||
    item.thumbnail_url ||
    item.image ||
    ""
  ).trim()

  if (!image) return PRODUCT_IMAGE_PLACEHOLDER
  return normalizeMediaUrl(image) || PRODUCT_IMAGE_PLACEHOLDER
}

export default RegionPage
