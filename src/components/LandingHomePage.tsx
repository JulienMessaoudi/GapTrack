import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Ear,
  Eye,
  FileText,
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

type LandingPageView = "plateforme" | "apropos";
type SubscriptionPlan = "free" | "premium";

const PREMIUM_CONTACT_EMAIL = "julien.messaoudi@edu.esiee.fr";

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

export function LandingHomePage({
  onAccess,
  initialPage = "plateforme",
  onNavigate,
}: {
  onAccess: (plan?: SubscriptionPlan) => void;
  initialPage?: LandingPageView;
  onNavigate?: (page: LandingPageView) => void;
}) {
  const [page, setPage] = useState<LandingPageView>(initialPage);

  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);

  const openPage = (next: LandingPageView) => {
    setPage(next);
    onNavigate?.(next);

    window.setTimeout(() => {
      document.getElementById("top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const openOffers = () => {
    if (page !== "plateforme") {
      setPage("plateforme");
      onNavigate?.("plateforme");
    }

    window.setTimeout(() => {
      document.getElementById("gth-pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const openFaq = () => {
    if (page !== "plateforme") {
      setPage("plateforme");
      onNavigate?.("plateforme");
    }

    window.setTimeout(() => {
      document.getElementById("faq")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <main className="gth-page">
      <div className="gth-grid-bg" />
      <header className="gth-header">
        <a
          className="gth-logo gth-logo-button"
          href="/"
          onClick={(event) => handleSeoLinkClick(event, () => openPage("plateforme"))}
          aria-label="GapTrack accueil"
        >
          <ShieldCheck className="gth-logo-icon" />
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

      {page === "apropos" ? <AboutPage /> : <HomePage onAccess={onAccess} openPage={openPage} />}

      <footer className="gth-signature" aria-label="Crédits">
        Conçu et développé par Julien Messaoudi
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
  return (
    <>
      <section className="gth-hero" id="top">
        <div className="gth-hero-copy">
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

        <DashboardMock />
      </section>

      <section className="gth-features-section" id="gth-features">
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
    <section className="gth-pricing-section" id="gth-pricing" aria-label="Offres GapTrack Free et Premium">
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
          <article key={plan.key} className={`gth-price-card${plan.highlighted ? " gth-price-card-premium" : ""}`}>
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
  const faqs = [
    {
      question: "À quoi sert GapTrack ?",
      answer: "GapTrack est un logiciel d’audit GRC/SSI qui aide à centraliser les audits, les preuves, les écarts, les plans d’action et les indicateurs de conformité dans un espace sécurisé.",
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
    {
      question: "Les preuves d’audit sont-elles traçables ?",
      answer: "Oui. GapTrack est conçu pour associer les preuves aux contrôles, suivre leur état, conserver le contexte et faciliter la validation ou le refus des éléments fournis selon l’organisation.",
    },
  ];

  return (
    <section className="gth-faq-section" id="faq" aria-labelledby="gth-faq-title">
      <div className="gth-faq-heading">
        <div className="gth-kicker">
          <Lightbulb aria-hidden="true" />
          FAQ AUDIT GRC/SSI
        </div>
        <h2 id="gth-faq-title">Questions fréquentes sur GapTrack</h2>
        <p>Des réponses claires pour comprendre comment GapTrack accompagne les audits GRC/SSI, la gestion des preuves, le suivi des écarts et la conformité.</p>
      </div>

      <div className="gth-faq-grid">
        {faqs.map((faq) => (
          <article className="gth-faq-card" key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <section className="gth-about" id="top">
      <div className="gth-about-hero">
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
            GapTrack vise à aider les équipes GRC/SSI à centraliser leurs audits, leurs preuves, leurs écarts et leurs plans d’action dans un outil simple, fiable et sécurisé.
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

      <div className="gth-about-section" id="gth-about-values">
        <h2>Ce qui anime<br />le projet</h2>
        <div className="gth-about-cards three">
          <AboutValue icon={<Lightbulb />} title="Clarté" text="GapTrack rend la conformité plus lisible et actionnable pour les équipes." tone="blue" />
          <AboutValue icon={<ShieldCheck />} title="Fiabilité" text="Les audits sont structurés avec méthode, traçabilité et rigueur." tone="purple" />
          <AboutValue icon={<Star />} title="Exigence" text="Le projet cherche à concilier simplicité, sécurité et qualité d’exécution." tone="teal" />
        </div>
      </div>

      <div className="gth-about-section gth-about-approach">
        <h2>Approche</h2>
        <div className="gth-about-flow">
          <AboutValue icon={<Ear />} title="Comprendre" text="Partir des besoins terrain des équipes audit, risque et sécurité." tone="blue" />
          <span className="gth-flow-connector" />
          <AboutValue icon={<Grid2X2 />} title="Structurer" text="Transformer la complexité réglementaire en workflows clairs." tone="purple" />
          <span className="gth-flow-connector" />
          <AboutValue icon={<Users />} title="Accompagner" text="Aider les organisations à progresser durablement dans leur conformité." tone="teal" />
        </div>
      </div>

      <div className="gth-about-cta gth-about-cta-simple">
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
    <article className={`gth-principle gth-principle-${color}`}>
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
    <article className={`gth-about-card gth-about-card-${tone}`}>
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
    <div className="gth-benefit">
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
    <article className="gth-feature-card">
      <div className="gth-feature-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <ArrowRight className="gth-feature-arrow" aria-hidden="true" />
    </article>
  );
}

function DashboardMock() {
  return (
    <section className="gth-dashboard" aria-label="Aperçu du tableau de bord GapTrack">
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
                  <linearGradient id="gthLineFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(51, 118, 255, .42)" />
                    <stop offset="100%" stopColor="rgba(51, 118, 255, 0)" />
                  </linearGradient>
                </defs>
                {[25, 50, 75, 100].map((v) => <line key={v} x1="0" x2="420" y1={190 - v * 1.7} y2={190 - v * 1.7} />)}
                <path d="M0 170 L45 145 L90 118 L135 98 L180 70 L225 58 L270 78 L315 49 L360 35 L420 20 L420 190 L0 190 Z" />
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
