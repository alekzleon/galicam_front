import "./homehighlights.css"

const cards = [
  {
    id: 1,
    title: "Productos estrella",
    description: "Descubre artículos destacados con gran respuesta de compra.",
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
    price: "$499",
    badge: "Top ventas",
    cta: "Ver productos",
  },
  {
    id: 2,
    title: "Promociones activas",
    description: "Aprovecha descuentos especiales en productos seleccionados.",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    price: "Hasta 30% OFF",
    badge: "Oferta",
    cta: "Explorar",
  },
  {
    id: 3,
    title: "Compra rápida",
    description:
      "Accede a productos listos para compra inmediata con mejor precio.",
    image:
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=600&q=80",
    price: "$899",
    badge: "Recomendado",
    cta: "Comprar ahora",
  },
  {
    id: 4,
    title: "Lo más buscado",
    description:
      "Encuentra artículos populares con gran visibilidad y demanda.",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    price: "$1,299",
    badge: "Tendencia",
    cta: "Descubrir",
  },
]

function HomeHighlights() {
  return (
    <section className="home-highlights">
      <div className="container-main">
        <div className="home-highlights__grid">
          {cards.map((card) => (
            <article className="highlight-card" key={card.id}>
              <div className="highlight-card__badge">{card.badge}</div>

              <div className="highlight-card__image-wrap">
                <img
                  src={card.image}
                  alt={card.title}
                  className="highlight-card__image"
                />
              </div>

              <div className="highlight-card__body">
                <h3 className="highlight-card__title">{card.title}</h3>
                <p className="highlight-card__description">
                  {card.description}
                </p>
                <div className="highlight-card__price">{card.price}</div>
                <button type="button" className="highlight-card__button">
                  {card.cta}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HomeHighlights