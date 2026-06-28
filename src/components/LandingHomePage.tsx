import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Ear,
  Eye,
  FileText,
  Lock,
  Grid2X2,
  Layers,
  Lightbulb,
  ListTodo,
  Mail,
  Settings,
  Shield,
  ShieldCheck,
  Star,
  Target,
  Users,
} from "lucide-react";
import "./LandingHomePage.css";

type LandingPageView = "plateforme" | "apropos" | "securite" | "confidentialite" | "mentions-legales";
type SubscriptionPlan = "free" | "premium";

const PREMIUM_CONTACT_EMAIL = "julien.messaoudi@edu.esiee.fr";
const SITE_URL = "https://gaptrack-ssi.vercel.app";

function buildPremiumRequestMailto(source: string): string {
  const subject = "Demande d’activation Premium GapTrack";
  const body = [
    "Bonjour Julien,",
    "",
    "Je souhaite être recontacté pour activer GapTrack Premium.",
    "E-mail à activer : ",
    "Nom : ",
    "Organisation : ",
    "Besoin principal : audits illimités / exports PDF-CSV / preuves cloud / validation des preuves / utilisateurs et rôles / modèles personnalisés / autre",
    "Contexte ou délai souhaité : ",
    `Origine : ${source}`,
    "",
    "J’ai compris que je peux commencer en Free en attendant l’activation Premium, sans perdre les données déjà saisies.",
    "",
    "Merci.",
  ].join("\n");

  return `mailto:${PREMIUM_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function handleSeoLinkClick(event: React.MouseEvent<HTMLAnchorElement>, action: () => void): void {
  // Let the browser keep native link behaviours such as open in a new tab,
  // copy link address, or download/search-engine discovery through href.
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();
  action();
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollToLandingSection(id: string, delay = 0): void {
  window.setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  }, delay);
}

function getInitialMediaQueryMatch(query: string): boolean {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => getInitialMediaQueryMatch(query));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, [query]);

  return matches;
}

function landingPageFromPathname(pathname: string): LandingPageView | null {
  const path = String(pathname || "/").replace(/\/+$/, "") || "/";

  if (path === "/") return "plateforme";
  if (path === "/a-propos") return "apropos";
  if (path === "/securite") return "securite";
  if (path === "/confidentialite") return "confidentialite";
  if (path === "/mentions-legales") return "mentions-legales";

  return null;
}

function landingPageFromCurrentLocation(fallback: LandingPageView): LandingPageView {
  if (typeof window === "undefined") return fallback;
  return landingPageFromPathname(window.location.pathname) || fallback;
}

const GAPTRACK_FAQS = [
  {
    question: "À quoi sert GapTrack ?",
    answer: "GapTrack est un logiciel d’audit SSI qui aide à centraliser les audits, les preuves, les écarts, les plans d’action et les indicateurs de conformité dans un espace sécurisé.",
  },
  {
    question: "GapTrack peut-il aider pour ISO 27001, NIS2, DORA, RGPD ou PGSSI-S ?",
    answer: "Oui. GapTrack permet de structurer le suivi de conformité autour de référentiels comme ISO 27001, NIS2, DORA, RGPD ou PGSSI-S, avec des preuves, statuts, responsables et actions correctives associés à chaque contrôle.",
  },
  {
    question: "Quelle est la différence entre GapTrack Free et GapTrack Premium ?",
    answer: "Free permet de démarrer avec un audit et un utilisateur. Premium ajoute les audits illimités, les exports PDF et CSV, les utilisateurs et rôles avancés, le stockage cloud sécurisé, la validation des preuves et les modèles personnalisés.",
  },
  {
    question: "Comment GapTrack aide-t-il à suivre les écarts de conformité ?",
    answer: "La plateforme permet d’identifier les écarts, de les prioriser, de suivre leur statut et de rattacher des plans d’action afin de piloter la remédiation dans le temps.",
  },
];


function useAppleLikeLandingEffects(activePage: LandingPageView): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.querySelector<HTMLElement>(".gth-page");
    if (!root) return;

    const reducedMotion = prefersReducedMotion();
    const revealElements = Array.from(root.querySelectorAll<HTMLElement>(".gth-reveal"));

    if (reducedMotion || typeof IntersectionObserver === "undefined") {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        root,
        threshold: 0.14,
        rootMargin: "0px 0px -80px 0px",
      }
    );

    revealElements.forEach((element, index) => {
      element.style.setProperty("--gth-reveal-delay", `${Math.min(index * 38, 260)}ms`);
      observer.observe(element);
    });

    const updateScrollProgress = () => {
      const maxScroll = Math.max(1, root.scrollHeight - root.clientHeight);
      const pageProgress = root.scrollTop / maxScroll;
      root.style.setProperty("--gth-page-scroll", pageProgress.toFixed(4));

      const story = root.querySelector<HTMLElement>(".gth-scroll-story");
      if (!story) return;

      const storyMax = Math.max(1, story.offsetHeight - root.clientHeight);
      const storyProgress = Math.min(1, Math.max(0, (root.scrollTop - story.offsetTop) / storyMax));
      const stepOneOpacity = Math.max(0.62, 1 - Math.max(0, storyProgress - 0.33) * 0.9);
      const stepTwoAlpha = 0.16 + storyProgress * 0.34;
      const stepThreeOffset = (storyProgress - 0.55) * 18;

      root.style.setProperty("--gth-story-progress", storyProgress.toFixed(4));
      root.style.setProperty("--gth-story-rotate-y", `${-10 + storyProgress * 8}deg`);
      root.style.setProperty("--gth-story-rotate-x", `${6 - storyProgress * 5}deg`);
      root.style.setProperty("--gth-story-translate-y", `${42 - storyProgress * 82}px`);
      root.style.setProperty("--gth-story-scale", `${0.88 + storyProgress * 0.13}`);
      root.style.setProperty("--gth-story-card-y", `${28 - storyProgress * 48}px`);
      root.style.setProperty("--gth-story-glow-opacity", `${0.25 + storyProgress * 0.55}`);
      root.style.setProperty("--gth-story-step-one-opacity", stepOneOpacity.toFixed(3));
      root.style.setProperty("--gth-story-step-two-alpha", stepTwoAlpha.toFixed(3));
      root.style.setProperty("--gth-story-step-three-x", `${stepThreeOffset}px`);
    };

    const updatePointerGlow = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      root.style.setProperty("--gth-cursor-x", `${event.clientX - rect.left}px`);
      root.style.setProperty("--gth-cursor-y", `${event.clientY - rect.top}px`);
    };

    updateScrollProgress();
    root.addEventListener("scroll", updateScrollProgress, { passive: true });
    root.addEventListener("pointermove", updatePointerGlow, { passive: true });

    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", updateScrollProgress);
      root.removeEventListener("pointermove", updatePointerGlow);
    };
  }, [activePage]);
}


function JsonLd() {
  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "GapTrack",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/`,
    description:
      "GapTrack est un logiciel d’audit SSI pour centraliser les audits, les preuves, les écarts et les plans d’action de conformité.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    publisher: {
      "@type": "Organization",
      name: "GapTrack",
      url: `${SITE_URL}/`,
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GAPTRACK_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
    </>
  );
}

