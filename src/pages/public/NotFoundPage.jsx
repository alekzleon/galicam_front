import { Link } from 'react-router-dom'
import { useLocalization } from "../../context/LocalizationContext"

function NotFoundPage() {
  const { t } = useLocalization()

  return (
    <div>
      <h1>404</h1>
      <p>{t("notFoundText")}</p>
      <Link to="/">{t("backHome")}</Link>
    </div>
  )
}

export default NotFoundPage
