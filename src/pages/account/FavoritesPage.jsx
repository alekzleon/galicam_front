import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import ProductGrid from "../../components/product/ProductGrid/ProductGrid"
import ProductListSkeleton from "../../components/product/ProductListSkeleton/ProductListSkeleton"
import { getAccountFavorites } from "../../services/api/accountService"
import { useAuth } from "../../context/AuthContext"
import { useLocalization } from "../../context/LocalizationContext"
import { notifyError } from "../../utils/toast"
import { normalizeMediaUrl } from "../../utils/mediaUrl"
import "./favorites.css"

const FAVORITES_PER_PAGE = 24
const PRODUCT_IMAGE_PLACEHOLDER = "https://via.placeholder.com/400x400?text=Producto"

function FavoritesPage() {
  const navigate = useNavigate()
  const { isAuthenticated, sessionReady } = useAuth()
  const { t } = useLocalization()

  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: FAVORITES_PER_PAGE,
    total: 0,
  })

  useEffect(() => {
    if (!sessionReady) return

    if (!isAuthenticated) {
      navigate("/login")
    }
  }, [isAuthenticated, navigate, sessionReady])

  useEffect(() => {
    if (!sessionReady || !isAuthenticated) return

    const fetchFavorites = async () => {
      try {
        setLoading(true)
        const response = await getAccountFavorites({
          page,
          per_page: FAVORITES_PER_PAGE,
        })

        setFavorites(normalizeFavorites(response?.data || [], t))
        setMeta({
          current_page: response?.meta?.current_page ?? 1,
          last_page: response?.meta?.last_page ?? 1,
          per_page: response?.meta?.per_page ?? FAVORITES_PER_PAGE,
          total: response?.meta?.total ?? 0,
        })
      } catch (error) {
        console.error("Error al cargar favoritos:", error?.response?.data || error)
        notifyError(error?.response?.data?.message || t("favoritesLoadError"))
        setFavorites([])
      } finally {
        setLoading(false)
      }
    }

    fetchFavorites()
  }, [isAuthenticated, page, sessionReady, t])

  const handleFavoriteChange = (productId, isFavorite) => {
    if (isFavorite) return

    setFavorites((prev) => prev.filter((product) => product.id !== productId))
    setMeta((prev) => ({
      ...prev,
      total: Math.max(Number(prev.total || 0) - 1, 0),
    }))
  }

  if (!sessionReady) {
    return (
      <section className="favorites-page">
        <div className="container-main">
          <ProductListSkeleton count={8} />
        </div>
      </section>
    )
  }

  if (!isAuthenticated) return null

  return (
    <section className="favorites-page">
      <div className="container-main">
        <div className="favorites-page__top">
          <div>
            <p className="favorites-page__breadcrumbs">{t("home")} &gt; {t("favorites")}</p>
            <h1 className="favorites-page__title">{t("favorites")}</h1>
            <p className="favorites-page__results">{t("savedProductsCount", { count: meta.total })}</p>
          </div>
        </div>

        {loading ? (
          <ProductListSkeleton count={8} />
        ) : favorites.length ? (
          <>
            <ProductGrid products={favorites} onFavoriteChange={handleFavoriteChange} />

            {meta.last_page > 1 ? (
              <div className="favorites-page__pagination">
                <button
                  type="button"
                  className="favorites-page__page-btn"
                  onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                  disabled={page === 1}
                >
                  {t("previous")}
                </button>

                {Array.from({ length: meta.last_page }).map((_, index) => {
                  const pageNumber = index + 1

                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      className={`favorites-page__page-number ${page === pageNumber ? "is-active" : ""}`}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  )
                })}

                <button
                  type="button"
                  className="favorites-page__page-btn"
                  onClick={() => setPage((currentPage) => Math.min(currentPage + 1, meta.last_page))}
                  disabled={page === meta.last_page}
                >
                  {t("next")}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="favorites-page__empty">
            <h2>{t("favoritesEmptyTitle")}</h2>
            <p>{t("favoritesEmptyText")}</p>
            <Link to="/productos" className="favorites-page__empty-action">
              {t("seeProducts")}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

function normalizeFavorites(items = [], t) {
  return items.map((item) => {
    const price = Number(item?.default_price ?? 0)

    return {
      id: item?.id ?? null,
      name: item?.name ?? t("unnamedProduct"),
      slug: item?.slug ?? "",
      image: normalizeProductImage(item?.image_url || item?.image_path),
      price,
      oldPrice: price,
      priceInfo: item?.price_info ?? null,
      brand: item?.brand ?? t("noBrand"),
      sku: item?.sku ?? "",
      rating: 4.8,
      sold: t("highTurnover"),
      shipping: t("deliveryAvailable"),
      discountLabel: "",
      badges: [],
      isFavorite: Boolean(item?.is_favorite ?? true),
      favoritedAt: item?.favorited_at ?? null,
    }
  })
}

function normalizeProductImage(value) {
  const image = String(value || "").trim()

  if (!image) return PRODUCT_IMAGE_PLACEHOLDER

  const nestedUrlMatch = image.match(/https?:\/\/.+?(https?:\/\/.+)$/)

  if (nestedUrlMatch?.[1]) {
    return nestedUrlMatch[1]
  }

  return normalizeMediaUrl(image) || PRODUCT_IMAGE_PLACEHOLDER
}

export default FavoritesPage
