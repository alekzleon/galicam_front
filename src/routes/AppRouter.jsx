import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import MainLayout from "../layouts/MainLayout"
import { useAuth } from "../context/AuthContext"

import HomePage from "../pages/public/HomePage"
import ContactPage from "../pages/public/ContactPage"
import RegionPage from "../pages/public/RegionPage/RegionPage"
import ProductsPage from "../pages/shop/ProductsPage"
import ProductDetailPage from "../pages/shop/ProductDetailPage"
import OffersPage from "../pages/shop/OffersPage"
import CartPage from "../pages/cart/CartPage"
import CheckoutPage from "../pages/cart/CheckoutPage"
import CheckoutResultPage from "../pages/cart/CheckoutResultPage"
import CartExcelImportPage from "../pages/cart/CartExcelImportPage"
import RecoverCartPage from "../pages/cart/RecoverCartPage"
import LoginPage from "../pages/auth/LoginPage"
import RegisterPage from "../pages/auth/RegisterPage"
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage"
import ResetPasswordPage from "../pages/auth/ResetPasswordPage"
import AccountPage from "../pages/account/AccountHomePage"
import NotFoundPage from "../pages/public/NotFoundPage"
import PrivacyPolicyPage from "../pages/legal/PrivacyPolicyPage"
import TermsPage from "../pages/legal/TermsPage"
import ScrollToTop from "../components/common/ScrollToTop/ScrollToTop"
import AccountProfilePage from "../pages/account/AccountProfilePage"
import AccountAddressesPage from "../pages/account/AccountAddressesPage"
import AccountOrdersPage from "../pages/account/AccountOrdersPage"
import FavoritesPage from "../pages/account/FavoritesPage"
import WishlistsPage from "../pages/account/WishlistsPage"

import AdminRoutes from "../admin/routes/AdminRoutes"
import { getAdminMenu } from "../admin/services/adminNavigationService"
import { useEffect, useState } from "react"
import { updateCartSalesChannel } from "../services/api/cartService"
import {
  captureSalesTrackingFromSearch,
  getSalesTrackingPayload,
} from "../utils/salesTracking"
import { can } from "../utils/adminAccess"

const HIDDEN_ADMIN_MODULES = new Set([
  "carga_masiva_productos",
  "carga_masiva",
  "bulk_import",
  "variantes",
  "variant_attributes",
  "notificaciones",
  "notifications",
  "credito",
  "credit",
  "cobranza",
  "collections",
  "logs",
  "sincronizacion",
  "sync",
  "disena_ecommerce",
  "diseña_ecommerce",
  "design",
])

const HIDDEN_ADMIN_ROUTE_NAMES = new Set([
  "admin.products.bulk-import",
  "admin.variant-attributes.index",
  "admin.notifications.index",
  "admin.credit.index",
  "admin.collections.index",
  "admin.logs.index",
  "admin.sync.index",
  "admin.design.index",
])

