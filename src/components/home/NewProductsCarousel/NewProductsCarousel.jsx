import { Link } from "react-router-dom"
import { useRef } from "react"
import { useLocalization } from "../../../context/LocalizationContext"
import "./newproductscarousel.css"

const NEW_PRODUCTS = [
  {
    id: 1,
    title: "Ceramica de barro negro",
    category: "Piezas de autor",
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 2,
    title: "Textiles para el hogar",
    category: "Hogar artesanal",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 3,
    title: "Joyeria de declaracion",
    category: "Coleccion nueva",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 4,
    title: "Sillas tejidas",
    category: "Diseno natural",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 5,
    title: "Vasijas pintadas",
    category: "Ceramica",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 6,
    title: "Bolsas tejidas",
    category: "Moda artesanal",
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 7,
    title: "Anillos con piedra",
    category: "Joyeria",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 8,
    title: "Cesteria decorativa",
    category: "Decoracion",
    image: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 9,
    title: "Arte mural tejido",
    category: "Paredes con historia",
    image: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 10,
    title: "Mesa tallada",
    category: "Muebles",
    image: "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=900&q=85",
  },
]

function NewProductsCarousel() {
  const { t } = useLocalization()
  const trackRef = useRef(null)

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
          {NEW_PRODUCTS.map((product) => (
            <article className="new-products__item" key={product.id}>
              <Link className="new-products__image-link" to={`/productos?search=${encodeURIComponent(product.title)}`}>
                <img src={product.image} alt={product.title} loading="lazy" />
              </Link>

              <div className="new-products__copy">
                <p>{product.category}</p>
                <h3>{product.title}</h3>
                <Link to={`/productos?search=${encodeURIComponent(product.title)}`}>
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

export default NewProductsCarousel
