import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
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
import { authErrorMessage } from "../lib/authErrorMessages";
import "./LoginAccessPage.css";

type LangKey = "fr" | "en";
type ThemeMode = "light" | "dark";
type UserRole = "admin" | "auditor" | "contributor" | "viewer";
type SubscriptionPlan = "free" | "premium";

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
  subscriptionPlan?: SubscriptionPlan;
}

interface NewUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organization?: string;
  subscriptionPlan?: SubscriptionPlan;
}

interface SupabaseAuthProfile {
  email: string;
  name?: string;
  organization?: string;
  role?: UserRole;
  subscriptionPlan?: SubscriptionPlan;
  createdByUserId?: string;
  createdByEmail?: string;
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

function isExistingAccountError(error: { message?: string; status?: number } | null | undefined): boolean {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.status === 422 ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already") ||
    message.includes("email already")
  );
}

const PREMIUM_CONTACT_EMAIL = "julien.messaoudi@edu.esiee.fr";

function buildPremiumRequestMailto(params: { email?: string; name?: string; organization?: string; source?: string } = {}): string {
  const subject = "Demande d’activation Premium GapTrack";
  const body = [
    "Bonjour Julien,",
    "",
    "Je souhaite être recontacté pour activer GapTrack Premium.",
    params.email ? `E-mail à activer : ${params.email}` : "E-mail à activer : ",
    params.name ? `Nom : ${params.name}` : "Nom : ",
    params.organization ? `Organisation : ${params.organization}` : "Organisation : ",
    "Besoin principal : audits illimités / exports PDF-CSV / utilisateurs et rôles / autre",
    "Contexte ou délai souhaité : ",
    params.source ? `Origine : ${params.source}` : "Origine : Page d’inscription GapTrack",
    "",
    "J’ai compris que je peux créer ou utiliser mon compte Free en attendant l’activation Premium, sans perdre les données déjà saisies.",
    "",
    "Merci.",
  ].join("\n");

  return `mailto:${PREMIUM_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function normalizeSubscriptionPlan(value: unknown): SubscriptionPlan {
  return value === "premium" ? "premium" : "free";
}

function normalizeUserRole(value: unknown): UserRole | undefined {
  return value === "admin" || value === "auditor" || value === "contributor" || value === "viewer"
    ? value
    : undefined;
}

const SECURITY_MIN_PASSWORD_LENGTH = 12;
const SECURITY_MAX_PASSWORD_LENGTH = 128;

function validatePasswordStrength(
  password: string,
  context: { email?: string; name?: string; organization?: string } = {},
  lang: LangKey = "fr"
): string | null {
  const value = String(password || "");
  const lower = value.toLowerCase();
  const forbiddenFragments = [context.email, context.name, context.organization]
    .map((part) => String(part || "").trim().toLowerCase())
    .filter((part) => part.length >= 4);

  if (value.length < SECURITY_MIN_PASSWORD_LENGTH) {
    return lang === "fr" ? `Mot de passe : ${SECURITY_MIN_PASSWORD_LENGTH} caractères minimum.` : `Password: at least ${SECURITY_MIN_PASSWORD_LENGTH} characters.`;
  }
  if (value.length > SECURITY_MAX_PASSWORD_LENGTH) {
    return lang === "fr" ? `Mot de passe : ${SECURITY_MAX_PASSWORD_LENGTH} caractères maximum.` : `Password: ${SECURITY_MAX_PASSWORD_LENGTH} characters maximum.`;
  }
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return lang === "fr" ? "Le mot de passe doit contenir minuscule, majuscule, chiffre et caractère spécial." : "Password must include lowercase, uppercase, number, and special character.";
  }
  if (forbiddenFragments.some((part) => lower.includes(part))) {
    return lang === "fr" ? "Le mot de passe ne doit pas contenir votre nom, organisation ou e-mail." : "Password must not include your name, organization, or email.";
  }
  return null;
}

async function fetchGapTrackProfile(userId: string, fallbackEmail: string): Promise<SupabaseAuthProfile> {
  const { data, error } = await supabase
    .from("gaptrack_profiles")
    .select("email, name, organization, role, subscription_plan")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    email: typeof data?.email === "string" ? data.email : fallbackEmail,
    name: typeof data?.name === "string" ? data.name : undefined,
    organization: typeof data?.organization === "string" ? data.organization : undefined,
    role: normalizeUserRole(data?.role),
    subscriptionPlan: normalizeSubscriptionPlan(data?.subscription_plan),
  };
}


function planDescription(plan: SubscriptionPlan): string {
  return plan === "premium"
    ? "Audits illimités, exports PDF/CSV, utilisateurs et rôles avancés. Vos données Free sont conservées après activation."
    : "1 audit actif, preuves locales et passage Premium possible ensuite, sans recréer de compte.";
}

function readSelectedPlan(): SubscriptionPlan {
  // Le Premium ne peut plus être auto-sélectionné par un visiteur :
  // il se demande par e-mail puis s’active manuellement par le propriétaire.
  return "free";
}

export function LoginAccessPage({
  mode,
  lang,
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
  const [authView, setAuthView] = useState<"login" | "signup">(mode === "setup" ? "signup" : "login");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(() => readSelectedPlan());
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [confirmationPopupOpen, setConfirmationPopupOpen] = useState(false);
  const [existingAccountEmail, setExistingAccountEmail] = useState("");
  const [existingAccountPopupOpen, setExistingAccountPopupOpen] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const styleId = "gaptrack-hide-edge-password-reveal";

    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .gaptrack-auth input[type="password"]::-ms-reveal,
      .gaptrack-auth input[type="password"]::-ms-clear,
      .gt-control input[type="password"]::-ms-reveal,
      .gt-control input[type="password"]::-ms-clear {
        display: none;
        width: 0;
        height: 0;
      }
    `;

    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem("gaptrack_selected_plan", selectedPlan);
    } catch {}
  }, [selectedPlan]);

  const isSetup = authView === "signup";

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

  function requestPremiumByEmail() {
    window.location.href = buildPremiumRequestMailto({
      email: cleanEmail(email),
      name: name.trim(),
      organization: organization.trim(),
      source: "Page d’inscription GapTrack",
    });
    toast.info(lang === "fr" ? "Votre demande Premium est prête : le compte Free reste utilisable en attendant l’activation." : "Your Premium request is ready: the Free account remains usable while activation is pending.");
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
      // Message volontairement générique pour limiter l’énumération d’utilisateurs.
      console.error("Password reset request failed", error);
    }

    toast.success(lang === "fr" ? "Si le compte existe, un e-mail de réinitialisation sera envoyé." : "If the account exists, a password reset email will be sent.");
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

        const targetEmail = cleanEmail(email);
        const passwordError = validatePasswordStrength(password, { email: targetEmail, name, organization }, lang);
        if (passwordError) {
          toast.error(passwordError);
          return;
        }

        persistRememberMe(false);

        const { data, error } = await supabase.auth.signUp({
          email: targetEmail,
          password,
          options: {
            data: {
              name: name.trim(),
              organization: organization.trim(),
              // Hints only: the database trigger/RLS must decide the real role and plan.
              requestedRole: "admin",
              requestedSubscriptionPlan: "free",
              premiumRequested: false,
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          if (isExistingAccountError(error)) {
            setExistingAccountEmail(targetEmail);
            setExistingAccountPopupOpen(true);
            setAuthView("login");
            setPassword("");
            return;
          }

          toast.error(authErrorMessage(error));
          return;
        }

        // Supabase peut masquer l'existence d'un compte pour éviter l'énumération d'utilisateurs.
        // Dans ce cas, un user est parfois renvoyé avec identities vide : on le traite comme un compte existant.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          await supabase.auth.signOut();
          setExistingAccountEmail(targetEmail);
          setExistingAccountPopupOpen(true);
          setAuthView("login");
          setPassword("");
          return;
        }

        // Sécurité produit : même si Supabase renvoie une session,
        // on ne donne pas accès à GapTrack immédiatement après l'inscription.
        // L'utilisateur doit confirmer son e-mail puis se reconnecter.
        await supabase.auth.signOut();

        setConfirmationEmail(targetEmail);
        setConfirmationPopupOpen(true);
        setAuthView("login");
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
        toast.error(authErrorMessage(error));
        return;
      }

      if (!data.user?.id) {
        toast.error(lang === "fr" ? "Session Supabase invalide." : "Invalid Supabase session.");
        return;
      }

      const profileMetadata = data.user.user_metadata || {};
      let serverProfile: SupabaseAuthProfile;

      try {
        serverProfile = await fetchGapTrackProfile(data.user.id, data.user.email || targetEmail);
      } catch (profileError) {
        console.error("Unable to load GapTrack profile", profileError);
        toast.error(
          lang === "fr"
            ? "Connexion impossible : le profil serveur GapTrack est indisponible."
            : "Sign-in failed: the GapTrack server profile is unavailable."
        );
        return;
      }

      onSupabaseAuthenticated?.({
        email: serverProfile.email,
        name: serverProfile.name,
        organization: serverProfile.organization,
        role: serverProfile.role,
        subscriptionPlan: serverProfile.subscriptionPlan,
        createdByUserId: typeof profileMetadata.createdByUserId === "string" ? profileMetadata.createdByUserId : undefined,
        createdByEmail: typeof profileMetadata.createdByEmail === "string" ? profileMetadata.createdByEmail : undefined,
      });

      toast.success(lang === "fr" ? "Connexion réussie." : "Signed in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gaptrack-auth" data-mode={authView}>
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
            <h2>{isSetup ? "Créer un compte" : "Connexion"}</h2>
            <p>
              {isSetup
                ? `Créez votre accès GapTrack Free maintenant. Vous pourrez demander Premium en parallèle, sans perdre vos données.`
                : confirmationEmail
                  ? "Confirmez votre e-mail, puis connectez-vous à votre espace GapTrack"
                  : "Accédez à votre espace GapTrack"}
            </p>
          </div>

          <div className="gt-auth-tabs" role="tablist" aria-label="Connexion ou création de compte">
            <button
              type="button"
              role="tab"
              aria-selected={authView === "login"}
              className={authView === "login" ? "gt-auth-tab active" : "gt-auth-tab"}
              onClick={() => {
                setAuthView("login");
                setPassword("");
              }}
            >
              Connexion
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authView === "signup"}
              className={authView === "signup" ? "gt-auth-tab active" : "gt-auth-tab"}
              onClick={() => {
                setAuthView("signup");
                setPassword("");
              }}
            >
              Créer un compte
            </button>
          </div>

          <form className="gt-form" onSubmit={submit}>
            {!isSetup && confirmationEmail ? (
              <div className="gt-auth-note">
                <strong>Compte en attente de confirmation</strong>
                <span>Vous pourrez accéder à GapTrack après validation du lien reçu par e-mail.</span>
              </div>
            ) : null}

            {isSetup ? (
              <div className="gt-plan-selection" aria-label="Choix de l’offre GapTrack">
                <button
                  type="button"
                  className={selectedPlan === "free" ? "gt-plan-option active" : "gt-plan-option"}
                  onClick={() => setSelectedPlan("free")}
                  aria-pressed={selectedPlan === "free"}
                >
                  <span>Free</span>
                  <strong>0€</strong>
                  <small>Découvrir avec un audit actif</small>
                </button>
                <button
                  type="button"
                  className="gt-plan-option gt-plan-option-premium"
                  onClick={requestPremiumByEmail}
                  aria-pressed={false}
                >
                  <span>Premium</span>
                  <strong>Sur devis</strong>
                  <small>Demande préremplie, activation serveur</small>
                </button>
              </div>
            ) : null}

            {isSetup ? (
              <div className="gt-premium-helper">
                <Mail aria-hidden="true" />
                <div>
                  <strong>Pas besoin d’attendre Premium</strong>
                  <span>Créez votre compte Free maintenant : la demande Premium est préremplie et l’activation se fera ensuite sur le même compte.</span>
                </div>
              </div>
            ) : null}

            {isSetup ? (
              <>
                <div className={`gt-selected-plan gt-selected-plan-${selectedPlan}`}>
                  <CheckCircle2 aria-hidden="true" />
                  <div>
                    <span>Offre activée immédiatement</span>
                    <strong>Free</strong>
                  </div>
                  <p>{planDescription("free")}</p>
                </div>

                <Field label="Nom">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Administrateur" autoComplete="name" maxLength={80} required />
                </Field>

                <Field label="Organisation">
                  <input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="PME / Client / Cabinet" autoComplete="organization" />
                </Field>

                <Field label="Adresse e-mail" icon={<Mail />}>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="admin@entreprise.com" autoComplete="email" maxLength={254} required />
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
                  maxLength={254}
                  required
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
                minLength={isSetup ? SECURITY_MIN_PASSWORD_LENGTH : undefined}
                maxLength={SECURITY_MAX_PASSWORD_LENGTH}
                required
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
              <span>{isSetup ? "Créer le compte Free" : "Se connecter"}</span>
              {!busy ? <ArrowRight aria-hidden="true" /> : null}
            </button>

          </form>

          <div className="gt-protection">
            <div className="gt-protection-icon"><ShieldCheck aria-hidden="true" /></div>
            <div>
              <h3>Vos données sont protégées</h3>
              <p>Compte Free utilisable immédiatement, session protégée et activation Premium contrôlée côté serveur après validation.</p>
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
            <p className="gt-confirm-plan">Offre activée : <strong>Free</strong>. Vous pouvez demander Premium ensuite sans recréer votre compte.</p>
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

      {existingAccountPopupOpen ? (
        <div className="gt-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="gt-existing-account-title">
          <div className="gt-confirm-card gt-existing-account-card">
            <div className="gt-confirm-icon gt-existing-account-icon">
              <Mail aria-hidden="true" />
            </div>
            <h3 id="gt-existing-account-title">Compte déjà existant</h3>
            <p>
              Un compte GapTrack existe déjà avec cette adresse e-mail.
            </p>
            <p>
              Connectez-vous avec <strong>{existingAccountEmail}</strong> ou utilisez “Mot de passe oublié ?” si vous ne connaissez plus votre mot de passe.
            </p>
            <button
              type="button"
              className="gt-primary"
              onClick={() => {
                setExistingAccountPopupOpen(false);
                setEmail(existingAccountEmail);
                setAuthView("login");
              }}
            >
              Aller à la connexion
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