function AppRouter() {
  const { sessionReady, isAuthenticated, isInternal, user, token, logout } = useAuth()
  const [adminMenu, setAdminMenu] = useState([])

  useEffect(() => {
    const loadAdminMenu = async () => {
      if (!sessionReady || !isAuthenticated || !isInternal || !token) {
        setAdminMenu([])
        return
      }

      try {
        const response = await getAdminMenu(token)

        const normalizedMenu = ensureCurrencySettingsItem(
          ensureRegionsCatalogItem(
            response.menu
            .map((group) => ({
              ...group,
              group_name: normalizeAdminGroupName(group),
              items: group.items
                .filter((item) => shouldShowAdminMenuItem(item))
                .map((item) => ({
                  ...item,
                  front_path: mapAdminMenuItemToFrontPath(item),
                })),
            }))
            .filter((group) => group.items.length > 0),
            user
          ),
          user
        )

        setAdminMenu(normalizedMenu)
      } catch (error) {
        console.error("Error cargando menú admin:", error)
        setAdminMenu([])
      }
    }

    loadAdminMenu()
  }, [sessionReady, isAuthenticated, isInternal, token])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <SalesTrackingCapture />

      <Routes>
        {/* Admin */}
        <Route
          path="/admin/*"
          element={
            <AdminRoutes
              sessionReady={sessionReady}
              isAuthenticated={isAuthenticated}
              isInternal={isInternal}
              currentUser={user}
              menu={adminMenu}
              onLogout={logout}
            />
          }
        />

        {/* Layout público principal */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="productos" element={<ProductsPage />} />
          <Route path="producto/:slug" element={<ProductDetailPage />} />
          <Route path="ofertas" element={<OffersPage />} />
          <Route path="regiones/:slug" element={<RegionPage />} />
          <Route path="contacto" element={<ContactPage />} />
          <Route path="carrito" element={<CartPage />} />
          <Route path="carrito/recuperar" element={<RecoverCartPage />} />
          <Route path="carrito/excel" element={<CartExcelImportPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="checkout/success" element={<CheckoutResultPage type="success" />} />
          <Route path="checkout/cancel" element={<CheckoutResultPage type="cancel" />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="registro" element={<RegisterPage />} />
          <Route path="recuperar-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="mi-cuenta" element={<AccountPage />} />
          <Route path="mi-cuenta/datos" element={<AccountProfilePage />} />
          <Route path="mi-cuenta/direcciones" element={<AccountAddressesPage />} />
          <Route path="mi-cuenta/pedidos" element={<AccountOrdersPage />} />
          <Route path="favoritos" element={<FavoritesPage />} />
          <Route path="listas" element={<WishlistsPage />} />
          <Route path="aviso-privacidad" element={<PrivacyPolicyPage />} />
          <Route path="terminos-y-condiciones" element={<TermsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

function SalesTrackingCapture() {
  const location = useLocation()
  const { sessionReady, isAuthenticated } = useAuth()

  useEffect(() => {
    captureSalesTrackingFromSearch(location.search)
  }, [location.search])

  useEffect(() => {
    if (!sessionReady || !isAuthenticated) return

    const tracking = getSalesTrackingPayload()

    if (!Object.keys(tracking).length) return

    updateCartSalesChannel(tracking).catch((error) => {
      console.error("Error sincronizando canal de venta:", error?.response?.data || error)
    })
  }, [isAuthenticated, location.search, sessionReady])

  return null
}

function mapAdminMenuItemToFrontPath(item = {}) {
  const routeName = String(item.route_name || "").toLowerCase()
  const moduleName = String(item.name || "").toLowerCase()

  return ADMIN_ROUTE_NAME_PATHS[routeName] || ADMIN_MODULE_NAME_PATHS[moduleName] || "/admin"
}

function shouldShowAdminMenuItem(item = {}) {
  const moduleName = String(item.name || "").toLowerCase()
  const routeName = String(item.route_name || "").toLowerCase()

  return !HIDDEN_ADMIN_MODULES.has(moduleName) && !HIDDEN_ADMIN_ROUTE_NAMES.has(routeName)
}

function normalizeAdminGroupName(group = {}) {
  const groupKey = String(group.group_key || "").toLowerCase()

  if (groupKey === "catalogo" || groupKey === "catalogos") return "Catálogos"

  return group.group_name
}

function ensureRegionsCatalogItem(menu = [], user) {
  const canSeeRegions = can(user, ["regiones", "regions", "region", "categorias", "familias", "productos"])
  const hasRegions = menu.some((group) =>
    group.items?.some((item) => ["regiones", "regions", "region"].includes(String(item.name || "").toLowerCase()))
  )

  if (!canSeeRegions || hasRegions) return menu

  const regionItem = {
    id: "front-regions",
    name: "regiones",
    display_name: "Regiones",
    route_name: "admin.regions.index",
    front_path: "/admin/catalog/regions",
  }
  const catalogIndex = menu.findIndex((group) => {
    const groupKey = String(group.group_key || "").toLowerCase()
    return groupKey === "catalogo" || groupKey === "catalogos" || group.group_name === "Catálogos"
  })

  if (catalogIndex >= 0) {
    return menu.map((group, index) =>
      index === catalogIndex
        ? { ...group, items: [...group.items, regionItem] }
        : group
    )
  }

  return [
    ...menu,
    {
      group_key: "catalogo",
      group_name: "Catálogos",
      items: [regionItem],
    },
  ]
}

function ensureCurrencySettingsItem(menu = [], user) {
  const canSeeSettings = can(user, "configuracion_ecommerce")
  const hasCurrencySettings = menu.some((group) =>
    group.items?.some((item) => {
      const moduleName = String(item.name || "").toLowerCase()
      const frontPath = String(item.front_path || "").toLowerCase()
      return moduleName === "moneda" || moduleName === "currency" || frontPath.includes("section=currency")
    })
  )

  if (!canSeeSettings || hasCurrencySettings) return menu

  const currencyItem = {
    id: "front-currency-settings",
    name: "currency",
    display_name: "Moneda",
    route_name: "admin.settings.currency",
    front_path: "/admin/settings?section=currency",
  }
  const settingsIndex = menu.findIndex((group) =>
    group.items?.some((item) => ["configuracion_ecommerce", "settings"].includes(String(item.name || "").toLowerCase()))
  )

  if (settingsIndex >= 0) {
    return menu.map((group, index) =>
      index === settingsIndex
        ? { ...group, items: [...group.items, currencyItem] }
        : group
    )
  }

  return [
    ...menu,
    {
      group_key: "configuracion",
      group_name: "Configuración",
      items: [currencyItem],
    },
  ]
}

const ADMIN_ROUTE_NAME_PATHS = {
  "admin.dashboard": "/admin",
  "admin.products.index": "/admin/products",
  "admin.products.bulk-import": "/admin/products",
  "admin.variant-attributes.index": "/admin/products",
  "admin.categories.index": "/admin/catalog/categories",
  "admin.families.index": "/admin/catalog/families",
  "admin.regions.index": "/admin/catalog/regions",
  "admin.region.index": "/admin/catalog/regions",
  "admin.orders.index": "/admin/orders",
  "admin.carts.index": "/admin/orders",
  "admin.customers.index": "/admin/customers",
  "admin.sales-channels.index": "/admin/sales-channels",
  "admin.credit.index": "/admin/credit",
  "admin.collections.index": "/admin/collections",
  "admin.promotions.index": "/admin/promotions",
  "admin.coupons.index": "/admin/coupons",
  "admin.banners.index": "/admin/banners",
  "admin.marketing.index": "/admin/marketing",
  "admin.sync.index": "/admin/sync",
  "admin.settings.index": "/admin/settings",
  "admin.settings.currency": "/admin/settings?section=currency",
  "admin.notifications.index": "/admin/settings",
  "admin.users.index": "/admin/users",
  "admin.roles.index": "/admin/roles",
  "admin.logs.index": "/admin/logs",
}

const ADMIN_MODULE_NAME_PATHS = {
  dashboard: "/admin",
  sales_channels: "/admin/sales-channels",
  canales_venta: "/admin/sales-channels",
  categorias: "/admin/catalog/categories",
  categories: "/admin/catalog/categories",
  familias: "/admin/catalog/families",
  families: "/admin/catalog/families",
  regiones: "/admin/catalog/regions",
  regions: "/admin/catalog/regions",
  region: "/admin/catalog/regions",
  carga_masiva_productos: "/admin/products",
  carga_masiva: "/admin/products",
  bulk_import: "/admin/products",
  variantes: "/admin/products",
  variant_attributes: "/admin/products",
  usuarios: "/admin/users",
  users: "/admin/users",
  roles: "/admin/roles",
  productos: "/admin/products",
  products: "/admin/products",
  pedidos: "/admin/orders",
  orders: "/admin/orders",
  carritos: "/admin/orders",
  carts: "/admin/orders",
  clientes: "/admin/customers",
  customers: "/admin/customers",
  credito: "/admin/credit",
  credit: "/admin/credit",
  cobranza: "/admin/collections",
  collections: "/admin/collections",
  marketing: "/admin/marketing",
  banners: "/admin/banners",
  promociones: "/admin/promotions",
  promotions: "/admin/promotions",
  cupones: "/admin/coupons",
  coupons: "/admin/coupons",
  logs: "/admin/logs",
  sincronizacion: "/admin/sync",
  sync: "/admin/sync",
  configuracion_ecommerce: "/admin/settings",
  settings: "/admin/settings",
  moneda: "/admin/settings?section=currency",
  currency: "/admin/settings?section=currency",
  notificaciones: "/admin/settings",
  notifications: "/admin/settings",
}

export default AppRouter
