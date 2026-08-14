import { useState } from "react"
import { useLocalization } from "../../../context/LocalizationContext"
import "./catalogsidebar.css"

function CatalogSidebar({
  categoryFamilies = [],
  brandOptions = [],
  selectedCategorySlug = "",
  selectedFamilySlug = "",
  selectedBrand = "",
  onCategorySelect,
  onFamilySelect,
  onBrandSelect,
  onClearFilters,
}) {
  const { t } = useLocalization()
  const [openCategoryId, setOpenCategoryId] = useState(null)

  const toggleCategory = (categoryId) => {
    setOpenCategoryId((prev) => (prev === categoryId ? null : categoryId))
  }

  return (
    <aside className="catalog-sidebar">
      <div className="catalog-sidebar__section">
        <h3 className="catalog-sidebar__section-title">{t("catalogCategories")}</h3>

        <div className="catalog-sidebar__categories">
          {categoryFamilies.map((category) => {
            const isOpen = openCategoryId === category.id
            const isCategorySelected = selectedCategorySlug === category.slug

            return (
              <div className="catalog-category" key={category.id}>
                <button
                  type="button"
                  className={`catalog-category__trigger ${isOpen ? "is-open" : ""} ${isCategorySelected ? "is-active" : ""}`}
                  onClick={() => {
                    toggleCategory(category.id)
                    onCategorySelect(category)
                  }}
                >
                  <span className="catalog-category__name">{category.name}</span>
                  <span className="catalog-category__meta">
                    ({category.count}) {category.families.length > 0 ? (isOpen ? "▴" : "▾") : ""}
                  </span>
                </button>

                {isOpen && category.families.length > 0 ? (
                  <div className="catalog-category__families">
                    {category.families.map((family) => {
                      const isFamilySelected = selectedFamilySlug === family.slug

                      return (
                        <button
                          type="button"
                          className={`catalog-family ${isFamilySelected ? "is-active" : ""}`}
                          key={family.id}
                          onClick={() => onFamilySelect(category, family)}
                        >
                          <span>{family.name}</span>
                          <small>({family.count})</small>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
{/* 
      <div className="catalog-sidebar__section">
        <h3 className="catalog-sidebar__section-title">Filtros</h3>

        <div className="catalog-sidebar__filter-card">
          <button type="button" className="catalog-filter-chip">
            Precios mayoristas
          </button>
          <button type="button" className="catalog-filter-chip">
            Llega mañana
          </button>
          <button type="button" className="catalog-filter-chip">
            Envío local
          </button>
          <button type="button" className="catalog-filter-chip">
            Envío gratis
          </button>
          <button type="button" className="catalog-filter-chip">
            Promoción activa
          </button>
        </div>
      </div> */}

      <div className="catalog-sidebar__section">
        <h3 className="catalog-sidebar__section-title">{t("brands")}</h3>

        <div className="catalog-sidebar__brands">
          {brandOptions.map((brand) => (
            <label className="catalog-brand" key={brand.name}>
              <input
                type="checkbox"
                checked={selectedBrand === brand.name}
                onChange={() => onBrandSelect(brand.name)}
              />
              <span>{brand.name} ({brand.count})</span>
            </label>
          ))}
        </div>
      </div>

      <div className="catalog-sidebar__section">
        <button
          type="button"
          className="catalog-filter-chip"
          onClick={onClearFilters}
        >
          {t("clearFilters")}
        </button>
      </div>
    </aside>
  )
}

export default CatalogSidebar
