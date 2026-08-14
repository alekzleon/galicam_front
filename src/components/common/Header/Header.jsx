import { Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import SearchBar from "../SearchBar/SearchBar"
import InlineSettingEditor from "../InlineSettingEditor/InlineSettingEditor"
import InlineLogoSettingEditor from "../InlineLogoSettingEditor/InlineLogoSettingEditor"
import { useAuth } from "../../../context/AuthContext"
import { useCurrency } from "../../../context/CurrencyContext"
import { useLocalization } from "../../../context/LocalizationContext"
import { useSettings } from "../../../context/SettingsContext"
import { getCatalogSidebar, getRegionsMenu } from "../../../services/api/productService"
import { getCartSummary } from "../../../services/api/cartService"
import "./header.css"

const CART_SUMMARY_STORAGE_KEY = "ecommerce_cart_summary"
const DEFAULT_NAV_TAGLINE = "Todo para tu negocio, al mejor precio y con entrega garantizada."

const defaultCartSummary = {
  id: null,
  items_count: 0,
  subtotal: 0,
  discount: 0,
  tax: 0,
  tax_breakdown: {
    total: 0,
    items: [],
  },
  total: 0,
}

function Header() {
  const navigate = useNavigate()
  const { isAuthenticated, isInternal, modules, user, logout } = useAuth()
  const { locale, availableLocales, changeLocale, t } = useLocalization()
  const { currency, availableCurrencies, changeCurrency } = useCurrency()
  const { settings, loading: settingsLoading, brandName, logoUrl, updateLocalSetting } = useSettings()

  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)
  const [isRegionsOpen, setIsRegionsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [categories, setCategories] = useState([])
  const [regions, setRegions] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [regionsLoading, setRegionsLoading] = useState(true)
  const [cartSummary, setCartSummary] = useState(defaultCartSummary)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("")

  const displayName = user?.name ? user.name.split(" ")[0] : ""
  const profileName = user?.name ? user.name.toUpperCase() : ""
  const avatarLetter = user?.name ? user.name.charAt(0).toUpperCase() : ""
  const navTitle = settings.nav_title?.title || DEFAULT_NAV_TAGLINE
  const navDesign = settings.storefront?.visual_design?.nav || {}
  const navVariant = navDesign.variant || "classic"
  const navDensity = navDesign.density || "comfortable"
  const showTopBar = navDesign.show_top_bar !== false
  const isEditorialShop = settings.storefront?.active_template === "editorial_shop"
  const canEditNavTitle = isAuthenticated && isInternal && hasModule(modules, "configuracion_ecommerce")
  const canEditGeneralLogo = canEditNavTitle
  const visibleLogoUrl = logoPreviewUrl || logoUrl

  const readStoredCartSummary = () => {
    try {
      const raw = localStorage.getItem(CART_SUMMARY_STORAGE_KEY)

      if (!raw) {
        return defaultCartSummary
      }

      const parsed = JSON.parse(raw)

      return {
        id: parsed?.id ?? null,
        items_count: Number(parsed?.items_count ?? 0),
        subtotal: Number(parsed?.subtotal ?? 0),
        discount: Number(parsed?.discount ?? 0),
        tax: Number(parsed?.tax ?? 0),
        tax_breakdown: normalizeTaxBreakdown(parsed?.tax_breakdown),
        total: Number(parsed?.total ?? 0),
      }
    } catch {
      return defaultCartSummary
    }
  }

  const saveCartSummary = (payload) => {
    const summary = {
      id: payload?.id ?? null,
      items_count: Number(payload?.items_count ?? 0),
      subtotal: Number(payload?.subtotal ?? 0),
      discount: Number(payload?.discount ?? 0),
      tax: Number(payload?.tax ?? 0),
      tax_breakdown: normalizeTaxBreakdown(payload?.tax_breakdown),
      total: Number(payload?.total ?? 0),
    }

    setCartSummary(summary)
    localStorage.setItem(CART_SUMMARY_STORAGE_KEY, JSON.stringify(summary))
  }

  const clearCartSummary = () => {
    setCartSummary(defaultCartSummary)
    localStorage.removeItem(CART_SUMMARY_STORAGE_KEY)
  }

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true)

        const response = await getCatalogSidebar()
        setCategories(response?.data?.categoryFamilies || [])
      } catch (error) {
        console.error("Error loading header categories:", error)
        setCategories([])
      } finally {
        setCategoriesLoading(false)
      }
    }

    fetchCategories()
  }, [locale])

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setRegionsLoading(true)
        const response = await getRegionsMenu()
        setRegions(Array.isArray(response?.data) ? response.data : [])
      } catch (error) {
        console.error("Error loading header regions:", error?.response?.data || error)
        setRegions([])
      } finally {
        setRegionsLoading(false)
      }
    }

    fetchRegions()
  }, [locale])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 991) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      clearCartSummary()
      return
    }

    setCartSummary(readStoredCartSummary())

    const fetchCartSummary = async () => {
      try {
        const response = await getCartSummary()
        const summary = response?.data || response

        if (summary && typeof summary === "object") {
          saveCartSummary(summary)
        }
      } catch (error) {
        console.error("Error loading cart summary:", error?.response?.data || error)
      }
    }

    fetchCartSummary()
  }, [isAuthenticated])

  useEffect(() => {
    const handleCartUpdated = (event) => {
      const detail = event?.detail

      if (detail && typeof detail === "object") {
        saveCartSummary(detail)
      }
    }

    const handleStorage = (event) => {
      if (event.key === CART_SUMMARY_STORAGE_KEY) {
        setCartSummary(readStoredCartSummary())
      }
    }

    window.addEventListener("cart:updated", handleCartUpdated)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener("cart:updated", handleCartUpdated)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  const handleLogout = async () => {
    setIsProfileOpen(false)
    setIsMobileMenuOpen(false)
    clearCartSummary()
    await logout()
    navigate("/login")
  }

  const handleCategoryClick = (categorySlug) => {
    setIsCategoriesOpen(false)
    setIsRegionsOpen(false)
    setIsMobileMenuOpen(false)
    navigate(`/productos?category=${encodeURIComponent(categorySlug)}`)
  }

  const handleFamilyClick = (categorySlug, familySlug) => {
    setIsCategoriesOpen(false)
    setIsRegionsOpen(false)
    setIsMobileMenuOpen(false)
    navigate(`/productos?category=${encodeURIComponent(categorySlug)}&family=${encodeURIComponent(familySlug)}`)
  }

  const handleRegionClick = (regionSlug) => {
    setIsRegionsOpen(false)
    setIsCategoriesOpen(false)
    setIsMobileMenuOpen(false)
    navigate(`/regiones/${encodeURIComponent(regionSlug)}`)
  }

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen((prev) => !prev)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  if (isEditorialShop) {
    return (
      <EditorialShopHeader
        brandName={brandName}
        logoUrl={visibleLogoUrl}
        cartSummary={cartSummary}
        isAuthenticated={isAuthenticated}
        displayName={displayName}
        categories={categories}
        categoriesLoading={categoriesLoading}
        regions={regions}
        regionsLoading={regionsLoading}
        onCategoryClick={handleCategoryClick}
        onRegionClick={handleRegionClick}
        onLogout={handleLogout}
        navTitle={navTitle}
        canEditNavTitle={canEditNavTitle}
        onNavTitleSaved={(value) => updateLocalSetting("nav_title.title", value)}
        contactNumbers={Array.isArray(settings.contact_numbers) ? settings.contact_numbers.filter(Boolean) : []}
        email={settings.email}
        socialLinks={settings.social_links || {}}
      />
    )
  }

  return (
    <header className={`header header--${navVariant} header--density-${navDensity}`}>
      {showTopBar ? (
        <div className="header-announcement">
          <div className="container-main header-announcement__inner">
            {settingsLoading ? (
              <span className="header-announcement__skeleton" aria-hidden="true" />
            ) : (
              <>
                <InlineSettingEditor
                  settingKey="nav_title.title"
                  value={navTitle}
                  canEdit={canEditNavTitle}
                  onSaved={(value) => updateLocalSetting("nav_title.title", value)}
                  className="inline-setting-editor--wrap"
                  inputLabel="Editar mensaje del nav"
                  allowEmpty
                />
                <Link to="/terminos-y-condiciones">{t("details")}</Link>
              </>
            )}
          </div>
        </div>
      ) : null}
      <div className="header-top container-main">
        <div className="header-logo">
          {settingsLoading ? (
            <span className="header-logo__skeleton" aria-hidden="true" />
          ) : (
            <>
              <Link to="/" onClick={closeMobileMenu}>
                {visibleLogoUrl ? (
                  <img src={visibleLogoUrl} alt={brandName} className="logo-img" />
                ) : (
                  <span className="header-logo__text">{brandName}</span>
                )}
              </Link>
              <InlineLogoSettingEditor
                canEdit={canEditGeneralLogo}
                onPreviewChange={setLogoPreviewUrl}
                onSaved={(logo) => {
                  updateLocalSetting("general_logo", logo)
                  updateLocalSetting("logo_url", logo.logo_url)
                }}
              />
            </>
          )}
        </div>

        <div className="header-search">
          <SearchBar placeholder={t("searchPlaceholder", { brandName })} />
        </div>

        <div className="header-actions">
          {isAuthenticated ? (
            <div
              className={`header-profile-dropdown ${isProfileOpen ? "is-open" : ""}`}
              onMouseEnter={() => {
                if (window.innerWidth > 991) setIsProfileOpen(true)
              }}
              onMouseLeave={() => {
                if (window.innerWidth > 991) setIsProfileOpen(false)
              }}
            >
              <button
                type="button"
                className="header-profile-toggle"
                onClick={() => setIsProfileOpen((prev) => !prev)}
              >
                <span className="header-profile-name">{displayName || t("myAccount")}</span>
                <span className="header-profile-arrow">▾</span>
              </button>

              <div className="header-profile-menu">
                <Link
                  to="/mi-cuenta"
                  className="header-profile-header"
                  onClick={() => {
                    setIsProfileOpen(false)
                    closeMobileMenu()
                  }}
                >
                  <div className="profile-avatar">{avatarLetter}</div>

                  <div className="profile-info">
                    <span className="profile-name">{profileName}</span>
                    <span className="profile-link">{t("myAccount")} ›</span>
                  </div>
                </Link>

                <hr className="header-profile-divider" />

                <Link
                  to="/mi-cuenta/pedidos"
                  className="header-profile-item"
                  onClick={() => {
                    setIsProfileOpen(false)
                    closeMobileMenu()
                  }}
                >
                  {t("myOrders")}
                </Link>

                <hr className="header-profile-divider" />

                <Link
                  to="/listas"
                  className="header-profile-item"
                  onClick={() => {
                    setIsProfileOpen(false)
                    closeMobileMenu()
                  }}
                >
                  {t("wishlists")}
                </Link>

                <hr className="header-profile-divider" />

                <button
                  type="button"
                  className="header-profile-item header-profile-logout"
                  onClick={handleLogout}
                >
                  {t("logout")}
                </button>
              </div>
            </div>
          ) : (
            <div className="header-auth-links">
              <Link to="/login" onClick={closeMobileMenu}>{t("login")}</Link>
              <Link to="/registro" onClick={closeMobileMenu}>{t("register")}</Link>
            </div>
          )}

          <label className="header-locale" aria-label="Idioma">
            <i className="bi bi-globe2" aria-hidden="true" />
            <select value={locale} onChange={(event) => changeLocale(event.target.value)}>
              {availableLocales.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.native_name}
                </option>
              ))}
            </select>
          </label>

          <label className="header-locale header-currency" aria-label={t("currency")}>
            <i className="bi bi-currency-exchange" aria-hidden="true" />
            <select value={currency} onChange={(event) => changeCurrency(event.target.value)}>
              {availableCurrencies.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code}
                </option>
              ))}
            </select>
          </label>

          <Link to="/favoritos" className="header-icon-link" aria-label={t("favorites")} onClick={closeMobileMenu}>
            <i className="bi bi-heart" aria-hidden="true" />
          </Link>

          <Link to="/carrito" className="header-cart header-icon-link" aria-label={t("cart")} onClick={closeMobileMenu}>
            <span className="header-cart__icon-wrap">
              <i className="bi bi-bag" aria-hidden="true" />
              {cartSummary.items_count > 0 ? (
                <span className="header-cart__badge">
                  {cartSummary.items_count}
                </span>
              ) : null}
            </span>
          </Link>
        </div>

        <button
          type="button"
          className={`header-mobile-toggle ${isMobileMenuOpen ? "is-open" : ""}`}
          onClick={handleMobileMenuToggle}
          aria-label="Abrir menú"
        >
          <span className="header-mobile-toggle-line" />
          <span className="header-mobile-toggle-line" />
          <span className="header-mobile-toggle-line" />
        </button>
      </div>

      <div className={`header-nav ${isMobileMenuOpen ? "is-mobile-open" : ""}`}>
        <div className="container-main header-nav-inner">
          <div className="header-links">
            <div
              className={`header-dropdown ${isCategoriesOpen ? "is-open" : ""}`}
              onMouseEnter={() => {
                if (window.innerWidth > 991) setIsCategoriesOpen(true)
              }}
              onMouseLeave={() => {
                if (window.innerWidth > 991) setIsCategoriesOpen(false)
              }}
            >
              <button
                type="button"
                className="header-dropdown-toggle"
                onClick={() => setIsCategoriesOpen((prev) => !prev)}
              >
                <span className="header-dropdown-label">{t("categories")}</span>
                <span className="header-dropdown-arrow">▾</span>
              </button>

              <div className="header-dropdown-menu header-categories-mega">
                {categoriesLoading ? (
                  <div className="dropdown-item">{t("loadingCategories")}</div>
                ) : categories.length > 0 ? (
                  categories.map((cat) => (
                    <div className="header-categories-mega__column" key={cat.id || cat.slug}>
                      <button
                        type="button"
                        className="header-categories-mega__title"
                        onClick={() => handleCategoryClick(cat.slug)}
                      >
                        <span>{cat.name}</span>
                        {Array.isArray(cat.families) && cat.families.length > 0 ? (
                          <i className="bi bi-chevron-right" aria-hidden="true" />
                        ) : null}
                      </button>

                      {Array.isArray(cat.families) && cat.families.length > 0 ? (
                        <div className="header-categories-mega__families">
                          {cat.families.map((family) => (
                            <button
                              key={family.id || family.slug}
                              type="button"
                              className="header-categories-mega__family"
                              onClick={() => handleFamilyClick(cat.slug, family.slug)}
                            >
                              <span>{family.name}</span>
                              {Number(family.count || 0) > 0 ? <small>({family.count})</small> : null}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="dropdown-item">{t("noCategories")}</div>
                )}
              </div>
            </div>

            <Link to="/productos" onClick={closeMobileMenu}>
              {t("products")}
            </Link>

            <Link to="/ofertas" onClick={closeMobileMenu}>
              {t("offers")}
            </Link>

            <Link to="/contacto" onClick={closeMobileMenu}>
              {t("contact")}
            </Link>

            <RegionsDropdown
              isOpen={isRegionsOpen}
              regions={regions}
              loading={regionsLoading}
              t={t}
              onOpenChange={setIsRegionsOpen}
              onRegionClick={handleRegionClick}
            />

          </div>

          <div className="header-user">
            <label className="header-locale header-locale--mobile" aria-label="Idioma">
              <i className="bi bi-globe2" aria-hidden="true" />
              <select value={locale} onChange={(event) => changeLocale(event.target.value)}>
                {availableLocales.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.native_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="header-locale header-locale--mobile header-currency" aria-label={t("currency")}>
              <i className="bi bi-currency-exchange" aria-hidden="true" />
              <select value={currency} onChange={(event) => changeCurrency(event.target.value)}>
                {availableCurrencies.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code}
                  </option>
                ))}
              </select>
            </label>

            {isAuthenticated ? (
              <div
                className={`header-profile-dropdown ${isProfileOpen ? "is-open" : ""}`}
                onMouseEnter={() => {
                  if (window.innerWidth > 991) setIsProfileOpen(true)
                }}
                onMouseLeave={() => {
                  if (window.innerWidth > 991) setIsProfileOpen(false)
                }}
              >
                <button
                  type="button"
                  className="header-profile-toggle"
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                >
                  <div className="header-profile-text">
                    <span className="header-profile-name">{displayName}</span>
                    <span className="header-profile-subtitle">{t("myAccount")}</span>
                  </div>
                  <span className="header-profile-arrow">▾</span>
                </button>

                <div className="header-profile-menu">
                  <Link
                    to="/mi-cuenta"
                    className="header-profile-header"
                    onClick={() => {
                      setIsProfileOpen(false)
                      closeMobileMenu()
                    }}
                  >
                    <div className="profile-avatar">{avatarLetter}</div>

                    <div className="profile-info">
                      <span className="profile-name">{profileName}</span>
                      <span className="profile-link">{t("myAccount")} ›</span>
                    </div>
                  </Link>

                  <hr className="header-profile-divider" />

                  <Link
                  to="/mi-cuenta/pedidos"
                    className="header-profile-item"
                    onClick={() => {
                      setIsProfileOpen(false)
                      closeMobileMenu()
                    }}
                  >
                    {t("myOrders")}
                  </Link>

                  <hr className="header-profile-divider" />

                  <Link
                    to="/listas"
                    className="header-profile-item"
                    onClick={() => {
                      setIsProfileOpen(false)
                      closeMobileMenu()
                    }}
                  >
                    {t("wishlists")}
                  </Link>

                  <hr className="header-profile-divider" />

                  <button
                    type="button"
                    className="header-profile-item header-profile-logout"
                    onClick={handleLogout}
                  >
                    {t("logout")}
                  </button>
                </div>
              </div>
            ) : null}

            {isAuthenticated ? (
              <Link to="/favoritos" onClick={closeMobileMenu}>
                {t("favorites")}
              </Link>
            ) : null}

            <Link to="/contacto" onClick={closeMobileMenu}>
              {t("contact")}
            </Link>

            <div className="header-mobile-region-list">
              <span>{t("regions")}</span>
              {regionsLoading ? (
                <small>{t("loading")}</small>
              ) : regions.length ? (
                regions.map((region) => (
                  <button key={region.id || region.slug} type="button" onClick={() => handleRegionClick(region.slug)}>
                    {region.name}
                  </button>
                ))
              ) : (
                <small>{t("noRegions")}</small>
              )}
            </div>

            {!isAuthenticated ? (
              <Link to="/login" onClick={closeMobileMenu}>
                {t("login")}
              </Link>
            ) : null}

            {!isAuthenticated ? (
              <Link to="/registro" onClick={closeMobileMenu}>
                {t("register")}
              </Link>
            ) : null}

            {isAuthenticated ? (
              <Link to="/carrito" className="header-cart" onClick={closeMobileMenu}>
                <span className="header-cart__icon-wrap">
                  <svg
                    className="header-cart__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 4H5L7.2 14.2C7.3 14.7 7.7 15 8.2 15H17.4C17.9 15 18.3 14.7 18.4 14.2L20 7H6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="9" cy="19" r="1.6" fill="currentColor" />
                    <circle cx="17" cy="19" r="1.6" fill="currentColor" />
                  </svg>

                  {cartSummary.items_count > 0 ? (
                    <span className="header-cart__badge">
                      {cartSummary.items_count}
                    </span>                    
                  ) : null}                  
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header

function EditorialShopHeader({
  brandName,
  logoUrl,
  cartSummary,
  isAuthenticated,
  displayName,
  categories,
  categoriesLoading,
  regions,
  regionsLoading,
  onCategoryClick,
  onRegionClick,
  onLogout,
  navTitle,
  canEditNavTitle,
  onNavTitleSaved,
  contactNumbers,
  email,
  socialLinks,
}) {
  const { locale, availableLocales, changeLocale, t } = useLocalization()
  const { currency, availableCurrencies, changeCurrency } = useCurrency()
  const [searchOpen, setSearchOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [regionsOpen, setRegionsOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const categoryColumns = chunkItems(categories, 5)
  const closeEditorialMenu = () => {
    setMobileMenuOpen(false)
    setCategoriesOpen(false)
    setRegionsOpen(false)
    setAdminOpen(false)
  }

  return (
    <>
      <header className={`editorial-nav ${mobileMenuOpen ? "is-mobile-open" : ""}`}>
        <div className="editorial-nav__announcement">
          <span>{buildEditorialContactText(contactNumbers, email)}</span>
          <span className="editorial-nav__announcement-socials">
            {socialLinks?.facebook ? (
              <a href={socialLinks.facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
                <i className="bi bi-facebook" />
              </a>
            ) : null}
            {socialLinks?.instagram ? (
              <a href={socialLinks.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                <i className="bi bi-instagram" />
              </a>
            ) : null}
            {socialLinks?.tiktok ? (
              <a href={socialLinks.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok">
                <i className="bi bi-tiktok" />
              </a>
            ) : null}
          </span>
        </div>

        <div className="editorial-nav__social">
          <span><i className="bi bi-instagram" /> 100k Followers</span>
          <span><i className="bi bi-facebook" /> 300k Followers</span>
          <div className="editorial-nav__tagline">
            <InlineSettingEditor
              settingKey="nav_title.title"
              value={navTitle}
              canEdit={canEditNavTitle}
              onSaved={onNavTitleSaved}
              className="inline-setting-editor--wrap"
              inputLabel="Editar mensaje del nav"
              allowEmpty
            />
          </div>
        </div>

        <div className="editorial-nav__main">
          <button
            type="button"
            className={`editorial-nav__mobile-toggle ${mobileMenuOpen ? "is-open" : ""}`}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Abrir menú"
          >
            <span />
            <span />
            <span />
          </button>

          <nav className="editorial-nav__links">
            <Link to="/" onClick={closeEditorialMenu}>Inicio</Link>
            <div
              className={`editorial-nav__dropdown ${categoriesOpen ? "is-open" : ""}`}
              onMouseEnter={() => setCategoriesOpen(true)}
              onMouseLeave={() => setCategoriesOpen(false)}
            >
              <button
                type="button"
                className="editorial-nav__dropdown-toggle"
                onClick={() => setCategoriesOpen((prev) => !prev)}
              >
                <span>{t("categories")}</span>
                <i className="bi bi-chevron-down" aria-hidden="true" />
              </button>
              <div className="editorial-nav__dropdown-menu editorial-nav__dropdown-menu--mega">
                {categoriesLoading ? (
                  <span>{t("loadingCategories")}</span>
                ) : categories.length ? (
                  categoryColumns.map((column, columnIndex) => (
                    <div className="editorial-nav__mega-column" key={`category-column-${columnIndex}`}>
                      {column.map((category) => (
                        <button
                          key={category.id || category.slug}
                          type="button"
                          onClick={() => {
                            closeEditorialMenu()
                            onCategoryClick(category.slug)
                          }}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  ))
                ) : (
                  <span>{t("noCategories")}</span>
                )}
              </div>
            </div>
            <Link to="/productos" onClick={closeEditorialMenu}>{t("products")}</Link>
            <Link to="/ofertas" onClick={closeEditorialMenu}>{t("offers")}</Link>
            <div
              className={`editorial-nav__dropdown ${regionsOpen ? "is-open" : ""}`}
              onMouseEnter={() => setRegionsOpen(true)}
              onMouseLeave={() => setRegionsOpen(false)}
            >
              <button
                type="button"
                className="editorial-nav__dropdown-toggle editorial-nav__dropdown-toggle--pill"
                onClick={() => setRegionsOpen((prev) => !prev)}
              >
                <span>{t("regions")}</span>
                <i className="bi bi-chevron-down" aria-hidden="true" />
              </button>
              <div className="editorial-nav__dropdown-menu editorial-nav__dropdown-menu--regions">
                <RegionsDropdownContent
                  regions={regions}
                  loading={regionsLoading}
                  t={t}
                  onRegionClick={(slug) => {
                    closeEditorialMenu()
                    onRegionClick(slug)
                  }}
                />
              </div>
            </div>
            {isAuthenticated ? (
              <div
                className={`editorial-nav__dropdown ${adminOpen ? "is-open" : ""}`}
                onMouseEnter={() => setAdminOpen(true)}
              onMouseLeave={() => setAdminOpen(false)}
            >
                <button
                  type="button"
                  className="editorial-nav__dropdown-toggle"
                  onClick={() => setAdminOpen((prev) => !prev)}
                >
                  <span>{displayName || t("myAccount")}</span>
                  <i className="bi bi-chevron-down" aria-hidden="true" />
                </button>
                <div className="editorial-nav__dropdown-menu editorial-nav__dropdown-menu--simple editorial-nav__user-menu">
                  <Link
                    to="/mi-cuenta"
                    onClick={closeEditorialMenu}
                  >
                    {t("myAccount")}
                  </Link>
                  <Link to="/listas" onClick={closeEditorialMenu}>{t("wishlists")}</Link>
                  <Link to="/mi-cuenta/pedidos" onClick={closeEditorialMenu}>{t("myOrders")}</Link>
                  <button
                    type="button"
                    className="editorial-nav__logout"
                    onClick={() => {
                      closeEditorialMenu()
                      onLogout()
                    }}
                  >
                    {t("logout")}
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" onClick={closeEditorialMenu}>{t("login")}</Link>
            )}
          </nav>

          <Link to="/" className="editorial-nav__logo">
            {logoUrl ? <img src={logoUrl} alt={brandName} /> : <span>{brandName}</span>}
          </Link>

          <div className="editorial-nav__actions">
            <label className="editorial-nav__locale" aria-label="Idioma">
              <i className="bi bi-globe2" aria-hidden="true" />
              <select value={locale} onChange={(event) => changeLocale(event.target.value)}>
                {availableLocales.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.native_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="editorial-nav__locale editorial-nav__currency" aria-label={t("currency")}>
              <i className="bi bi-currency-exchange" aria-hidden="true" />
              <select value={currency} onChange={(event) => changeCurrency(event.target.value)}>
                {availableCurrencies.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => setSearchOpen(true)} aria-label={t("search")}>
              <i className="bi bi-search" />
            </button>
            <Link to="/favoritos" aria-label={t("favorites")} title={t("favorites")}>
              <i className="bi bi-heart" />
            </Link>
            <Link to="/contacto" aria-label={t("contact")} title={t("contact")}>
              <i className="bi bi-chat-dots" />
            </Link>
            <Link to="/carrito" aria-label={t("cart")} className="editorial-nav__cart">
              <i className="bi bi-bag" />
              {cartSummary.items_count > 0 ? <span>{cartSummary.items_count}</span> : null}
            </Link>
          </div>
        </div>
      </header>

      {searchOpen ? (
        <div className="editorial-search">
          <div className="editorial-search__bar">
            <Link to="/" className="editorial-search__logo" onClick={() => setSearchOpen(false)}>
              {logoUrl ? <img src={logoUrl} alt={brandName} /> : <span>{brandName}</span>}
            </Link>

            <div className="editorial-search__searchbar">
              <SearchBar
                onNavigate={() => setSearchOpen(false)}
                onSearchSubmit={(value) => {
                  setSearchOpen(false)
                  navigate(`/productos?search=${encodeURIComponent(value)}`)
                }}
              />
            </div>

            <div className="editorial-search__actions">
              <Link to={isAuthenticated ? "/mi-cuenta" : "/login"}><i className="bi bi-person" /></Link>
              <Link to="/favoritos"><i className="bi bi-heart" /></Link>
              <Link to="/carrito"><i className="bi bi-bag" /></Link>
            </div>
          </div>

          <button
            type="button"
            className="editorial-search__backdrop"
            aria-label="Cerrar búsqueda"
            onClick={() => setSearchOpen(false)}
          />
        </div>
      ) : null}
    </>
  )
}

function RegionsDropdown({ isOpen, regions, loading, t, onOpenChange, onRegionClick }) {
  return (
    <div
      className={`header-dropdown header-regions ${isOpen ? "is-open" : ""}`}
      onMouseEnter={() => {
        if (window.innerWidth > 991) onOpenChange(true)
      }}
      onMouseLeave={() => {
        if (window.innerWidth > 991) onOpenChange(false)
      }}
    >
      <button
        type="button"
        className="header-dropdown-toggle"
        onClick={() => onOpenChange((prev) => !prev)}
      >
        <span className="header-dropdown-label">{t("regions")}</span>
        <span className="header-dropdown-arrow">▾</span>
      </button>

      <div className="header-dropdown-menu header-regions__menu">
        <RegionsDropdownContent regions={regions} loading={loading} t={t} onRegionClick={onRegionClick} />
      </div>
    </div>
  )
}

function RegionsDropdownContent({ regions = [], loading, t, onRegionClick }) {
  return (
    <div className="header-regions__content">
      <div className="header-regions__map" aria-hidden="true">
        <span className="header-regions__continent is-americas" />
        <span className="header-regions__continent is-europe" />
        <span className="header-regions__continent is-africa" />
        <span className="header-regions__continent is-asia" />
        <span className="header-regions__continent is-oceania" />
      </div>

      <div className="header-regions__list">
        {loading ? (
          <span className="header-regions__empty">{t("loading")}</span>
        ) : regions.length ? (
          regions.map((region) => (
            <button
              key={region.id || region.slug}
              type="button"
              onClick={() => onRegionClick(region.slug)}
            >
              <span>{region.name}</span>
              {Number(region.products_count || 0) > 0 ? <small>{region.products_count}</small> : null}
            </button>
          ))
        ) : (
          <span className="header-regions__empty">{t("noRegions")}</span>
        )}
      </div>
    </div>
  )
}

function hasModule(modules = [], moduleName) {
  return Array.isArray(modules) && modules.some((module) => {
    if (typeof module === "string") return module === moduleName
    return module?.name === moduleName || module?.module === moduleName
  })
}

function chunkItems(items = [], size = 5) {
  const chunks = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function buildEditorialContactText(contactNumbers = [], email = "") {
  const phone = contactNumbers[0] || ""
  const mail = email || ""

  if (phone && mail) return `${phone} | ${mail}`
  return phone || mail || "Contáctanos"
}

function normalizeTaxBreakdown(taxBreakdown) {
  const items = Array.isArray(taxBreakdown?.items) ? taxBreakdown.items : []

  return {
    total: Number(taxBreakdown?.total ?? 0),
    items: items.filter(Boolean).map((item) => ({
      cart_item_id: item.cart_item_id ?? item.id ?? null,
      product_id: item.product_id ?? null,
      taxable_base: Number(item.taxable_base ?? 0),
      tax_amount: Number(item.tax_amount ?? item.tax ?? 0),
      taxes: Array.isArray(item.taxes)
        ? item.taxes.filter(Boolean).map((tax) => ({
            impuesto_art_id: tax.impuesto_art_id ?? null,
            impuesto_id: tax.impuesto_id ?? null,
            nombre: tax.nombre ?? "",
            pctje_impuesto: Number(tax.pctje_impuesto ?? 0),
            importe: Number(tax.importe ?? 0),
          }))
        : [],
    })),
  }
}
