import { useRef } from "react"
import { Link } from "react-router-dom"
import { useLocalization } from "../../../context/LocalizationContext"
import "./newproductscarousel.css"

function NewProductsCarousel({ products = [], loading = false }) {
  const { t } = useLocalization()
  const trackRef = useRef(null)
  const items = Array.isArray(products) ? products.map(normalizeNewProduct).filter((product) => product.id) : []

  if (loading) return <NewProductsSkeleton title={t("newProducts")} />
  if (!items.length) return null

  function scrollProducts(direction) {
    const track = trackRef.current
    if (!track) return

    track.scrollBy({
      left: direction * Math.round(track.clientWidth * 0.82),
      behavior: "smooth",
    })
  }

  return (
    <section className="new-products" aria-labelledby="new-products-title">
      <div className="new-products__header">
        <h2 id="new-products-title">{t("newProducts")}</h2>
      </div>

      <div className="new-products__carousel">
        <button
          type="button"
          className="new-products__arrow new-products__arrow--prev"
          onClick={() => scrollProducts(-1)}
          aria-label={t("previousProducts")}
        >
          <i className="bi bi-chevron-left" aria-hidden="true" />
        </button>

        <div className="new-products__track" ref={trackRef}>
          {items.map((product) => (
            <article className="new-products__item" key={product.id}>
              <Link className="new-products__image-link" to={product.url}>
                <img src={product.image} alt={product.title} loading="lazy" />
              </Link>

              <div className="new-products__copy">
                <p>{product.category}</p>
                <h3>{product.title}</h3>
                <Link to={product.url}>
                  {t("shopCollection")}
                </Link>
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="new-products__arrow new-products__arrow--next"
          onClick={() => scrollProducts(1)}
          aria-label={t("nextProducts")}
        >
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

function NewProductsSkeleton({ title }) {
  return (
    <section className="new-products" aria-busy="true" aria-labelledby="new-products-title">
      <div className="new-products__header">
        <h2 id="new-products-title">{title}</h2>
      </div>
      <div className="new-products__track" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <article className="new-products__item new-products__item--skeleton" key={index}>
            <span className="new-products__skeleton-image" />
            <span className="new-products__skeleton-line is-short" />
            <span className="new-products__skeleton-line" />
            <span className="new-products__skeleton-line is-link" />
          </article>
        ))}
      </div>
    </section>
  )
}

function normalizeNewProduct(product = {}) {
  const title = product.title || product.name || "Producto"
  const slug = product.slug || ""

  return {
    id: product.id || slug || "",
    title,
    category: product.category?.name || product.category || "Nueva pieza",
    image: product.image_url || product.image || "",
    url: slug ? `/producto/${slug}` : `/productos?search=${encodeURIComponent(title)}`,
  }
}

export default NewProductsCarousel
