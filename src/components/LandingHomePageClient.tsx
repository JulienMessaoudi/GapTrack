import { LandingHomePage } from "./LandingHomePage";

type LandingPageView = "plateforme" | "apropos" | "securite";
type SubscriptionPlan = "free" | "premium";

export default function LandingHomePageClient({
  initialPage = "plateforme",
}: {
  initialPage?: LandingPageView;
}) {
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
    const nextPath = page === "apropos" ? "/a-propos" : page === "securite" ? "/securite" : "/";

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  };

  return (
    <LandingHomePage
      initialPage={initialPage}
      onAccess={handleAccess}
      onNavigate={handleNavigate}
    />
  );
}
