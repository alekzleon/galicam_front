// src/App.jsx
import AppRouter from './routes/AppRouter'
import { Toaster } from "sonner"
import { LoadingProvider } from "./context/LoadingContext";
import { AuthProvider } from "./context/AuthContext"
import { SettingsProvider } from "./context/SettingsContext"
import { LocalizationProvider } from "./context/LocalizationContext"
import { CurrencyProvider } from "./context/CurrencyContext"
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap-icons/font/bootstrap-icons.css"

function App() {
  return (
    <LocalizationProvider>
      <CurrencyProvider>
        <SettingsProvider>
          <LoadingProvider>
            <AuthProvider>
              <AppRouter />

              <Toaster
                position="bottom-right"
                richColors
                closeButton
                expand={false}
                duration={2600}
              />
            </AuthProvider>
          </LoadingProvider>
        </SettingsProvider>
      </CurrencyProvider>
    </LocalizationProvider>
  )
}

export default App
