import "./productlistskeleton.css"

function ProductListSkeleton({ count = 12 }) {
  return (
    <div className="products-grid">
      {Array.from({ length: count }).map((_, index) => (
        <article className="product-skeleton" key={index}>
          <div className="product-skeleton__image shimmer" />
          <div className="product-skeleton__body">
            <div className="product-skeleton__line shimmer short" />
            <div className="product-skeleton__line shimmer medium" />
            <div className="product-skeleton__line shimmer small" />
            <div className="product-skeleton__line shimmer price" />
            <div className="product-skeleton__line shimmer tiny" />
          </div>
        </article>
      ))}
    </div>
  )
}

export default ProductListSkeleton