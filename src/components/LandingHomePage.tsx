import React, { useState } from "react";
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

type LandingPageView = "plateforme" | "ressources" | "tarifs" | "apropos";

export function LandingHomePage({ onAccess }: { onAccess: () => void }) {
  const [page, setPage] = useState<LandingPageView>("plateforme");

  const openPage = (next: LandingPageView) => {
    setPage(next);
    window.setTimeout(() => {
      document.getElementById("top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  return (
    <main className="gth-page">
      <div className="gth-grid-bg" />
      <header className="gth-header">
        <button className="gth-logo gth-logo-button" type="button" onClick={() => openPage("plateforme")} aria-label="GapTrack accueil">
          <ShieldCheck className="gth-logo-icon" />
          <span>
            <strong>GapTrack</strong>
            <small>Audit GRC/SSI</small>
          </span>
        </button>

        <nav className="gth-nav" aria-label="Navigation principale">
          <button className={page === "plateforme" ? "gth-nav-active" : ""} type="button" onClick={() => openPage("plateforme")}>Accueil</button>
          <button className={page === "apropos" ? "gth-nav-active" : ""} type="button" onClick={() => openPage("apropos")}>À propos</button>
        </nav>

        <button className="gth-login-button" type="button" onClick={onAccess}>
          Se connecter
          <ArrowRight aria-hidden="true" />
        </button>
      </header>

      {page === "apropos" ? <AboutPage /> : <HomePage page={page} onAccess={onAccess} openPage={openPage} />}
    </main>
  );
}

function HomePage({
  page,
  onAccess,
  openPage,
}: {
  page: LandingPageView;
  onAccess: () => void;
  openPage: (page: LandingPageView) => void;
}) {
  const content = {
    plateforme: {
      kicker: "PLATEFORME SÉCURISÉE",
      title: <>Centralisez vos preuves <br />et vos écarts <br /><span>dans un espace unique</span></>,
      lead: "Une expérience fluide pour piloter vos audits, suivre les actions et partager les preuves avec les bonnes personnes.",
    },
    ressources: {
      kicker: "RESSOURCES GRC/SSI",
      title: <>Accélérez vos audits <br />avec des repères <br /><span>clairs et actionnables</span></>,
      lead: "Référentiels, preuves, plans d’action et rapports sont pensés pour rendre la conformité plus lisible au quotidien.",
    },
    tarifs: {
      kicker: "TARIFS SIMPLES",
      title: <>Choisissez une offre <br />adaptée à votre <br /><span>niveau de maturité</span></>,
      lead: "Démarrez simplement, puis ajoutez des audits, des utilisateurs et des capacités avancées quand votre organisation grandit.",
    },
    apropos: {
      kicker: "À PROPOS DE GAPTRACK",
      title: <>Une équipe engagée <br />pour simplifier l’audit <br /><span>et la conformité</span></>,
      lead: "GapTrack a été conçu pour aider les équipes GRC/SSI à centraliser leurs audits, leurs preuves, leurs écarts et leurs plans d’action.",
    },
  }[page];

  return (
    <>
      <section className="gth-hero" id="top">
        <div className="gth-hero-copy">
          <div className="gth-kicker">
            <ShieldCheck aria-hidden="true" />
            {content.kicker}
          </div>

          <h1>{content.title}</h1>

          <p className="gth-lead">{content.lead}</p>

          <div className="gth-benefits" aria-label="Bénéfices principaux">
            <Benefit icon={<ShieldCheck />} title="Centralisez vos audits et preuves" text="Toutes vos données au même endroit, accessibles et traçables." />
            <Benefit icon={<Target />} title="Suivez les écarts en temps réel" text="Identifiez, priorisez et résolvez plus rapidement." />
            <Benefit icon={<Users />} title="Collaborez en toute sécurité" text="Travaillez avec vos équipes et partenaires avec des accès maîtrisés." />
          </div>

          <div className="gth-hero-actions">
            <button className="gth-primary" type="button" onClick={onAccess}>
              Découvrir la plateforme
              <ArrowRight aria-hidden="true" />
            </button>
            <button className="gth-secondary" type="button" onClick={() => openPage("apropos")}>
              En savoir plus
            </button>
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
    </>
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
            Une équipe engagée <br />
            pour simplifier l’audit <br />
            <span>et la conformité</span>
          </h1>

          <p className="gth-lead gth-about-lead">
            GapTrack a été conçu pour aider les équipes GRC/SSI à centraliser leurs audits, leurs preuves, leurs écarts et leurs plans d’action dans un outil plus simple, plus fiable et plus sécurisé.
          </p>

          <div className="gth-hero-actions gth-about-actions">
            <a className="gth-primary gth-about-contact-primary" href="mailto:contact@gaptrack.local">
              Nous contacter
              <Mail aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="gth-about-principles" aria-label="Mission, vision et engagement GapTrack">
          <Principle
            icon={<Shield />}
            title="Mission"
            text="Rendre la conformité plus simple, plus fiable et plus utile au quotidien pour les équipes."
            bullets={["Clarté opérationnelle", "Sécurité par conception"]}
            color="blue"
          />
          <Principle
            icon={<Eye />}
            title="Vision"
            text="Devenir la plateforme de référence qui transforme la conformité en levier de confiance et de performance."
            bullets={["Accompagnement durable", "Conformité pragmatique"]}
            color="purple"
          />
          <Principle
            icon={<Users />}
            title="Engagement"
            text="Placer la réussite de nos clients au cœur de tout ce que nous construisons."
            bullets={["Écoute et proximité", "Transparence et éthique"]}
            color="teal"
          />
        </div>
      </div>

      <div className="gth-about-section" id="gth-about-values">
        <h2>Ce qui nous<br />anime</h2>
        <div className="gth-about-cards three">
          <AboutValue icon={<Lightbulb />} title="Clarté" text="Nous rendons la conformité plus lisible et actionnable pour tous." tone="blue" />
          <AboutValue icon={<ShieldCheck />} title="Fiabilité" text="Nous structurons les audits avec méthode, traçabilité et rigueur." tone="purple" />
          <AboutValue icon={<Star />} title="Exigence" text="Nous allions simplicité, sécurité et qualité d’exécution." tone="teal" />
        </div>
      </div>

      <div className="gth-about-section gth-about-approach">
        <h2>Notre<br />approche</h2>
        <div className="gth-about-flow">
          <AboutValue icon={<Ear />} title="Comprendre" text="Nous écoutons les besoins terrain des équipes audit, risque et sécurité." tone="blue" />
          <span className="gth-flow-connector" />
          <AboutValue icon={<Grid2X2 />} title="Structurer" text="Nous transformons la complexité réglementaire en workflows clairs." tone="purple" />
          <span className="gth-flow-connector" />
          <AboutValue icon={<Users />} title="Accompagner" text="Nous aidons les organisations à progresser durablement dans leur conformité." tone="teal" />
        </div>
      </div>

      <div className="gth-about-cta gth-about-cta-simple">
        <div className="gth-network" aria-hidden="true" />
        <strong>Construisons une conformité plus simple, plus fiable et plus utile.</strong>
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
            <a href="#ressources">Voir tous les référentiels <ArrowRight /></a>
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
