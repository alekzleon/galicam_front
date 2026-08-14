import { useEffect, useRef, useState } from "react"
import "./searchbar.css"
import { useLocation, useNavigate } from "react-router-dom"
import { getSearchSuggestions } from "../../../services/api/productService"
import { useAuth } from "../../../context/AuthContext"
import { useCurrency } from "../../../context/CurrencyContext"
import { useLocalization } from "../../../context/LocalizationContext"
import { getProductPriceMoney } from "../../../utils/money"
import { saveRecentSearchTerm } from "../../../utils/recentSearchTerms"

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
})
const PRICE_UNAVAILABLE_SOURCE = "precios_articulos_default_missing"

function SearchBar({ onSearchSubmit, onNavigate, placeholder }) {
  const { currency } = useCurrency()
  const { t } = useLocalization()
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [results, setResults] = useState({
    did_you_mean: null,
    suggestions: {
      products: [],
      brands: [],
      categories: [],
      families: [],
    },
  })

  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, sessionReady } = useAuth()
  const wrapperRef = useRef(null)
  const debounceRef = useRef(null)
  const canShowPrices = sessionReady && isAuthenticated

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    setShowDropdown(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim().length < 4) {
      setResults({
        did_you_mean: null,
        suggestions: {
          products: [],
          brands: [],
          categories: [],
          families: [],
        },
      })
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true)

        const data = await getSearchSuggestions(query.trim())
        setResults(data)
        setShowDropdown(true)
      } catch (error) {
        console.error("Error loading suggestions:", error)
        setResults({
          did_you_mean: null,
          suggestions: {
            products: [],
            brands: [],
            categories: [],
            families: [],
          },
        })
        setShowDropdown(false)
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [currency, query])

  const closeDropdown = () => {
    setShowDropdown(false)
  }

  const goToProduct = (slug) => {
    closeDropdown()
    onNavigate?.()
    navigate(`/producto/${slug}`)
  }

  const handleSubmit = (value = query) => {
    const normalizedValue = value.trim()

    if (!normalizedValue) return

    saveRecentSearchTerm(normalizedValue)
    closeDropdown()

    if (onSearchSubmit) {
      onSearchSubmit(normalizedValue)
      return
    }

    navigate(`/productos?search=${encodeURIComponent(normalizedValue)}`)
  }

  const totalResults =
    results.suggestions.products.length +
    results.suggestions.brands.length +
    results.suggestions.categories.length +
    results.suggestions.families.length

  return (
    <div className="searchbar" ref={wrapperRef}>
      <i className="bi bi-search search-input-icon" aria-hidden="true" />

      <input
        type="text"
        placeholder={placeholder || t("searchPlaceholder", { brandName: "" }).trim()}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (query.trim().length >= 4) {
            setShowDropdown(true)
          }
        }}
        className="search-input"
      />

      <button
        className="search-button"
        onClick={() => handleSubmit()}
        type="button"
        aria-label={t("search")}
      >
        <i className="bi bi-search" aria-hidden="true" />
        <span className="search-button__text">{t("search")}</span>
      </button>

      {showDropdown && (
        <div className="searchbar-dropdown">
          {loading && <div className="searchbar-loading">{t("searchLoading")}</div>}

          {!loading && results.did_you_mean && (
            <button
              type="button"
              className="searchbar-didyoumean"
              onClick={() => {
                setQuery(results.did_you_mean)
                handleSubmit(results.did_you_mean)
              }}
            >
              {t("searchSuggestion")} <strong>{results.did_you_mean}</strong>
            </button>
          )}

          {!loading && totalResults === 0 && (
            <div className="searchbar-empty">
              {t("searchEmpty")}
            </div>
          )}

          {!loading && results.suggestions.products.length > 0 && (
            <div className="searchbar-group">
              <div className="searchbar-group-title">{t("searchProducts")}</div>

              {results.suggestions.products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="searchbar-item"
                  onClick={() => goToProduct(product.slug)}
                >
                  <div className="searchbar-item-main">
                    <span className="searchbar-item-name">{product.name}</span>
                    {product.brand && (
                      <span className="searchbar-item-meta">{product.brand}</span>
                    )}
                  </div>

                  {canShowPrices &&
                    (getProductPriceMoney(product) ||
                      (product.price != null &&
                        Number(product.price) > 0 &&
                        product.price_info?.source !== PRICE_UNAVAILABLE_SOURCE)) && (
                      <span className="searchbar-item-price">
                        {getProductPriceMoney(product) || currencyFormatter.format(Number(product.price || 0))}
                      </span>
                    )}
                  {canShowPrices &&
                    !getProductPriceMoney(product) &&
                    product.price != null &&
                    (Number(product.price) <= 0 ||
                      product.price_info?.source === PRICE_UNAVAILABLE_SOURCE) && (
                      <span className="searchbar-item-price">
                        {t("priceUnavailable")}
                      </span>
                    )}
                </button>
              ))}
            </div>
          )}

          {!loading && results.suggestions.brands.length > 0 && (
            <div className="searchbar-group">
              <div className="searchbar-group-title">{t("searchBrands")}</div>

              {results.suggestions.brands.map((brand, index) => (
                <button
                  key={`${brand.name}-${index}`}
                  type="button"
                  className="searchbar-item"
                  onClick={() => handleSubmit(brand.name)}
                >
                  <span className="searchbar-item-name">{brand.name}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && results.suggestions.categories.length > 0 && (
            <div className="searchbar-group">
              <div className="searchbar-group-title">{t("searchCategories")}</div>

              {results.suggestions.categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className="searchbar-item"
                  onClick={() => handleSubmit(category.name)}
                >
                  <span className="searchbar-item-name">{category.name}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && results.suggestions.families.length > 0 && (
            <div className="searchbar-group">
              <div className="searchbar-group-title">{t("searchFamilies")}</div>

              {results.suggestions.families.map((family) => (
                <button
                  key={family.id}
                  type="button"
                  className="searchbar-item"
                  onClick={() => handleSubmit(family.name)}
                >
                  <span className="searchbar-item-name">{family.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBar
