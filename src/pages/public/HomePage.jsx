import HeroBanner from "../../components/home/HeroBanner/HeroBanner"
import NewProductsCarousel from "../../components/home/NewProductsCarousel/NewProductsCarousel"
import ArtisanSelection from "../../components/home/ArtisanSelection/ArtisanSelection"
import LatestPurchases from "../../components/home/LatestPurchases/LatestPurchases"
import MonthlyPromotions from "../../components/home/MonthlyPromotions/MonthlyPromotions"
import OffersSection from "../../components/home/OffersSection/OffersSection"
import "./homepage.css"

function HomePage() {
  return (
    <main className="public-home public-home--classic">
      <HeroBanner />
      <NewProductsCarousel />
      <LatestPurchases source="favorites" />
      <LatestPurchases />
      <ArtisanSelection />
      <MonthlyPromotions />
      <OffersSection />
    </main>
  )
}

export default HomePage
