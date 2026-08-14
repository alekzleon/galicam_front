import { Route, Routes, Navigate } from "react-router-dom"
import ProtectedAdminRoute, { ProtectedAdminModule } from "./ProtectedAdminRoute"
import AdminLayout from "../components/AdminLayout/AdminLayout"
import DashboardPage from "../pages/DashboardPage/DashboardPage"
import SalesChannelsPage from "../pages/SalesChannelsPage/SalesChannelsPage"
import UsersPage from "../pages/UsersPage/UsersPage"
import RolesPage from "../pages/RolesPage/RolesPage"
import CustomerPage from "../pages/CustomersPage/CustomersPage"
import ProductsPage from "../pages/ProductsPage/ProductsPage"
import CategoriesPage from "../pages/CategoriesPage/CategoriesPage"
import FamiliesPage from "../pages/FamiliesPage/FamiliesPage"
import RegionsPage from "../pages/RegionsPage/RegionsPage"
import RegionDetailPage from "../pages/RegionsPage/RegionDetailPage"
import MarketingPage from "../pages/MarketingPage/MarketingPage"
import PromotionsPage from "../pages/PromotionsPage/PromotionsPage"
import GiftItemsPage from "../pages/PromotionsPage/GiftItemsPage"
import CouponsPage from "../pages/CouponsPage/CouponsPage"
import OrdersPage from "../pages/OrdersPage/OrdersPage"
import AdminForbiddenPage from "../pages/AdminForbiddenPage/AdminForbiddenPage"
import LogsPage from "../pages/LogsPage/LogsPage"
import SettingsPage from "../pages/SettingsPage/SettingsPage"
import CreditPage from "../pages/CreditPage/CreditPage"
import CollectionsPage from "../pages/CollectionsPage/CollectionsPage"
import SyncPage from "../pages/SyncPage/SyncPage"

function AdminRoutes({
  sessionReady,
  isAuthenticated,
  isInternal,
  currentUser,
  menu,
  onLogout,
}) {
  return (
    <Routes>
      <Route
        element={
          <ProtectedAdminRoute
            sessionReady={sessionReady}
            isAuthenticated={isAuthenticated}
            isInternal={isInternal}
          />
        }
      >
        <Route
          element={
            <AdminLayout
              currentUser={currentUser}
              menu={menu}
              onLogout={onLogout}
            />
          }
        >
          <Route path="/" element={withModule(currentUser, "dashboard", <DashboardPage />)} />
          <Route path="/sales-channels" element={withModule(currentUser, "canales_venta", <SalesChannelsPage />)} />
          <Route path="/users" element={withModule(currentUser, "usuarios", <UsersPage />)} />
          <Route path="/roles" element={withModule(currentUser, "roles", <RolesPage />)} />
          <Route path="/customers" element={withModule(currentUser, "clientes", <CustomerPage />)} />
          <Route
            path="/products"
            element={withModule(currentUser, ["productos", "carga_masiva_productos", "variantes"], <ProductsPage />)}
          />
          <Route path="/catalog/categories" element={withModule(currentUser, "categorias", <CategoriesPage />)} />
          <Route path="/catalog/families" element={withModule(currentUser, "familias", <FamiliesPage />)} />
          <Route
            path="/catalog/regions"
            element={withModule(currentUser, ["regiones", "regions", "region", "categorias", "familias", "productos"], <RegionsPage />)}
          />
          <Route
            path="/catalog/regions/:regionId"
            element={withModule(currentUser, ["regiones", "regions", "region", "categorias", "familias", "productos"], <RegionDetailPage />)}
          />
          <Route path="/orders" element={withModule(currentUser, ["pedidos", "carritos"], <OrdersPage />)} />
          <Route path="/credit" element={withModule(currentUser, "credito", <CreditPage />)} />
          <Route path="/collections" element={withModule(currentUser, "cobranza", <CollectionsPage />)} />
          <Route path="/marketing" element={withModule(currentUser, ["marketing", "banners"], <MarketingPage />)} />
          <Route path="/banners" element={withModule(currentUser, "banners", <MarketingPage />)} />
          <Route path="/promotions" element={withModule(currentUser, "promociones", <PromotionsPage />)} />
          <Route path="/promotions/gift-items" element={withModule(currentUser, "promociones", <GiftItemsPage />)} />
          <Route path="/coupons" element={withModule(currentUser, "cupones", <CouponsPage />)} />
          <Route path="/logs" element={withModule(currentUser, "logs", <LogsPage />)} />
          <Route path="/sync" element={withModule(currentUser, "sincronizacion", <SyncPage />)} />
          <Route path="/settings" element={withModule(currentUser, "configuracion_ecommerce", <SettingsPage />)} />
          <Route path="/forbidden" element={<AdminForbiddenPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

function withModule(user, module, element) {
  return (
    <ProtectedAdminModule user={user} module={module}>
      {element}
    </ProtectedAdminModule>
  )
}

export default AdminRoutes