export function LandingHomePage({
  onAccess,
  initialPage = "plateforme",
  onNavigate,
}: {
  onAccess: (plan?: SubscriptionPlan) => void;
  initialPage?: LandingPageView;
  onNavigate?: (page: LandingPageView) => void;
}) {
  const [page, setPage] = useState<LandingPageView>(() => landingPageFromCurrentLocation(initialPage));

  useEffect(() => {
    setPage(landingPageFromCurrentLocation(initialPage));
  }, [initialPage]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromPath = () => {
      setPage(landingPageFromCurrentLocation(initialPage));
    };

    window.addEventListener("popstate", syncFromPath);
    window.addEventListener("pageshow", syncFromPath);

    return () => {
      window.removeEventListener("popstate", syncFromPath);
      window.removeEventListener("pageshow", syncFromPath);
    };
  }, [initialPage]);

  useAppleLikeLandingEffects(page);

  const openPage = (next: LandingPageView) => {
    setPage(next);
    onNavigate?.(next);

    scrollToLandingSection("top");
  };

  const openOffers = () => {
    if (page !== "plateforme") {
      setPage("plateforme");
      onNavigate?.("plateforme");
    }

    scrollToLandingSection("gth-pricing", 80);
  };

  const openFaq = () => {
    if (page !== "plateforme") {
      setPage("plateforme");
      onNavigate?.("plateforme");
    }

    scrollToLandingSection("faq", 80);
  };

  return (
    <main className="gth-page">
      <div className="gth-grid-bg" />
      <div className="gth-aurora gth-aurora-one" aria-hidden="true" />
      <div className="gth-aurora gth-aurora-two" aria-hidden="true" />
      <div className="gth-scroll-progress" aria-hidden="true" />
      <header className="gth-header gth-reveal">
        <a
          className="gth-logo gth-logo-button"
          href="/"
          onClick={(event) => handleSeoLinkClick(event, () => openPage("plateforme"))}
          aria-label="GapTrack accueil"
        >
          <img src="/icon-192.png" alt="" className="gth-logo-icon" aria-hidden="true" loading="eager" decoding="async" />
          <span>
            <strong>GapTrack</strong>
            <small>Audit SSI</small>
          </span>
        </a>

        <nav className="gth-nav" aria-label="Navigation principale">
          <a className={page === "plateforme" ? "gth-nav-active" : ""} href="/" onClick={(event) => handleSeoLinkClick(event, () => openPage("plateforme"))}>Accueil</a>
          <a href="/#gth-pricing" onClick={(event) => handleSeoLinkClick(event, openOffers)}>Offres</a>
          <a href="/#faq" onClick={(event) => handleSeoLinkClick(event, openFaq)}>FAQ</a>
          <a className={page === "apropos" ? "gth-nav-active" : ""} href="/a-propos" onClick={(event) => handleSeoLinkClick(event, () => openPage("apropos"))}>À propos</a>
        </nav>

        <a className="gth-login-button" href="/login" onClick={(event) => handleSeoLinkClick(event, () => onAccess())}>
          Se connecter
          <ArrowRight aria-hidden="true" />
        </a>
      </header>

      <div key={page} className="gth-route-panel">
        {page === "confidentialite" ? <PrivacyPage /> : page === "mentions-legales" ? <LegalNoticePage /> : page === "apropos" ? <AboutPage /> : page === "securite" ? <SecurityPage /> : <HomePage onAccess={onAccess} openPage={openPage} />}
      </div>

      <footer className="gth-footer" aria-label="Pied de page GapTrack">
        <p className="gth-footer-copy">
          © Copyright GapTrack 2026 | Réalisation {" "}
          <span>Julien Messaoudi</span>
        </p>

        <nav className="gth-footer-links" aria-label="Liens légaux et contact">
          <a href="/mentions-legales" onClick={(event) => handleSeoLinkClick(event, () => openPage("mentions-legales"))}>Mentions légales</a>
          <span aria-hidden="true">—</span>
          <a href="/confidentialite" onClick={(event) => handleSeoLinkClick(event, () => openPage("confidentialite"))}>Confidentialité</a>
          <span aria-hidden="true">—</span>
          <a href="/securite" onClick={(event) => handleSeoLinkClick(event, () => openPage("securite"))}>Sécurité</a>
          <span aria-hidden="true">—</span>
          <a href={`mailto:${PREMIUM_CONTACT_EMAIL}`}>Contact</a>
        </nav>
      </footer>
    </main>
  );
}

