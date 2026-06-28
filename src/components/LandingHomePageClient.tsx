import { useEffect, useState } from "react";
import { LandingHomePage } from "./LandingHomePage";

type LandingPageView = "plateforme" | "apropos" | "securite" | "confidentialite" | "mentions-legales";
type SubscriptionPlan = "free" | "premium";

function pageFromPathname(pathname: string): LandingPageView {
  const path = String(pathname || "/").replace(/\/+$/, "") || "/";

  if (path === "/a-propos") return "apropos";
  if (path === "/securite") return "securite";
  if (path === "/confidentialite") return "confidentialite";
  if (path === "/mentions-legales") return "mentions-legales";

  return "plateforme";
}

function pathForPage(page: LandingPageView): string {
  if (page === "apropos") return "/a-propos";
  if (page === "securite") return "/securite";
  if (page === "confidentialite") return "/confidentialite";
  if (page === "mentions-legales") return "/mentions-legales";
  return "/";
}

export default function LandingHomePageClient({
  initialPage,
}: {
  initialPage?: LandingPageView;
}) {
  const [currentPage, setCurrentPage] = useState<LandingPageView>(() => {
    if (initialPage) return initialPage;
    if (typeof window === "undefined") return "plateforme";
    return pageFromPathname(window.location.pathname);
  });

  useEffect(() => {
    if (initialPage) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromUrl = () => {
      setCurrentPage(pageFromPathname(window.location.pathname));
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    window.addEventListener("pageshow", syncFromUrl);

    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener("pageshow", syncFromUrl);
    };
  }, []);

  const handleAccess = (plan?: SubscriptionPlan) => {
    try {
      if (plan) {
        window.sessionStorage.setItem("gaptrack_selected_plan", plan);
      }
    } catch {
      // Session storage can be unavailable in some browser privacy modes.
    }

    window.location.href = "/login";
  };

  const handleNavigate = (page: LandingPageView) => {
    const nextPath = pathForPage(page);

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }

    setCurrentPage(page);
  };

  return (
    <LandingHomePage
      initialPage={currentPage}
      onAccess={handleAccess}
      onNavigate={handleNavigate}
    />
  );
}
