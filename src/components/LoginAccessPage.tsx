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
  groupId?: string;
  groupName?: string;
}

interface PendingMfaSession {
  profile: SupabaseAuthProfile;
  metadata: Record<string, unknown>;
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

type ContactRequestKind = "contact" | "premium" | "support" | "privacy";

function buildContactFormUrl(params: {
  type?: ContactRequestKind;
  email?: string;
  name?: string;
  organization?: string;
  source?: string;
} = {}): string {
  const search = new URLSearchParams();
  search.set("type", params.type || "premium");

  if (params.email?.trim()) search.set("email", params.email.trim());
  if (params.name?.trim()) search.set("name", params.name.trim());
  if (params.organization?.trim()) search.set("organization", params.organization.trim());
  if (params.source?.trim()) search.set("source", params.source.trim());

  return `/contact?${search.toString()}`;
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
  const profileColumnAttempts = [
    "email, name, organization, role, subscription_plan, created_by_user_id, created_by_email, group_id, group_name",
    "email, name, organization, role, subscription_plan, created_by_user_id, created_by_email",
    "email, name, organization, role, subscription_plan",
  ];

  let data: any = null;
  let error: any = null;

  for (const columns of profileColumnAttempts) {
    const result = await supabase
      .from("gaptrack_profiles")
      .select(columns)
      .eq("id", userId)
      .maybeSingle();

    data = result.data as any;
    error = result.error;

    if (!error) break;

    const message = String(error.message || "").toLowerCase();
    if (!message.includes("created_by") && !message.includes("group_")) break;
  }

  if (error) {
    throw error;
  }

  return {
    email: typeof data?.email === "string" ? data.email : fallbackEmail,
    name: typeof data?.name === "string" ? data.name : undefined,
    organization: typeof data?.organization === "string" ? data.organization : undefined,
    role: normalizeUserRole(data?.role),
    subscriptionPlan: normalizeSubscriptionPlan(data?.subscription_plan),
    createdByUserId: typeof data?.created_by_user_id === "string" && data.created_by_user_id.trim()
      ? data.created_by_user_id
      : undefined,
    createdByEmail: typeof data?.created_by_email === "string" && data.created_by_email.trim()
      ? cleanEmail(data.created_by_email)
      : undefined,
    groupId: typeof data?.group_id === "string" && data.group_id.trim()
      ? data.group_id.trim()
      : undefined,
    groupName: typeof data?.group_name === "string" && data.group_name.trim()
      ? data.group_name.trim()
      : undefined,
  };
}

function metadataString(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

async function needsMfaChallenge(): Promise<boolean> {
  const mfa = (supabase.auth as any).mfa;
  if (!mfa?.getAuthenticatorAssuranceLevel) return false;

  const { data, error } = await mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;

  return data?.nextLevel === "aal2" && data?.currentLevel !== "aal2";
}

async function verifyFirstTotpFactor(code: string) {
  const mfa = (supabase.auth as any).mfa;
  if (!mfa?.listFactors || !mfa?.challenge || !mfa?.verify) {
    throw new Error("La double authentification n’est pas disponible sur ce client Supabase.");
  }

  const factors = await mfa.listFactors();
  if (factors.error) throw factors.error;

  const totpFactors = Array.isArray(factors.data?.totp) ? factors.data.totp : [];
  const totpFactor = totpFactors.find((factor: any) => factor?.status === "verified") || totpFactors[0];

  if (!totpFactor?.id) {
    throw new Error("Aucun facteur 2FA TOTP actif n’a été trouvé pour ce compte.");
  }

  const challenge = await mfa.challenge({ factorId: totpFactor.id });
  if (challenge.error) throw challenge.error;

  const verify = await mfa.verify({
    factorId: totpFactor.id,
    challengeId: challenge.data.id,
    code,
  });

  if (verify.error) throw verify.error;
  return verify.data;
}

function planDescription(plan: SubscriptionPlan): string {
  return plan === "premium"
    ? "Audits illimités, exports PDF/CSV, preuves cloud, validation des preuves, rôles avancés et modèles personnalisés. Vos données Free sont conservées après activation."
    : "1 audit actif, 1 utilisateur, preuves locales et passage Premium possible ensuite, sans recréer de compte.";
}

function readSelectedPlan(): SubscriptionPlan {
  // Le Premium ne peut plus être auto-sélectionné par un visiteur :
  // il se demande via le formulaire GapTrack puis s’active manuellement par le propriétaire.
  return "free";
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
  const [pendingMfaSession, setPendingMfaSession] = useState<PendingMfaSession | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);

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
  const isCompactViewport = useMediaQuery("(max-width: 780px)");

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

  function requestPremiumViaForm() {
    window.location.href = buildContactFormUrl({
      email: cleanEmail(email),
      name: name.trim(),
      organization: organization.trim(),
      source: "Page d’inscription GapTrack",
    });
    toast.info(lang === "fr" ? "Le formulaire Premium est ouvert : votre compte Free reste utilisable en attendant l’activation." : "The Premium form is open: the Free account remains usable while activation is pending.");
  }

  function completeSupabaseAuthentication(profile: SupabaseAuthProfile, metadata: Record<string, unknown>) {
    const createdByUserId = profile.createdByUserId
      || metadataString(metadata, "createdByUserId")
      || metadataString(metadata, "invitedByUserId");
    const createdByEmail = profile.createdByEmail
      || metadataString(metadata, "createdByEmail")
      || metadataString(metadata, "invitedByEmail");

    onSupabaseAuthenticated?.({
      email: profile.email,
      name: profile.name,
      organization: profile.organization,
      role: profile.role,
      subscriptionPlan: profile.subscriptionPlan,
      createdByUserId,
      createdByEmail: createdByEmail ? cleanEmail(createdByEmail) : undefined,
    });

    toast.success(lang === "fr" ? "Connexion réussie." : "Signed in.");
  }

  async function cancelMfaChallenge() {
    setPendingMfaSession(null);
    setMfaCode("");
    setMfaError("");
    await supabase.auth.signOut();
    toast.info(lang === "fr" ? "Vérification 2FA annulée." : "2FA verification cancelled.");
  }

  async function submitMfaChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mfaBusy || !pendingMfaSession) return;