function HomePage({
  onAccess,
  openPage,
}: {
  onAccess: (plan?: SubscriptionPlan) => void;
  openPage: (page: LandingPageView) => void;
}) {
  const isCompactViewport = useMediaQuery("(max-width: 820px)");

  return (
    <>
      <JsonLd />

      <section className="gth-hero" id="top">
        <div className="gth-hero-copy gth-reveal">
          <div className="gth-kicker">
            <ShieldCheck aria-hidden="true" />
            PLATEFORME SÉCURISÉE
          </div>

          <h1>Logiciel d’audit SSI pour centraliser <br />vos preuves, écarts <br /><span>et plans d’action</span></h1>

          <p className="gth-lead">
            Une expérience fluide pour piloter vos audits, suivre les actions et partager les preuves avec les bonnes personnes.
          </p>

          <div className="gth-benefits" aria-label="Bénéfices principaux">
            <Benefit icon={<ShieldCheck />} title="Centralisez vos audits et preuves" text="Toutes vos données au même endroit, accessibles et traçables." />
            <Benefit icon={<Target />} title="Suivez les écarts en temps réel" text="Identifiez, priorisez et résolvez plus rapidement." />
            <Benefit icon={<Users />} title="Collaborez en toute sécurité" text="Travaillez avec vos équipes et partenaires avec des accès maîtrisés." />
          </div>

          <div className="gth-hero-actions">
            <a className="gth-primary" href="/login" onClick={(event) => handleSeoLinkClick(event, () => onAccess("free"))}>
              Découvrir gratuitement
              <ArrowRight aria-hidden="true" />
            </a>
            <a className="gth-secondary" href="/a-propos" onClick={(event) => handleSeoLinkClick(event, () => openPage("apropos"))}>
              En savoir plus
            </a>
          </div>
        </div>

        {!isCompactViewport ? <DashboardMock variant="hero" gradientId="gthLineFillHero" /> : null}
        <div className="gth-scroll-cue" aria-hidden="true"><span /></div>
      </section>

      <section className="gth-features-section gth-reveal" id="gth-features">
        <h2>Une plateforme complète pour votre conformité</h2>
        <div className="gth-feature-grid">
          <Feature icon={<Layers />} title="Gestion des audits" text="Planifiez, exécutez et suivez vos audits de bout en bout." />
          <Feature icon={<FileText />} title="Gestion des écarts" text="Identifiez les écarts, évaluez leur impact et suivez leur résolution." />
          <Feature icon={<ClipboardCheck />} title="Plans d’action" text="Définissez, assignez et suivez vos actions correctives." />
          <Feature icon={<BarChart3 />} title="Reporting & KPIs" text="Visualisez vos indicateurs clés et générez des rapports." />
        </div>
      </section>

      <PricingSection
        onSelectPlan={onAccess}
        onRequestPremium={() => {
          window.location.href = buildPremiumRequestMailto("Landing page GapTrack");
        }}
      />

      <FaqSection />
    </>
  );
}


