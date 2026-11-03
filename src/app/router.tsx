import { lazy } from "react"
import { createBrowserRouter, createMemoryRouter, Navigate, useParams, useSearchParams, type RouteObject } from "react-router"
import { PublicLayout } from "@/components/layout/public-layout"
import { RequireVerifiedPhone } from "@/features/auth/guards"
import HomePage from "@/features/marketing/home"
import { BuildingPage, LegalPage, NotFoundPage } from "@/features/marketing/simple-pages"

const ExplorePage = lazy(() => import("@/features/explore/explore"))
const PlacePage = lazy(() => import("@/features/explore/place-page"))
const ComparePage = lazy(() => import("@/features/explore/compare"))
const ForOwnersPage = lazy(() => import("@/features/marketing/for-owners"))
const LoginPage = lazy(() => import("@/features/auth/login"))
const JoinPage = lazy(() => import("@/features/customer/join"))
const ListYourPlace = lazy(() => import("@/features/onboarding-owner/wizard"))
const AppIndex = lazy(() => import("@/features/owner/routes").then((m) => ({ default: m.AppIndex })))
const AppPlace = lazy(() => import("@/features/owner/routes").then((m) => ({ default: m.AppPlace })))
const DemoOwner = lazy(() => import("@/features/owner/routes").then((m) => ({ default: m.DemoOwner })))
const DemoIndex = lazy(() => import("@/features/owner/routes").then((m) => ({ default: m.DemoIndex })))

function QrEntry() {
  const { slug } = useParams()
  const [sp] = useSearchParams()
  return <Navigate to={`/p/${slug}/join${sp.size ? `?${sp}` : ""}`} replace />
}
function CityPage() {
  const { city = "" } = useParams()
  return <Navigate to={`/explore?city=${encodeURIComponent(city.replace(/-/g, " "))}`} replace />
}
const guard = (el: React.ReactNode) => <RequireVerifiedPhone>{el}</RequireVerifiedPhone>

const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/explore", element: <ExplorePage /> },
      { path: "/hostels", element: <ExplorePage presetType="hostel" /> },
      { path: "/messes", element: <ExplorePage presetType="mess" /> },
      { path: "/c/:city", element: <CityPage /> },
      { path: "/p/:slug", element: <PlacePage /> },
      { path: "/p/:slug/join", element: guard(<JoinPage />) },
      { path: "/j/:slug", element: <QrEntry /> },
      { path: "/compare", element: <ComparePage /> },
      { path: "/for-owners", element: <ForOwnersPage /> },
      { path: "/demo", element: <DemoIndex /> },
      { path: "/demo/:slug/*", element: <DemoOwner /> },
      { path: "/list-your-place", element: guard(<ListYourPlace />) },
      { path: "/login", element: <LoginPage /> },
      { path: "/login/verify-phone", element: <LoginPage mode="verify" /> },
      { path: "/help", element: <LegalPage page="help" /> },
      { path: "/privacy", element: <LegalPage page="privacy" /> },
      { path: "/terms", element: <LegalPage page="terms" /> },
      { path: "/about", element: <LegalPage page="about" /> },
      { path: "/me/*", element: guard(<BuildingPage title="My places" phase="Phase 6" />) },
      { path: "/app", element: guard(<AppIndex />) },
      { path: "/app/:slug/*", element: guard(<AppPlace />) },
      { path: "/admin/*", element: guard(<BuildingPage title="Platform admin" phase="Phase 10" />) },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]

// The self-contained preview runs inside a sandboxed frame with no real URLs, so it keeps routes in memory.
export const router = import.meta.env.VITE_ARTIFACT === "1" ? createMemoryRouter(routes, { initialEntries: ["/"] }) : createBrowserRouter(routes)
