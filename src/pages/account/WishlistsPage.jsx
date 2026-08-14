import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import ProductGrid from "../../components/product/ProductGrid/ProductGrid"
import ProductListSkeleton from "../../components/product/ProductListSkeleton/ProductListSkeleton"
import {
  createAccountWishlist,
  deleteAccountWishlist,
  getAccountWishlist,
  getAccountWishlists,
  removeAccountWishlistProduct,
} from "../../services/api/accountService"
import { useAuth } from "../../context/AuthContext"
import { useLocalization } from "../../context/LocalizationContext"
import { notifyError, notifySuccess, notifyWarning } from "../../utils/toast"
import { normalizeMediaUrl } from "../../utils/mediaUrl"
import "./wishlists.css"

const WISHLIST_PRODUCTS_PER_PAGE = 24
const PRODUCT_IMAGE_PLACEHOLDER = "https://via.placeholder.com/400x400?text=Producto"

function WishlistsPage() {
  const navigate = useNavigate()
  const { isAuthenticated, sessionReady } = useAuth()
  const { t } = useLocalization()
  const [lists, setLists] = useState([])
  const [selectedListId, setSelectedListId] = useState(null)
  const [products, setProducts] = useState([])
  const [loadingLists, setLoadingLists] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: WISHLIST_PRODUCTS_PER_PAGE,
    total: 0,
  })

  useEffect(() => {
    if (!sessionReady) return
    if (!isAuthenticated) navigate("/login")
  }, [isAuthenticated, navigate, sessionReady])

  useEffect(() => {
    if (!sessionReady || !isAuthenticated) return
    loadLists()
  }, [isAuthenticated, sessionReady])

  useEffect(() => {
    if (!selectedListId) {
      setProducts([])
      return
    }

    loadListProducts(selectedListId)
  }, [selectedListId])

  async function loadLists(preferredListId = null) {
    try {
      setLoadingLists(true)
      const response = await getAccountWishlists()
      const nextLists = Array.isArray(response?.data) ? response.data : []
      setLists(nextLists)

      setSelectedListId((currentId) => {
        if (preferredListId && nextLists.some((list) => Number(list.id) === Number(preferredListId))) {
          return preferredListId
        }

        if (currentId && nextLists.some((list) => Number(list.id) === Number(currentId))) {
          return currentId
        }

        return nextLists[0]?.id || null
      })
    } catch (error) {
      console.error("Error al cargar listas:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || t("wishlistsLoadError"))
      setLists([])
    } finally {
      setLoadingLists(false)
    }
  }

  async function loadListProducts(wishlistId, page = 1) {
    try {
      setLoadingProducts(true)
      const response = await getAccountWishlist(wishlistId, {
        page,
        per_page: WISHLIST_PRODUCTS_PER_PAGE,
      })
      const data = response?.data || {}

      setProducts(normalizeWishlistProducts(data.products || [], t))
      setMeta({
        current_page: response?.meta?.current_page ?? 1,
        last_page: response?.meta?.last_page ?? 1,
        per_page: response?.meta?.per_page ?? WISHLIST_PRODUCTS_PER_PAGE,
        total: response?.meta?.total ?? 0,
      })
    } catch (error) {
      console.error("Error al cargar productos de lista:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || t("wishlistProductsLoadError"))
      setProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }

  async function handleCreateList(event) {
    event.preventDefault()

    const cleanName = newListName.trim()
    if (!cleanName || creating) return

    try {
      setCreating(true)
      const response = await createAccountWishlist({
        name: cleanName,
        description: "",
      })
      const createdList = response?.data || null

      notifySuccess(response?.message || t("wishlistCreated"))
      setNewListName("")
      await loadLists(createdList?.id)
    } catch (error) {
      console.error("Error al crear lista:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || t("wishlistCreateError"))
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteList() {
    if (!selectedListId) return
    if (!window.confirm(t("wishlistDeleteConfirm"))) return

    try {
      const response = await deleteAccountWishlist(selectedListId)
      notifySuccess(response?.message || t("wishlistDeleted"))
      setSelectedListId(null)
      setProducts([])
      await loadLists()
    } catch (error) {
      console.error("Error al eliminar lista:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || t("wishlistDeleteError"))
    }
  }

  async function handleRemoveProduct(productId) {
    if (!selectedListId || !productId) return

    try {
      const response = await removeAccountWishlistProduct(selectedListId, productId)
      notifySuccess(response?.message || t("wishlistProductRemoved"))
      setProducts((prev) => prev.filter((product) => product.id !== productId))
      await loadLists(selectedListId)
    } catch (error) {
      console.error("Error al quitar producto:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || t("wishlistProductRemoveError"))
    }
  }

  if (!sessionReady) {
    return (
      <section className="wishlists-page">
        <div className="container-main">
          <ProductListSkeleton count={8} />
        </div>
      </section>
    )
  }

  if (!isAuthenticated) return null

  const selectedList = lists.find((list) => Number(list.id) === Number(selectedListId)) || null

  return (
    <section className="wishlists-page">
      <div className="container-main">
        <div className="wishlists-page__top">
          <div>
            <p className="wishlists-page__breadcrumbs">{t("home")} &gt; {t("wishlists")}</p>
            <h1 className="wishlists-page__title">{t("wishlists")}</h1>
            <p className="wishlists-page__results">{t("savedListsCount", { count: lists.length })}</p>
          </div>
        </div>

        <div className="wishlists-page__layout">
          <aside className="wishlists-page__sidebar">
            <form className="wishlists-page__create" onSubmit={handleCreateList}>
              <input
                type="text"
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                placeholder={t("newList")}
                maxLength={80}
              />
              <button type="submit" disabled={!newListName.trim() || creating}>
                {creating ? t("creating") : t("create")}
              </button>
            </form>

            {loadingLists ? (
              <div className="wishlists-page__empty-sidebar">{t("loadingLists")}</div>
            ) : lists.length ? (
              <div className="wishlists-page__list">
                {lists.map((list) => (
                  <button
                    type="button"
                    className={`wishlists-page__list-btn ${Number(selectedListId) === Number(list.id) ? "is-active" : ""}`}
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                  >
                    <strong>{list.name}</strong>
                    <span>{t("productsCount", { count: list.products_count || 0 })}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="wishlists-page__empty-sidebar">{t("wishlistsEmptyShort")}</div>
            )}
          </aside>

          <main className="wishlists-page__content">
            {selectedList ? (
              <div className="wishlists-page__content-head">
                <div>
                  <h2>{selectedList.name}</h2>
                  <p>{t("productsCount", { count: meta.total })}</p>
                </div>
                <button type="button" onClick={handleDeleteList}>
                  {t("deleteList")}
                </button>
              </div>
            ) : null}

            {loadingProducts ? (
              <ProductListSkeleton count={8} />
            ) : products.length ? (
              <>
                <div className="wishlists-page__product-grid">
                  {products.map((product) => (
                    <div className="wishlists-page__product" key={product.id}>
                      <button
                        type="button"
                        className="wishlists-page__remove"
                        onClick={() => handleRemoveProduct(product.id)}
                        aria-label={t("removeFromList")}
                      >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                      </button>
                      <ProductGrid products={[product]} />
                    </div>
                  ))}
                </div>

                {meta.last_page > 1 ? (
                  <div className="wishlists-page__pagination">
                    <button
                      type="button"
                      onClick={() => loadListProducts(selectedListId, Math.max(meta.current_page - 1, 1))}
                      disabled={meta.current_page === 1}
                    >
                      {t("previous")}
                    </button>
                    <span>
                      {meta.current_page} / {meta.last_page}
                    </span>
                    <button
                      type="button"
                      onClick={() => loadListProducts(selectedListId, Math.min(meta.current_page + 1, meta.last_page))}
                      disabled={meta.current_page === meta.last_page}
                    >
                      {t("next")}
                    </button>
                  </div>
                ) : null}
              </>
            ) : selectedList ? (
              <div className="wishlists-page__empty">
                <h2>{t("wishlistEmptyTitle")}</h2>
                <p>{t("wishlistEmptyText")}</p>
                <Link to="/productos">{t("seeProducts")}</Link>
              </div>
            ) : (
              <div className="wishlists-page__empty">
                <h2>{t("wishlistsEmptyTitle")}</h2>
                <p>{t("wishlistsEmptyText")}</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  )
}

function normalizeWishlistProducts(items = [], t) {
  return items.map((item) => {
    const price = Number(item?.default_price ?? item?.price ?? 0)

    return {
      id: item?.id ?? null,
      name: item?.name ?? t("unnamedProduct"),
      slug: item?.slug ?? "",
      image: normalizeMediaUrl(item?.image_url || item?.image_path || item?.media_url || item?.media_path) || PRODUCT_IMAGE_PLACEHOLDER,
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
      stock: item?.stock ?? null,
      stockStatus: item?.stock_status ?? "untracked",
      stockMessage: item?.stock_message ?? "",
      isFavorite: Boolean(item?.is_favorite),
      addedToWishlistAt: item?.added_to_wishlist_at ?? null,
    }
  })
}

export default WishlistsPage
