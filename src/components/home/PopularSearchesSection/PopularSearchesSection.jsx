import { Link } from "react-router-dom"
import { useLocalization } from "../../../context/LocalizationContext"
import "./popularsearchessection.css"

const POPULAR_SEARCHES = [
  "Barro negro",
  "Textiles",
  "Joyería",
  "Cerámica",
  "Madera",
  "Cestería",
]

const STOCK_PRODUCTS = [
  {
    id: 1,
    name: "Vasija de barro negro tallado",
    price: "1,280 MXN",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=720&q=85",
  },
  {
    id: 2,
    name: "Bolsa tejida de palma natural",
    price: "890 MXN",
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=720&q=85",
  },
  {
    id: 3,
    name: "Anillo artesanal con piedra",
    price: "2,450 MXN",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=720&q=85",
  },
  {
    id: 4,
    name: "Canasto decorativo tejido",
    price: "740 MXN",
    image: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=720&q=85",
  },
]

function PopularSearchesSection() {
  const { t } = useLocalization()

  return (
    <section className="popular-searches" aria-labelledby="popular-searches-title">
      <div className="popular-searches__inner">
        <aside className="popular-searches__panel">
          <h2 id="popular-searches-title">{t("popularSearches")}</h2>

          <div className="popular-searches__chips">
            {POPULAR_SEARCHES.map((term, index) => (
              <Link
                key={term}
                className={index === 0 ? "is-active" : ""}
                to={`/productos?search=${encodeURIComponent(term)}`}
              >
                {term}
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
            {STOCK_PRODUCTS.map((product) => (
              <article className="popular-product" key={product.id}>
                <Link className="popular-product__image" to={`/productos?search=${encodeURIComponent(product.name)}`}>
                  <img src={product.image} alt={product.name} loading="lazy" />
                </Link>

                <button type="button" className="popular-product__favorite" aria-label={t("addFavorite")}>
                  <i className="bi bi-heart" aria-hidden="true" />
                </button>

                <Link className="popular-product__name" to={`/productos?search=${encodeURIComponent(product.name)}`}>
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

export default PopularSearchesSection