function PricingSection({ onSelectPlan, onRequestPremium }: { onSelectPlan: (plan: SubscriptionPlan) => void; onRequestPremium: () => void }) {
  const plans: Array<{
    key: SubscriptionPlan;
    label: string;
    badge: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    note?: string;
    reassurance?: string[];
    cta: string;
    highlighted?: boolean;
  }> = [
    {
      key: "free" as const,
      label: "Free",
      badge: "Pour démarrer",
      price: "0€",
      period: "/ mois",
      description: "Idéal pour tester GapTrack seul, préparer un premier audit et structurer vos preuves localement, sans engagement.",
      features: ["1 audit actif", "1 utilisateur", "Tableau de bord de base", "Preuves et notes locales", "Sans export PDF / CSV"],
      note: "Free sert à découvrir la valeur du produit ; Premium prend le relais dès qu’il faut collaborer, exporter ou tracer finement.",
      cta: "Commencer gratuitement",
    },
    {
      key: "premium" as const,
      label: "Premium",
      badge: "Le plus complet",
      price: "Sur devis",
      period: "",
      description: "Pensé pour les équipes, cabinets et organisations qui veulent collaborer, exporter, valider les preuves et industrialiser leurs audits.",
      features: ["Audits illimités", "Exports PDF / CSV", "Utilisateurs et rôles avancés", "Stockage cloud sécurisé des preuves", "Validation / refus des preuves", "Modèles personnalisés et journal d’audit"],
      note: "Demande préremplie : indiquez simplement l’adresse à activer, votre organisation et votre besoin.",
      reassurance: ["Compte Free utilisable immédiatement", "Activation Premium sans perte des données saisies", "Collaboration, exports et traçabilité débloqués après validation"],
      cta: "Être recontacté pour Premium",
      highlighted: true,
    },
  ];

  return (
    <section className="gth-pricing-section gth-reveal" id="gth-pricing" aria-label="Offres GapTrack Free et Premium">
      <div className="gth-pricing-heading">
        <div className="gth-kicker">
          <Star aria-hidden="true" />
          OFFRES GAPTRACK
        </div>
        <h2>Choisissez la version adaptée à votre usage</h2>
        <p>Commencez en Free pour tester seul sur un audit, puis demandez Premium quand vous avez besoin d’audits illimités, d’exports, de preuves cloud, de validation et de collaboration équipe.</p>
      </div>

      <div className="gth-pricing-grid">
        {plans.map((plan) => (
          <article key={plan.key} className={`gth-price-card gth-reveal${plan.highlighted ? " gth-price-card-premium" : ""}`}>
            <div className="gth-price-topline">
              <span>{plan.badge}</span>
              {plan.highlighted ? <strong>Recommandé</strong> : null}
            </div>
            <h3>{plan.label}</h3>
            <p>{plan.description}</p>
            <div className="gth-price">
              <strong>{plan.price}</strong>
              {plan.period ? <small>{plan.period}</small> : null}
            </div>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}><CheckCircle2 aria-hidden="true" />{feature}</li>
              ))}
            </ul>
            {plan.note ? <p className="gth-price-note">{plan.note}</p> : null}
            {plan.reassurance ? (
              <div className="gth-premium-reassurance" aria-label="Réassurances Premium">
                {plan.reassurance.map((item) => (
                  <span key={item}><ShieldCheck aria-hidden="true" />{item}</span>
                ))}
              </div>
            ) : null}
            <a
              className={plan.highlighted ? "gth-primary" : "gth-secondary"}
              href={plan.key === "premium" ? buildPremiumRequestMailto("Landing page GapTrack") : "/login"}
              onClick={(event) => handleSeoLinkClick(event, () => plan.key === "premium" ? onRequestPremium() : onSelectPlan(plan.key))}
            >
              {plan.cta}
              {plan.key === "premium" ? <Mail aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
            </a>
          </article>
        ))}
      </div>

      <div className="gth-pricing-reassurance">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Pas besoin d’attendre Premium pour démarrer.</strong>
          <span>Free reste le point d’entrée immédiat ; Premium s’active ensuite proprement côté serveur sur le même compte, avec vos données conservées.</span>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const faqs = GAPTRACK_FAQS;

  return (
    <section className="gth-faq-section gth-reveal" id="faq" aria-labelledby="gth-faq-title">
      <div className="gth-faq-heading">
        <div className="gth-kicker">
          <Lightbulb aria-hidden="true" />
          FAQ AUDIT SSI
        </div>
        <h2 id="gth-faq-title">Questions fréquentes sur GapTrack</h2>
        <p>Des réponses claires pour comprendre comment GapTrack accompagne les audits SSI, la gestion des preuves, le suivi des écarts et la conformité.</p>
      </div>

      <div className="gth-faq-grid">
        {faqs.map((faq) => (
          <article className="gth-faq-card gth-reveal" key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}



function PrivacyPage() {
  const privacySections = [
    {
      icon: <Users />,
      title: "Données de compte",
      text: "Nom, adresse e-mail, organisation, rôle utilisateur et formule Free ou Premium permettent de créer le compte, gérer les accès et afficher le bon niveau de service.",
    },
    {
      icon: <FileText />,
      title: "Données d’audit",
      text: "Référentiel choisi, périmètre, statuts de contrôles, commentaires, preuves et plans d’action servent uniquement à piloter les audits SSI dans l’espace GapTrack.",
    },
    {
      icon: <Eye />,
      title: "Traçabilité",
      text: "Certaines actions importantes peuvent être enregistrées afin de comprendre qui a modifié un audit, ajouté une preuve ou fait évoluer un plan d’action.",
    },
  ];

  const privacyRights = [
    "Accéder aux données liées à votre compte",
    "Demander une correction si une information est inexacte",
    "Demander la suppression de votre compte ou de certaines données",
    "Demander des précisions sur l’usage de vos données",
  ];

  return (
    <section className="gth-privacy" id="top">
      <div className="gth-privacy-hero gth-reveal">
        <div className="gth-privacy-copy">
          <div className="gth-kicker gth-privacy-kicker">
            <ShieldCheck aria-hidden="true" />
            CONFIDENTIALITÉ GAPTRACK
          </div>

          <h1>
            Vos données d’audit <br />
            restent lisibles, maîtrisées <br />
            <span>et protégées</span>
          </h1>

          <p className="gth-lead gth-privacy-lead">
            GapTrack utilise les données nécessaires au fonctionnement du service : gérer votre compte, structurer vos audits, protéger vos preuves et répondre aux demandes de modification ou de suppression.
          </p>

          <div className="gth-privacy-meta" aria-label="Informations principales de confidentialité">
            <span><CheckCircle2 aria-hidden="true" /> Données utilisées pour faire fonctionner le service</span>
            <span><CheckCircle2 aria-hidden="true" /> Pas de revente des données personnelles</span>
            <span><CheckCircle2 aria-hidden="true" /> Contact direct pour toute demande</span>
          </div>
        </div>

        <div className="gth-privacy-visual" aria-label="Résumé visuel de la confidentialité GapTrack">
          <div className="gth-privacy-orbit" aria-hidden="true" />
          <div className="gth-privacy-core">
            <ShieldCheck aria-hidden="true" />
            <strong>Contrôle des données</strong>
            <span>Compte, audits, preuves, rôles et journaux sont organisés autour de l’utilisateur ou de son organisation.</span>
          </div>
          <div className="gth-privacy-node gth-privacy-node-one">Compte</div>
          <div className="gth-privacy-node gth-privacy-node-two">Audits</div>
          <div className="gth-privacy-node gth-privacy-node-three">Preuves</div>
          <div className="gth-privacy-node gth-privacy-node-four">Droits</div>
        </div>
      </div>

      <div className="gth-privacy-section gth-reveal">
        <div>
          <h2>Ce que GapTrack peut traiter</h2>
          <p>
            GapTrack collecte uniquement les informations utiles à la création du compte, au fonctionnement de l’application et au suivi des audits SSI.
          </p>
        </div>

        <div className="gth-privacy-grid">
          {privacySections.map((section) => (
            <article className="gth-privacy-card gth-reveal" key={section.title}>
              <div className="gth-privacy-card-icon">{section.icon}</div>
              <h3>{section.title}</h3>
              <p>{section.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="gth-privacy-story gth-reveal">
        <div className="gth-privacy-sticky">
          <div className="gth-kicker gth-privacy-kicker">
            <Lock aria-hidden="true" />
            CYCLE DE VIE DES DONNÉES
          </div>
          <h2>Collecter moins, expliquer mieux, supprimer sur demande.</h2>
          <p>
            L’objectif est de rester transparent : les données servent à fournir l’espace GapTrack, sécuriser les accès, rattacher les preuves aux bons contrôles et répondre aux demandes de contact ou Premium.
          </p>
        </div>

        <div className="gth-privacy-timeline">
          <article className="gth-privacy-step gth-reveal">
            <span>01</span>
            <h3>Création du compte</h3>
            <p>Les informations de compte permettent d’identifier l’utilisateur, son organisation et son rôle dans l’application.</p>
          </article>
          <article className="gth-privacy-step gth-reveal">
            <span>02</span>
            <h3>Utilisation de l’audit</h3>
            <p>Les statuts, commentaires, preuves et plans d’action sont conservés pour permettre le suivi de conformité dans le temps.</p>
          </article>
          <article className="gth-privacy-step gth-reveal">
            <span>03</span>
            <h3>Sécurité et traçabilité</h3>
            <p>Des journaux techniques ou applicatifs peuvent être utilisés pour protéger le service et comprendre les actions importantes.</p>
          </article>
          <article className="gth-privacy-step gth-reveal">
            <span>04</span>
            <h3>Suppression ou correction</h3>
            <p>L’utilisateur peut demander l’accès, la correction ou la suppression de ses données via l’adresse de contact indiquée.</p>
          </article>
        </div>
      </div>

      <div className="gth-privacy-section gth-privacy-legal gth-reveal">
        <div>
          <h2>Politique de confidentialité</h2>
          <p>Dernière mise à jour : 2026</p>
        </div>

        <div className="gth-privacy-legal-grid">
          <article>
            <h3>Responsable du traitement</h3>
            <p>
              <strong>Julien Messaoudi</strong>
              <br />Projet GapTrack<br /><a href={`mailto:${PREMIUM_CONTACT_EMAIL}`}>{PREMIUM_CONTACT_EMAIL}</a>
            </p>
          </article>
          <article>
            <h3>Finalités</h3>
            <p>Les données sont utilisées pour gérer les comptes, permettre la connexion, centraliser les audits, rattacher les preuves aux contrôles, générer les rapports, gérer les rôles et assurer la sécurité du service.</p>
          </article>
          <article>
            <h3>Hébergement et prestataires</h3>
            <p>GapTrack peut s’appuyer sur des services techniques comme Supabase pour l’authentification, la base de données et le stockage, ainsi que Vercel pour l’hébergement de l’interface web si le site y est déployé.</p>
          </article>
          <article>
            <h3>Durée de conservation</h3>
            <p>Les données sont conservées pendant la durée nécessaire au fonctionnement du compte, au suivi des audits et au traitement des demandes. Une demande de suppression peut être envoyée à tout moment.</p>
          </article>
          <article>
            <h3>Cookies et stockage local</h3>
            <p>GapTrack peut utiliser des éléments techniques comme la session, le stockage local ou le stockage de session afin de maintenir la connexion, mémoriser certaines préférences et assurer le fonctionnement de l’application.</p>
          </article>
          <article>
            <h3>Sécurité</h3>
            <p>Les accès sont structurés par compte et par rôle. Les mots de passe ne doivent pas être stockés en clair par l’application et les preuves doivent être consultées uniquement par les personnes autorisées.</p>
          </article>
        </div>
      </div>

      <div className="gth-privacy-rights gth-reveal">
        <div>
          <div className="gth-kicker gth-privacy-kicker">
            <Mail aria-hidden="true" />
            VOS DROITS
          </div>
          <h2>Une demande ? Écrivez directement au créateur.</h2>
          <p>
            Pour exercer vos droits ou poser une question sur la confidentialité, vous pouvez contacter GapTrack par e-mail.
          </p>
          <a className="gth-primary" href={`mailto:${PREMIUM_CONTACT_EMAIL}`}>
            Contacter GapTrack
            <Mail aria-hidden="true" />
          </a>
        </div>

        <div className="gth-privacy-rights-list">
          {privacyRights.map((right) => (
            <span key={right}><CheckCircle2 aria-hidden="true" /> {right}</span>
          ))}
        </div>
      </div>

    </section>
  );
}


function LegalNoticePage() {
  const legalBlocks = [
    {
      title: "Éditeur du site",
      text: (
        <>
          Le site GapTrack, accessible à l’adresse <a href={SITE_URL}>{SITE_URL}</a>, est édité par{" "}
          <strong>Julien Messaoudi</strong>, dans le cadre du projet logiciel GapTrack.
          <br />
          Contact : <a href={`mailto:${PREMIUM_CONTACT_EMAIL}`}>{PREMIUM_CONTACT_EMAIL}</a>
        </>
      ),
    },
    {
      title: "Directeur de la publication",
      text: (
        <>
          Le directeur de la publication est <strong>Julien Messaoudi</strong>.
        </>
      ),
    },
    {
      title: "Hébergement",
      text: (
        <>
          Le site est hébergé par <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133,
          Covina, CA 91723, United States.
          <br />
          Site web : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">https://vercel.com</a>
        </>
      ),
    },
    {
      title: "Propriété intellectuelle",
      text: (
        <>
          Les textes, interfaces, éléments graphiques, logos, composants logiciels et contenus présents sur GapTrack
          sont protégés par le droit de la propriété intellectuelle. Toute reproduction ou réutilisation non autorisée
          est interdite.
        </>
      ),
    },
    {
      title: "Données personnelles",
      text: (
        <>
          GapTrack peut traiter les données nécessaires au fonctionnement du service : compte utilisateur, rôles,
          audits SSI, preuves, écarts, plans d’action et journaux d’activité. Les détails sont précisés dans la{" "}
          <a href="/confidentialite">politique de confidentialité</a>.
        </>
      ),
    },
    {
      title: "Cookies et stockage local",
      text: (
        <>
          Le site peut utiliser des éléments techniques nécessaires au fonctionnement du service, notamment pour
          l’authentification, la sécurité, la session utilisateur et certaines préférences locales.
        </>
      ),
    },
    {
      title: "Responsabilité",
      text: (
        <>
          L’éditeur s’efforce de fournir des informations fiables et à jour. L’utilisation de GapTrack ne dispense pas
          l’utilisateur de réaliser ses propres vérifications dans le cadre de ses démarches d’audit, de conformité ou de cybersécurité.
        </>
      ),
    },
    {
      title: "Droit applicable",
      text: (
        <>
          Les présentes mentions légales sont soumises au droit français.
        </>
      ),
    },
  ];

  return (
    <section className="gth-privacy" id="top">
      <div className="gth-privacy-hero gth-reveal">
        <div className="gth-privacy-copy">
          <div className="gth-kicker gth-privacy-kicker">
            <FileText aria-hidden="true" />
            MENTIONS LÉGALES
          </div>

          <h1>
            Informations légales <br />
            relatives au site <br />
            <span>GapTrack</span>
          </h1>

          <p className="gth-lead gth-privacy-lead">
            Retrouvez ici les informations permettant d’identifier l’éditeur de GapTrack, son hébergeur et ses moyens de contact, ainsi que les règles applicables en matière de propriété intellectuelle et de responsabilité.
          </p>

          <div className="gth-privacy-meta" aria-label="Résumé des mentions légales GapTrack">
            <span><CheckCircle2 aria-hidden="true" /> Éditeur identifié</span>
            <span><CheckCircle2 aria-hidden="true" /> Hébergeur indiqué</span>
            <span><CheckCircle2 aria-hidden="true" /> Contact accessible</span>
          </div>
        </div>

        <div className="gth-privacy-visual" aria-label="Résumé visuel des mentions légales">
          <div className="gth-privacy-orbit" aria-hidden="true" />
          <div className="gth-privacy-core">
            <FileText aria-hidden="true" />
            <strong>Cadre légal</strong>
            <span>Éditeur, hébergeur, contact, données personnelles et responsabilité sont centralisés sur cette page.</span>
          </div>
          <div className="gth-privacy-node gth-privacy-node-one">Éditeur</div>
          <div className="gth-privacy-node gth-privacy-node-two">Hébergeur</div>
          <div className="gth-privacy-node gth-privacy-node-three">Contact</div>
          <div className="gth-privacy-node gth-privacy-node-four">Données</div>
        </div>
      </div>

      <div className="gth-privacy-section gth-privacy-legal gth-reveal">
        <div>
          <h2>Mentions légales</h2>
          <p>Dernière mise à jour : 2026</p>
        </div>

        <div className="gth-privacy-legal-grid">
          {legalBlocks.map((block) => (
            <article key={block.title}>
              <h3>{block.title}</h3>
              <p>{block.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="gth-privacy-rights gth-reveal">
        <div>
          <div className="gth-kicker gth-privacy-kicker">
            <Mail aria-hidden="true" />
            CONTACT
          </div>
          <h2>Une question sur le site ou les mentions légales ?</h2>
          <p>
            Vous pouvez contacter l’éditeur du site à l’adresse indiquée ci-dessous.
          </p>
          <a className="gth-primary" href={`mailto:${PREMIUM_CONTACT_EMAIL}`}>
            Contacter GapTrack
            <Mail aria-hidden="true" />
          </a>
        </div>

        <div className="gth-privacy-rights-list">
          <span><ShieldCheck aria-hidden="true" /> Page accessible depuis le footer</span>
          <span><Lock aria-hidden="true" /> Informations juridiques centralisées</span>
          <span><CheckCircle2 aria-hidden="true" /> Lien vers la confidentialité</span>
        </div>
      </div>
    </section>
  );
}

function SecurityPage() {
  return (
    <section className="gth-security" id="top">
      <div className="gth-security-hero gth-reveal">
        <div className="gth-security-copy">
          <div className="gth-kicker gth-security-kicker">
            <ShieldCheck aria-hidden="true" />
            SÉCURITÉ GAPTRACK
          </div>

          <h1>
            Une plateforme pensée <br />
            pour protéger vos audits, <br />
            <span>preuves et accès</span>
          </h1>

          <p className="gth-lead gth-security-lead">
            GapTrack manipule des informations sensibles liées à la conformité SSI. La sécurité repose donc sur une authentification fiable, des accès maîtrisés, une traçabilité claire et une gestion prudente des preuves.
          </p>
        </div>

        <div className="gth-security-summary" aria-label="Résumé sécurité GapTrack">
          <div className="gth-security-score">
            <ShieldCheck aria-hidden="true" />
            <strong>Sécurité par conception</strong>
            <span>Authentification, rôles, preuves, traçabilité et confidentialité structurés dès le produit.</span>
          </div>
          <ul>
            <li><CheckCircle2 aria-hidden="true" /> Accès par compte utilisateur sécurisé</li>
            <li><CheckCircle2 aria-hidden="true" /> Rôles applicatifs pour limiter les droits</li>
            <li><CheckCircle2 aria-hidden="true" /> Preuves stockées et consultées de manière contrôlée</li>
            <li><CheckCircle2 aria-hidden="true" /> Journal d’audit pour suivre les actions sensibles</li>
          </ul>
        </div>
      </div>

      <div className="gth-security-section gth-reveal">
        <h2>Mesures de sécurité principales</h2>
        <div className="gth-security-grid">
          <SecurityCard
            icon={<Lock />}
            title="Authentification sécurisée"
            text="Les comptes GapTrack utilisent une authentification dédiée. Les mots de passe doivent respecter une longueur minimale et une complexité renforcée."
          />
          <SecurityCard
            icon={<Users />}
            title="Gestion des rôles"
            text="Les droits sont séparés selon les profils : administrateur, auditeur, contributeur ou lecteur, afin d’éviter les accès inutiles."
          />
          <SecurityCard
            icon={<FileText />}
            title="Protection des preuves"
            text="Les preuves sont rattachées aux audits et contrôles concernés. L’accès aux fichiers peut être limité et généré temporairement lorsque nécessaire."
          />
          <SecurityCard
            icon={<Eye />}
            title="Traçabilité"
            text="Les actions importantes liées aux audits, preuves, statuts et utilisateurs peuvent être historisées pour mieux comprendre ce qui a été fait."
          />
          <SecurityCard
            icon={<Shield />}
            title="Réduction des risques"
            text="Les fichiers et entrées sensibles doivent être contrôlés afin de limiter les abus, les erreurs de manipulation et les accès non autorisés."
          />
          <SecurityCard
            icon={<Settings />}
            title="Amélioration continue"
            text="GapTrack est conçu pour évoluer progressivement : sécurité applicative, confidentialité, permissions et conformité seront renforcées avec le produit."
          />
        </div>
      </div>

      <div className="gth-security-section gth-security-commitment gth-reveal">
        <div>
          <h2>Engagement de confidentialité</h2>
          <p>
            Les données saisies dans GapTrack peuvent contenir des informations sensibles sur l’organisation, les écarts de conformité, les preuves et les plans d’action. L’objectif est de limiter l’accès à ces informations aux seules personnes autorisées et de conserver une traçabilité claire des actions réalisées.
          </p>
        </div>
        <div className="gth-security-checklist">
          <span><CheckCircle2 aria-hidden="true" /> Pas de mot de passe stocké en clair</span>
          <span><CheckCircle2 aria-hidden="true" /> Accès différenciés selon les rôles</span>
          <span><CheckCircle2 aria-hidden="true" /> Données d’audit structurées par utilisateur ou organisation</span>
          <span><CheckCircle2 aria-hidden="true" /> Preuves associées à des contrôles précis</span>
        </div>
      </div>

    </section>
  );
}

function SecurityCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="gth-security-card gth-reveal">
      <div className="gth-security-card-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function AboutPage() {
  return (
    <section className="gth-about" id="top">
      <div className="gth-about-hero gth-reveal">
        <div className="gth-about-copy">
          <div className="gth-kicker gth-about-kicker">
            <Users aria-hidden="true" />
            À PROPOS DE GAPTRACK
          </div>

          <h1>
            Un projet conçu <br />
            pour simplifier l’audit <br />
            <span>et la conformité</span>
          </h1>

          <p className="gth-lead gth-about-lead">
            GapTrack vise à aider les équipes SSI à centraliser leurs audits, leurs preuves, leurs écarts et leurs plans d’action dans un outil simple, fiable et sécurisé.
          </p>

          <div className="gth-hero-actions gth-about-actions">
            <a className="gth-primary gth-about-contact-primary" href="mailto:julien.messaoudi@edu.esiee.fr">
              Contacter le créateur
              <Mail aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="gth-about-principles" aria-label="Mission, vision et engagement GapTrack">
          <Principle
            icon={<Shield />}
            title="Mission"
            text="Rendre la conformité plus simple, plus lisible et plus utile au quotidien pour les équipes."
            bullets={["Clarté opérationnelle", "Sécurité par conception"]}
            color="blue"
          />
          <Principle
            icon={<Eye />}
            title="Vision"
            text="Proposer un outil capable de transformer la conformité en levier de confiance et de progression."
            bullets={["Approche durable", "Conformité pragmatique"]}
            color="purple"
          />
          <Principle
            icon={<Users />}
            title="Engagement"
            text="Garder une approche claire, transparente et centrée sur les besoins concrets des utilisateurs."
            bullets={["Écoute et clarté", "Transparence et éthique"]}
            color="teal"
          />
        </div>
      </div>

      <div className="gth-about-section gth-reveal" id="gth-about-values">
        <h2>Ce qui anime<br />le projet</h2>
        <div className="gth-about-cards three">
          <AboutValue icon={<Lightbulb />} title="Clarté" text="GapTrack rend la conformité plus lisible et actionnable pour les équipes." tone="blue" />
          <AboutValue icon={<ShieldCheck />} title="Fiabilité" text="Les audits sont structurés avec méthode, traçabilité et rigueur." tone="purple" />
          <AboutValue icon={<Star />} title="Exigence" text="Le projet cherche à concilier simplicité, sécurité et qualité d’exécution." tone="teal" />
        </div>
      </div>

      <div className="gth-about-section gth-about-approach gth-reveal">
        <h2>Approche</h2>
        <div className="gth-about-flow">
          <AboutValue icon={<Ear />} title="Comprendre" text="Partir des besoins terrain des équipes audit, risque et sécurité." tone="blue" />
          <span className="gth-flow-connector" />
          <AboutValue icon={<Grid2X2 />} title="Structurer" text="Transformer la complexité réglementaire en workflows clairs." tone="purple" />
          <span className="gth-flow-connector" />
          <AboutValue icon={<Users />} title="Accompagner" text="Aider les organisations à progresser durablement dans leur conformité." tone="teal" />
        </div>
      </div>

      <div className="gth-about-cta gth-about-cta-simple gth-reveal">
        <div className="gth-network" aria-hidden="true" />
        <strong>Un outil pensé pour une conformité plus simple, plus fiable et plus utile.</strong>
        <div className="gth-cta-shield" aria-hidden="true"><ShieldCheck /></div>
      </div>
    </section>
  );
}

function Principle({
  icon,
  title,
  text,
  bullets,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  bullets: string[];
  color: "blue" | "purple" | "teal";
}) {
  return (
    <article className={`gth-principle gth-principle-${color} gth-reveal`}>
      <div className="gth-principle-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      <ul>
        {bullets.map((bullet) => (
          <li key={bullet}><CheckCircle2 />{bullet}</li>
        ))}
      </ul>
    </article>
  );
}

function AboutValue({ icon, title, text, tone }: { icon: React.ReactNode; title: string; text: string; tone: "blue" | "purple" | "teal" }) {
  return (
    <article className={`gth-about-card gth-about-card-${tone} gth-reveal`}>
      <div className="gth-about-card-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="gth-benefit gth-reveal">
      <span className="gth-benefit-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="gth-feature-card gth-reveal">
      <div className="gth-feature-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <ArrowRight className="gth-feature-arrow" aria-hidden="true" />
    </article>
  );
}

function DashboardMock({
  variant = "hero",
  gradientId = "gthLineFill",
}: {
  variant?: "hero" | "story";
  gradientId?: string;
}) {
  return (
    <section className={`gth-dashboard gth-dashboard-${variant} gth-reveal`} aria-label="Aperçu du tableau de bord GapTrack">
      <aside className="gth-dash-sidebar">
        <div className="gth-dash-logo"><ShieldCheck /> GapTrack</div>
        <nav>
          <span className="active"><BarChart3 /> Vue d’ensemble</span>
          <span><FileText /> Audits</span>
          <span><Target /> Écarts</span>
          <span><ListTodo /> Plans d’action</span>
          <span><ClipboardCheck /> Preuves</span>
          <span><FileText /> Rapports</span>
          <span><Settings /> Paramètres</span>
        </nav>
      </aside>

      <div className="gth-dash-main">
        <header className="gth-dash-header">
          <div>
            <h3>Vue d’ensemble</h3>
            <p>Tableau de bord</p>
          </div>
          <div className="gth-user-mini">
            <span>Bonjour, Martin Dupont<br /><small>Auditeur</small></span>
            <b>MD</b>
          </div>
        </header>

        <div className="gth-stats">
          <Stat title="Audits en cours" value="12" trend="+2 ce mois" />
          <Stat title="Écarts ouverts" value="27" trend="-5 ce mois" />
          <Stat title="Plans d’action" value="58" trend="+8 ce mois" />
          <div className="gth-stat gth-compliance">
            <p>Taux de conformité</p>
            <strong>92%</strong>
            <span>+3%</span>
            <div className="gth-ring" />
          </div>
        </div>

        <div className="gth-dash-grid">
          <div className="gth-panel gth-chart-panel">
            <h4>Évolution de la conformité</h4>
            <div className="gth-chart-area">
              <svg viewBox="0 0 420 190" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(51, 118, 255, .42)" />
                    <stop offset="100%" stopColor="rgba(51, 118, 255, 0)" />
                  </linearGradient>
                </defs>
                {[25, 50, 75, 100].map((v) => <line key={v} x1="0" x2="420" y1={190 - v * 1.7} y2={190 - v * 1.7} />)}
                <path d="M0 170 L45 145 L90 118 L135 98 L180 70 L225 58 L270 78 L315 49 L360 35 L420 20 L420 190 L0 190 Z" fill={`url(#${gradientId})`} />
                <polyline points="0,170 45,145 90,118 135,98 180,70 225,58 270,78 315,49 360,35 420,20" />
              </svg>
              <div className="gth-months"><span>Janv.</span><span>Févr.</span><span>Mars</span><span>Avr.</span><span>Mai</span><span>Juin</span><span>Juil.</span></div>
            </div>
          </div>

          <div className="gth-panel gth-donut-panel">
            <h4>Répartition des écarts</h4>
            <div className="gth-donut-content">
              <div className="gth-big-donut" />
              <ul>
                <li><i /> Résolus <strong>42</strong></li>
                <li><i /> En cours <strong>10</strong></li>
                <li><i /> En retard <strong>5</strong></li>
                <li className="total">Total <strong>57</strong></li>
              </ul>
            </div>
          </div>

          <div className="gth-panel gth-activity-panel">
            <h4>Activités récentes</h4>
            <Activity icon={<ClipboardCheck />} title="Audit ISO 27001 - Q2 2024" by="Mis à jour par Sarah Martin" status="En cours" />
            <Activity icon={<ListTodo />} title="Plan d’action - Sécurité des accès" by="Mis à jour par Thomas Bernard" status="En cours" />
            <Activity icon={<CheckCircle2 />} title="Preuve ajoutée - Politique de sauvegarde" by="Mis à jour par Julie Leroy" status="Conforme" />
          </div>

          <div className="gth-panel gth-framework-panel">
            <h4>Cadres & référentiels</h4>
            <Meter label="ISO 27001" value="85%" />
            <Meter label="NIS2" value="78%" />
            <Meter label="RGPD" value="90%" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ title, value, trend }: { title: string; value: string; trend: string }) {
  return (
    <div className="gth-stat">
      <p>{title}</p>
      <strong>{value}</strong>
      <span>{trend}</span>
    </div>
  );
}

function Activity({ icon, title, by, status }: { icon: React.ReactNode; title: string; by: string; status: string }) {
  return (
    <div className="gth-activity">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{by}</small>
      </div>
      <em>{status}</em>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: string }) {
  return (
    <div className="gth-meter">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
