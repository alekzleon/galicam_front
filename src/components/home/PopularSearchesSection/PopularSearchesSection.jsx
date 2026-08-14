import { Link } from "react-router-dom"
import { useLocalization } from "../../../context/LocalizationContext"
import "./popularsearchessection.css"

function PopularSearchesSection({ data, loading = false }) {
  const { t } = useLocalization()
  const terms = Array.isArray(data?.terms) ? data.terms.map(normalizePopularTerm).filter((term) => term.label) : []
  const products = Array.isArray(data?.products)
    ? data.products.map(normalizePopularProduct).filter((product) => product.id)
    : []

  if (loading) return <PopularSearchesSkeleton title={t("popularSearches")} subtitle={t("popularSearchesRecommended")} />
  if (!terms.length && !products.length) return null

  return (
    <section className="popular-searches" aria-labelledby="popular-searches-title">
      <div className="popular-searches__inner">
        <aside className="popular-searches__panel">
          <h2 id="popular-searches-title">{t("popularSearches")}</h2>

          <div className="popular-searches__chips">
            {terms.map((term, index) => (
              <Link
                key={term.value || term.label}
                className={index === 0 ? "is-active" : ""}
                to={`/productos?search=${encodeURIComponent(term.value || term.label)}`}
              >
                {term.label}
              </Link>
            ))}
          </div>
        </aside>

        <div className="popular-searches__content">
          <header className="popular-searches__header">
            <p>{t("popularSearchesRecommended")}</p>
            <Link to="/productos">{t("viewMore")}</Link>
          </header>

          <div className="popular-searches__grid">
            {products.map((product) => (
              <article className="popular-product" key={product.id}>
                <Link className="popular-product__image" to={product.url}>
                  <img src={product.image} alt={product.name} loading="lazy" />
                </Link>

                <button type="button" className="popular-product__favorite" aria-label={t("addFavorite")}>
                  <i className={`bi ${product.isFavorite ? "bi-heart-fill" : "bi-heart"}`} aria-hidden="true" />
                </button>

                <Link className="popular-product__name" to={product.url}>
                  {product.name}
                </Link>
                <strong>{product.price}</strong>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function PopularSearchesSkeleton({ title, subtitle }) {
  return (
    <section className="popular-searches" aria-busy="true" aria-labelledby="popular-searches-title">
      <div className="popular-searches__inner">
        <aside className="popular-searches__panel">
          <h2 id="popular-searches-title">{title}</h2>
          <div className="popular-searches__chips popular-searches__chips--skeleton" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
        </aside>

        <div className="popular-searches__content">
          <header className="popular-searches__header">
            <p>{subtitle}</p>
            <span className="popular-searches__skeleton-link" aria-hidden="true" />
          </header>
          <div className="popular-searches__grid" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <article className="popular-product popular-product--skeleton" key={index}>
                <span className="popular-product__skeleton-image" />
                <span className="popular-product__skeleton-line" />
                <span className="popular-product__skeleton-line is-short" />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function normalizePopularTerm(term) {
  if (typeof term === "string") return { label: term, value: term }

  return {
    label: term?.label || term?.name || term?.value || "",
    value: term?.value || term?.slug || term?.label || term?.name || "",
  }
}

function normalizePopularProduct(product = {}) {
  const name = product.name || "Producto"
  const slug = product.slug || ""

  return {
    id: product.id || slug || "",
    name,
    slug,
    price: typeof product.price === "string"
      ? product.price
      : formatPrice(product.price, product.currency),
    image: product.image_url || product.image || "",
    isFavorite: Boolean(product.is_favorite),
    url: slug ? `/producto/${slug}` : `/productos?search=${encodeURIComponent(name)}`,
  }
}

function formatPrice(value, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: String(currency || "MXN").toUpperCase(),
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export default PopularSearchesSection
