import { useEffect, useRef, useState } from "react"
import HeroBanner from "../../components/home/HeroBanner/HeroBanner"
import NewProductsCarousel from "../../components/home/NewProductsCarousel/NewProductsCarousel"
import PopularSearchesSection from "../../components/home/PopularSearchesSection/PopularSearchesSection"
import ArtisanSelection from "../../components/home/ArtisanSelection/ArtisanSelection"
import LatestPurchases from "../../components/home/LatestPurchases/LatestPurchases"
import MonthlyPromotions from "../../components/home/MonthlyPromotions/MonthlyPromotions"
import OffersSection from "../../components/home/OffersSection/OffersSection"
import { getPublicHomeSections } from "../../services/api/settingsService"
import "./homepage.css"

const INITIAL_HOME_SECTIONS = {
  status: "idle",
  data: {
    newProducts: [],
    popularSearches: {
      terms: [],
      products: [],
    },
  },
}

function HomePage() {
  const lazySectionsRef = useRef(null)
  const [homeSections, setHomeSections] = useState(INITIAL_HOME_SECTIONS)

  useEffect(() => {
    let isMounted = true
    let observer = null

    async function loadHomeSections() {
      setHomeSections((prev) => {
        if (prev.status === "loading" || prev.status === "loaded") return prev
        return { ...prev, status: "loading" }
      })

      try {
        const response = await getPublicHomeSections()
        const data = response?.data || response || {}

        if (isMounted) {
          setHomeSections({
            status: "loaded",
            data: {
              newProducts: Array.isArray(data.new_products) ? data.new_products : [],
              popularSearches: {
                terms: Array.isArray(data.popular_searches?.terms) ? data.popular_searches.terms : [],
                products: Array.isArray(data.popular_searches?.products) ? data.popular_searches.products : [],
              },
            },
          })
        }
      } catch (error) {
        console.error("Error loading home sections:", error?.response?.data || error)
        if (isMounted) {
          setHomeSections({
            ...INITIAL_HOME_SECTIONS,
            status: "error",
          })
        }
      }
    }

    const target = lazySectionsRef.current

    if (!target || typeof IntersectionObserver === "undefined") {
      loadHomeSections()
    } else {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return
          observer?.disconnect()
          loadHomeSections()
        },
        { rootMargin: "420px 0px" }
      )
      observer.observe(target)
    }

    return () => {
      isMounted = false
      observer?.disconnect()
    }
  }, [])

  const homeSectionsLoading = homeSections.status === "idle" || homeSections.status === "loading"

  return (
    <main className="public-home public-home--classic">
      <HeroBanner />
      <div ref={lazySectionsRef}>
        <NewProductsCarousel products={homeSections.data.newProducts} loading={homeSectionsLoading} />
        <PopularSearchesSection data={homeSections.data.popularSearches} loading={homeSectionsLoading} />
      </div>
      <LatestPurchases source="favorites" />
      <LatestPurchases />
      <ArtisanSelection />
      <MonthlyPromotions />
      <OffersSection />
    </main>
  )
}

export default HomePage
