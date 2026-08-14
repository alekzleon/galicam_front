import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  addAccountWishlistProduct,
  getAccountWishlistOptions,
} from "../../services/api/accountService"
import { notifyError, notifySuccess } from "../../utils/toast"
import "./wishlistmodal.css"

function WishlistModal({ isOpen, product, triggerRef, onClose }) {
  const [loading, setLoading] = useState(false)
  const [savingListId, setSavingListId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [creatingVisible, setCreatingVisible] = useState(false)
  const [options, setOptions] = useState(null)
  const [listName, setListName] = useState("")
  const [position, setPosition] = useState({ top: 80, left: 16 })
  const panelRef = useRef(null)

  const productId = product?.id || product?.productId || product?.product_id

  useEffect(() => {
    if (!isOpen || !productId) return

    window.dispatchEvent(new CustomEvent("wishlist-menu:open", { detail: { productId } }))

    let alive = true

    async function loadOptions() {
      try {
        setLoading(true)
        const response = await getAccountWishlistOptions(productId)

        if (alive) setOptions(response?.data || null)
      } catch (error) {
        console.error("Error al cargar listas:", error?.response?.data || error)
        notifyError(error?.response?.data?.message || "No fue posible cargar tus listas.")
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadOptions()

    return () => {
      alive = false
    }
  }, [isOpen, productId])

  useEffect(() => {
    if (!isOpen) return

    function handleAnotherMenuOpen(event) {
      if (String(event.detail?.productId || "") !== String(productId || "")) {
        onClose?.()
      }
    }

    window.addEventListener("wishlist-menu:open", handleAnotherMenuOpen)

    return () => {
      window.removeEventListener("wishlist-menu:open", handleAnotherMenuOpen)
    }
  }, [isOpen, onClose, productId])

  useEffect(() => {
    if (!isOpen) {
      setOptions(null)
      setListName("")
      setSavingListId(null)
      setCreating(false)
      setCreatingVisible(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    function updatePosition() {
      const rect = triggerRef?.current?.getBoundingClientRect()
      const menuWidth = 240
      const menuHeight = 260
      const margin = 10

      if (!rect) {
        setPosition({ top: 80, left: margin })
        return
      }

      const top = Math.min(rect.bottom + 6, window.innerHeight - menuHeight - margin)

      setPosition({
        top: Math.max(margin, top),
        left: Math.min(Math.max(rect.right - menuWidth, margin), window.innerWidth - menuWidth - margin),
      })
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)

    return () => {
      window.removeEventListener("resize", updatePosition)
    }
  }, [isOpen, triggerRef])

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event) {
      const target = event.target

      if (panelRef.current?.contains(target)) return
      if (triggerRef?.current?.contains(target)) return

      onClose?.()
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose, triggerRef])

  if (!isOpen || typeof document === "undefined") return null

  const lists = Array.isArray(options?.lists) ? options.lists : []

  async function refreshOptions() {
    const response = await getAccountWishlistOptions(productId)
    setOptions(response?.data || null)
  }

  async function handleAddToList(wishlistId) {
    if (!productId || !wishlistId || savingListId) return

    try {
      setSavingListId(wishlistId)
      const response = await addAccountWishlistProduct({
        product_id: productId,
        wishlist_id: wishlistId,
      })

      notifySuccess(response?.message || "Producto agregado a la lista correctamente.")
      await refreshOptions()
    } catch (error) {
      console.error("Error al agregar a lista:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible agregar el producto a la lista.")
    } finally {
      setSavingListId(null)
    }
  }

  async function handleCreateAndAdd(event) {
    event.preventDefault()

    const cleanName = listName.trim()
    if (!cleanName || creating) return

    try {
      setCreating(true)
      const response = await addAccountWishlistProduct({
        product_id: productId,
        list_name: cleanName,
      })

      notifySuccess(response?.message || "Lista creada y producto agregado correctamente.")
      setListName("")
      setCreatingVisible(false)
      await refreshOptions()
    } catch (error) {
      console.error("Error al crear lista:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible crear la lista.")
    } finally {
      setCreating(false)
    }
  }

  return createPortal(
    <div className="wishlist-modal" role="dialog" aria-modal="false">
      <div
        ref={panelRef}
        className="wishlist-modal__panel"
        style={{ top: position.top, left: position.left }}
      >
        <div className="wishlist-modal__body">
          {loading ? (
            <div className="wishlist-modal__loading">Cargando listas...</div>
          ) : lists.length ? (
            <div className="wishlist-modal__list">
              {lists.map((list) => (
                <button
                  type="button"
                  className={`wishlist-modal__list-item ${list.has_product ? "is-added" : ""}`}
                  key={list.id}
                  onClick={() => handleAddToList(list.id)}
                  disabled={list.has_product || savingListId === list.id}
                >
                  <span className="wishlist-modal__icon">
                    <i className={list.has_product ? "bi bi-bookmark-check-fill" : "bi bi-bookmark"} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{list.name}</strong>
                    <small>Privada</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="wishlist-modal__empty">Aún no tienes listas.</div>
          )}

          {options?.can_create_list !== false ? (
            <div className="wishlist-modal__create">
              {creatingVisible ? (
                <form onSubmit={handleCreateAndAdd}>
                  <input
                    type="text"
                    value={listName}
                    onChange={(event) => setListName(event.target.value)}
                    placeholder="Nombre de la Wish List"
                    maxLength={80}
                    autoFocus
                  />
                  <button type="submit" disabled={!listName.trim() || creating}>
                    {creating ? "Creando..." : "Crear"}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="wishlist-modal__create-link"
                  onClick={() => setCreatingVisible(true)}
                >
                  <i className="bi bi-plus-lg" aria-hidden="true" />
                  <span>Crear otra Wish List</span>
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default WishlistModal
