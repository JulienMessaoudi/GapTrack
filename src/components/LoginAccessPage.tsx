import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Mail,
  ShieldCheck,
  Target,
  Users,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase, setRememberMe as persistRememberMe } from "../lib/supabase";
import "./LoginAccessPage.css";

type LangKey = "fr" | "en";
type ThemeMode = "light" | "dark";
type UserRole = "admin" | "auditor" | "contributor" | "viewer";

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
  createdAt: string;
  lastLoginAt?: string;
  active: boolean;
  passwordHash?: string;
}

interface NewUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organization?: string;
}

interface SupabaseAuthProfile {
  email: string;
  name?: string;
  organization?: string;
  role?: UserRole;
}

interface LoginAccessPageProps {
  mode: "setup" | "login";
  lang: LangKey;
  setLang: (l: LangKey) => void;
  theme: ThemeMode;
  setTheme: (m: ThemeMode) => void;
  users: AppUser[];
  onCreateAdmin: (payload: NewUserPayload) => Promise<void>;
  onLogin: (userId: string, password: string) => Promise<boolean>;
  onSupabaseAuthenticated?: (profile: SupabaseAuthProfile) => void;
  onBackHome?: () => void;
}

function cleanEmail(value: string): string {
  return String(value || "").trim().toLowerCase();
}