    const code = mfaCode.replace(/\s+/g, "").trim();
    if (!/^\d{6}$/.test(code)) {
      setMfaError(lang === "fr" ? "Saisissez le code à 6 chiffres de votre application d’authentification." : "Enter the 6-digit code from your authenticator app.");
      return;
    }

    setMfaBusy(true);
    setMfaError("");
    try {
      await verifyFirstTotpFactor(code);
      const { profile, metadata } = pendingMfaSession;
      setPendingMfaSession(null);
      setMfaCode("");
      completeSupabaseAuthentication(profile, metadata);
    } catch (error) {
      console.error("MFA verification failed", error);
      setMfaError(authErrorMessage(error));
    } finally {
      setMfaBusy(false);
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

      try {
        if (await needsMfaChallenge()) {
          setPendingMfaSession({ profile: serverProfile, metadata: profileMetadata as Record<string, unknown> });
          setMfaCode("");
          setMfaError("");
          toast.info(lang === "fr" ? "Confirmez le code 2FA pour terminer la connexion." : "Confirm your 2FA code to complete sign-in.");
          return;
        }
      } catch (mfaError) {
        console.error("Unable to evaluate MFA requirement", mfaError);
        toast.error(authErrorMessage(mfaError));
        return;
      }

      completeSupabaseAuthentication(serverProfile, profileMetadata as Record<string, unknown>);
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
            <img
              src="/icon-192.png"
              alt=""
              className="gt-brand-icon"
              aria-hidden="true"
              loading="eager"
              decoding="async"
            />
            <div>
              <div className="gt-brand-name">GapTrack</div>
              <div className="gt-brand-subtitle">Audit SSI</div>
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

          {!isCompactViewport ? <DashboardPreview /> : null}
        </section>

        <section className="gt-login-card" aria-label={isSetup ? "Création du compte" : "Connexion"}>
          <div className="gt-secure-badge">
            <ShieldCheck aria-hidden="true" />
            <span>{pendingMfaSession ? "Double authentification" : isSetup ? "Premier accès sécurisé" : "Accès sécurisé"}</span>
          </div>

          <div className="gt-login-heading">
            <h2>{pendingMfaSession ? "Code 2FA" : isSetup ? "Créer un compte" : "Connexion"}</h2>
            <p>
              {pendingMfaSession
                ? "Saisissez le code de votre application d’authentification pour finaliser l’accès."
                : isSetup
                  ? `Créez votre accès GapTrack Free maintenant. Vous pourrez demander Premium en parallèle, sans perdre vos données.`
                  : confirmationEmail
                    ? "Confirmez votre e-mail, puis connectez-vous à votre espace GapTrack"
                    : "Accédez à votre espace GapTrack"}
            </p>
          </div>

          {!pendingMfaSession ? (
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
          ) : null}

          {pendingMfaSession ? (
            <form className="gt-form" onSubmit={submitMfaChallenge}>
              <div className="gt-mfa-card">
                <ShieldCheck aria-hidden="true" />
                <div>
                  <strong>Vérification en deux étapes</strong>
                  <span>Compte : {pendingMfaSession.profile.email}</span>
                </div>
              </div>

              {mfaError ? (
                <div className="gt-auth-note gt-auth-note-error">
                  <strong>Code non validé</strong>
                  <span>{mfaError}</span>
                </div>
              ) : null}

              <Field label="Code d’authentification" icon={<ShieldCheck />}>
                <input
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="123456"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                />
              </Field>

              <button type="submit" className="gt-primary" disabled={mfaBusy}>
                {mfaBusy ? <Loader2 className="gt-spin" aria-hidden="true" /> : null}
                <span>{mfaBusy ? "Vérification…" : "Valider le code 2FA"}</span>
                {!mfaBusy ? <ArrowRight aria-hidden="true" /> : null}
              </button>

              <button type="button" className="gt-secondary-action" onClick={cancelMfaChallenge} disabled={mfaBusy}>
                Annuler et revenir à la connexion
              </button>
            </form>
          ) : (
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
                  <small>Solo : 1 audit actif</small>
                </button>
                <button
                  type="button"
                  className="gt-plan-option gt-plan-option-premium"
                  onClick={requestPremiumViaForm}
                  aria-pressed={false}
                >
                  <span>Premium</span>
                  <strong>Sur devis</strong>
                  <small>Équipe, exports, preuves cloud</small>
                </button>
              </div>
            ) : null}

            {isSetup ? (
              <div className="gt-premium-helper">
                <Mail aria-hidden="true" />
                <div>
                  <strong>Pas besoin d’attendre Premium</strong>
                  <span>Créez votre compte Free maintenant : Premium débloquera ensuite les audits illimités, exports, rôles, preuves cloud et validations sur le même compte.</span>
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
          )}

          <div className="gt-protection">
            <div className="gt-protection-icon"><ShieldCheck aria-hidden="true" /></div>
            <div>
              <h3>{pendingMfaSession ? "Connexion renforcée" : "Vos données sont protégées"}</h3>
              <p>{pendingMfaSession ? "Le code 2FA vérifie que vous possédez bien l’application d’authentification liée à ce compte." : "Compte Free utilisable immédiatement : 1 utilisateur, 1 audit actif et preuves locales. Premium est activé côté serveur après validation."}</p>
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
        <div className="gt-mini-logo">
          <img src="/gaptrack-logo-transparent.png" alt="" className="gt-mini-logo-icon" aria-hidden="true" loading="lazy" decoding="async" />
          GapTrack
        </div>
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
