import ProductCard from "../ProductCard/ProductCard"
import "./productgrid.css"

function ProductGrid({ products = [], onFavoriteChange }) {
  return (
    <div className="products-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id ?? product.slug}
          product={product}
          onFavoriteChange={onFavoriteChange}
        />
      ))}
    </div>
  )
}

export default ProductGrid