export function LoginAccessPage({
  mode,
  lang,
  onCreateAdmin,
  onSupabaseAuthenticated,
  onBackHome,
}: LoginAccessPageProps) {
  const [name, setName] = useState(lang === "fr" ? "Administrateur" : "Administrator");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [forceLogin, setForceLogin] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [confirmationPopupOpen, setConfirmationPopupOpen] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const effectiveMode = forceLogin ? "login" : mode;
  const isSetup = effectiveMode === "setup";

  function goBackToHome() {
    if (onBackHome) {
      onBackHome();
      return;
    }

    try {
      sessionStorage.setItem("gaptrack_public_screen", "home");
      window.dispatchEvent(new Event("gaptrack:show-home"));
    } catch {}

    try {
      window.location.href = window.location.origin + window.location.pathname;
    } catch {
      window.location.reload();
    }
  }

  async function handleForgotPassword() {
    const targetEmail = cleanEmail(email);

    if (!targetEmail) {
      toast.error(lang === "fr" ? "Saisissez votre adresse e-mail." : "Enter your email address.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(lang === "fr" ? "E-mail de réinitialisation envoyé." : "Password reset email sent.");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    try {
      if (isSetup) {
        if (!name.trim() || !cleanEmail(email)) {
          toast.error(lang === "fr" ? "Nom et e-mail obligatoires." : "Name and email are required.");
          return;
        }

        if (password.length < 8) {
          toast.error(lang === "fr" ? "Mot de passe : 8 caractères minimum." : "Password: at least 8 characters.");
          return;
        }

        const targetEmail = cleanEmail(email);
        persistRememberMe(true);

        const { error } = await supabase.auth.signUp({
          email: targetEmail,
          password,
          options: {
            data: {
              name: name.trim(),
              organization: organization.trim(),
              role: "admin",
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        // Sécurité produit : même si Supabase renvoie une session,
        // on ne donne pas accès à GapTrack immédiatement après l'inscription.
        // L'utilisateur doit confirmer son e-mail puis se reconnecter.
        await supabase.auth.signOut();

        setConfirmationEmail(targetEmail);
        setConfirmationPopupOpen(true);
        setForceLogin(true);
        setPassword("");
        toast.success(lang === "fr" ? "Compte créé. Vérifiez votre e-mail." : "Account created. Check your email.");
        return;
      }

      const targetEmail = cleanEmail(email);

      if (!targetEmail) {
        toast.error(lang === "fr" ? "Adresse e-mail obligatoire." : "Email is required.");
        return;
      }

      if (!password) {
        toast.error(lang === "fr" ? "Mot de passe obligatoire." : "Password is required.");
        return;
      }

      persistRememberMe(rememberMe);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      const profile = data.user?.user_metadata || {};
      onSupabaseAuthenticated?.({
        email: data.user?.email || targetEmail,
        name: typeof profile.name === "string" ? profile.name : undefined,
        organization: typeof profile.organization === "string" ? profile.organization : undefined,
        role: profile.role === "admin" || profile.role === "auditor" || profile.role === "contributor" || profile.role === "viewer" ? profile.role : undefined,
      });

      toast.success(lang === "fr" ? "Connexion réussie." : "Signed in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gaptrack-auth" data-mode={effectiveMode}>
      <div className="gt-bg-grid" />

      <button type="button" className="gt-home-tab" onClick={goBackToHome} aria-label="Retour à l’accueil">
        Accueil
      </button>
      <main className="gt-shell">
        <section className="gt-hero" aria-label="Présentation GapTrack">
          <div className="gt-brand">
            <ShieldCheck className="gt-brand-icon" aria-hidden="true" />
            <div>
              <div className="gt-brand-name">GapTrack</div>
              <div className="gt-brand-subtitle">Audit GRC/SSI</div>
            </div>
          </div>

          <h1 className="gt-title">
            Pilotez vos audits et <br />
            plans d’action <span>en toute <br />confiance</span>
          </h1>

          <p className="gt-subtitle">
            GapTrack centralise vos audits, preuves et plans d’action pour renforcer votre conformité et votre résilience.
          </p>

          <div className="gt-features">
            <FeatureCard
              icon={<Layers />}
              title="Centralisation des preuves"
              text="Tous vos documents et évidences au même endroit, accessibles et traçables."
            />
            <FeatureCard
              icon={<Target />}
              title="Suivi des écarts"
              text="Identifiez, priorisez et suivez vos écarts jusqu’à leur résolution."
            />
            <FeatureCard
              icon={<Users />}
              title="Collaboration sécurisée"
              text="Travaillez avec vos équipes et partenaires en toute sécurité, avec des accès maîtrisés."
            />
          </div>

          <DashboardPreview />
        </section>

        <section className="gt-login-card" aria-label={isSetup ? "Création du compte" : "Connexion"}>
          <div className="gt-secure-badge">
            <ShieldCheck aria-hidden="true" />
            <span>{isSetup ? "Premier accès sécurisé" : "Accès sécurisé"}</span>
          </div>

          <div className="gt-login-heading">
            <h2>{isSetup ? "Créer l’accès" : "Connexion"}</h2>
            <p>
              {isSetup
                ? "Créez le premier compte administrateur GapTrack"
                : confirmationEmail
                  ? "Confirmez votre e-mail, puis connectez-vous à votre espace GapTrack"
                  : "Accédez à votre espace GapTrack"}
            </p>
          </div>

          <form className="gt-form" onSubmit={submit}>
            {!isSetup && mode === "setup" ? (
              <div className="gt-auth-note">
                <strong>Compte en attente de confirmation</strong>
                <span>Vous pourrez accéder à GapTrack après validation du lien reçu par e-mail.</span>
              </div>
            ) : null}

            {isSetup ? (
              <>
                <Field label="Nom">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Administrateur" autoComplete="name" />
                </Field>

                <Field label="Organisation">
                  <input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="PME / Client / Cabinet" autoComplete="organization" />
                </Field>

                <Field label="Adresse e-mail" icon={<Mail />}>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="admin@entreprise.com" autoComplete="email" />
                </Field>
              </>
            ) : (
              <Field label="Adresse e-mail" icon={<Mail />}>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="admin@entreprise.com"
                  autoComplete="email"
                />
              </Field>
            )}

            <Field label="Mot de passe" icon={<Lock />} rightIcon={
              <button type="button" className="gt-eye" onClick={() => setShowPassword((value) => !value)} aria-label="Afficher ou masquer le mot de passe">
                {showPassword ? <Eye /> : <EyeOff />}
              </button>
            }>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••••••"
                autoComplete={isSetup ? "new-password" : "current-password"}
              />
            </Field>

            {!isSetup && (
              <div className="gt-form-row">
                <label className="gt-checkbox">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span aria-hidden="true" />
                  Se souvenir de moi
                </label>

                <button type="button" className="gt-link-button" onClick={handleForgotPassword}>Mot de passe oublié ?</button>
              </div>
            )}

            <button type="submit" className="gt-primary" disabled={busy}>
              {busy ? <Loader2 className="gt-spin" aria-hidden="true" /> : null}
              <span>{isSetup ? "Créer le compte" : "Se connecter"}</span>
              {!busy ? <ArrowRight aria-hidden="true" /> : null}
            </button>

            {mode === "setup" ? (
              <button
                type="button"
                className="gt-auth-switch"
                onClick={() => {
                  setForceLogin((value) => !value);
                  setPassword("");
                }}
              >
                {isSetup ? "J’ai déjà confirmé mon e-mail" : "Créer un autre compte"}
              </button>
            ) : null}
          </form>

          <div className="gt-protection">
            <div className="gt-protection-icon"><ShieldCheck aria-hidden="true" /></div>
            <div>
              <h3>Vos données sont protégées</h3>
              <p>Authentification Supabase, session protégée et accès maîtrisés pour vos audits, preuves et plans d’action.</p>
            </div>
          </div>
        </section>
      </main>

      {confirmationPopupOpen ? (
        <div className="gt-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="gt-confirm-title">
          <div className="gt-confirm-card">
            <div className="gt-confirm-icon">
              <Mail aria-hidden="true" />
            </div>
            <h3 id="gt-confirm-title">Confirmez votre adresse e-mail</h3>
            <p>
              Votre compte a bien été créé, mais vous ne pouvez pas encore accéder au contenu de GapTrack.
            </p>
            <p>
              Cliquez sur le lien envoyé à <strong>{confirmationEmail}</strong>, puis revenez vous connecter.
            </p>
            <button
              type="button"
              className="gt-primary"
              onClick={() => setConfirmationPopupOpen(false)}
            >
              J’ai compris
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  icon,
  rightIcon,
  selectField = false,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  selectField?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="gt-field">
      <span className="gt-label">{label}</span>
      <span className={`gt-control${selectField ? " gt-control-select" : ""}`}>
        {icon ? <span className="gt-control-icon">{icon}</span> : null}
        {children}
        {rightIcon ? <span className="gt-control-right">{rightIcon}</span> : null}
      </span>
    </label>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="gt-feature-card">
      <div className="gt-feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function DashboardPreview() {
  return (
    <div className="gt-dashboard" aria-hidden="true">
      <aside>
        <div className="gt-mini-logo"><ShieldCheck />GapTrack</div>
        <nav>
          <span className="active">Vue d’ensemble</span>
          <span>Audits</span>
          <span>Écarts</span>
          <span>Plans d’action</span>
          <span>Preuves</span>
          <span>Rapports</span>
          <span>Paramètres</span>
        </nav>
      </aside>

      <div className="gt-dashboard-main">
        <header>
          <div>
            <h3>Vue d’ensemble</h3>
            <p>Tableau de bord</p>
          </div>
          <span>Gap · ISO création</span>
        </header>

        <div className="gt-stats">
          <MiniStat title="Audits en cours" value="12" info="+2 ce mois" />
          <MiniStat title="Écarts ouverts" value="27" info="-5 ce mois" />
          <MiniStat title="Plans d’action" value="58" info="+8 ce mois" />
          <MiniStat title="Taux de conformité" value="92%" info="+3%" />
        </div>

        <div className="gt-charts">
          <div className="gt-chart-card gt-line-card">
            <h4>Évolution de la conformité</h4>
            <svg viewBox="0 0 360 130" preserveAspectRatio="none">
              <path d="M0 112 L35 98 L70 72 L105 66 L140 45 L175 39 L210 27 L245 34 L280 31 L315 14 L360 8 L360 130 L0 130 Z" />
              <polyline points="0,112 35,98 70,72 105,66 140,45 175,39 210,27 245,34 280,31 315,14 360,8" />
            </svg>
          </div>

          <div className="gt-chart-card gt-donut-card">
            <h4>Répartition par statut</h4>
            <div className="gt-donut" />
            <ul>
              <li><i />Résolus</li>
              <li><i />En cours</li>
              <li><i />En retard</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ title, value, info }: { title: string; value: string; info: string }) {
  return (
    <div className="gt-stat">
      <p>{title}</p>
      <strong>{value}</strong>
      <span>{info}</span>
    </div>
  );
}
