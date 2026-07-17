import { FormEvent, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MessageSquareText,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "./ContactRequestPage.css";

type RequestType = "contact" | "premium" | "support" | "privacy";

type FormState = {
  requestType: RequestType;
  name: string;
  email: string;
  organization: string;
  needs: string[];
  context: string;
  deadline: string;
  source: string;
  consent: boolean;
  website: string;
};

const REQUEST_TYPES: Array<{ value: RequestType; label: string; description: string }> = [
  { value: "premium", label: "Demande Premium", description: "Devis, activation et besoins avancés" },
  { value: "contact", label: "Question générale", description: "Échanger au sujet de GapTrack" },
  { value: "support", label: "Assistance", description: "Signaler un problème ou demander de l’aide" },
  { value: "privacy", label: "Données personnelles", description: "Accès, correction ou suppression" },
];

const PREMIUM_NEEDS = [
  "Audits illimités",
  "Exports PDF / CSV",
  "Stockage cloud des preuves",
  "Validation des preuves",
  "Utilisateurs et rôles avancés",
  "Modèles personnalisés",
  "Autre besoin",
];

function safeRequestType(value: string | null): RequestType {
  return REQUEST_TYPES.some((item) => item.value === value) ? value as RequestType : "contact";
}

function initialState(): FormState {
  if (typeof window === "undefined") {
    return {
      requestType: "contact",
      name: "",
      email: "",
      organization: "",
      needs: [],
      context: "",
      deadline: "",
      source: "Site GapTrack",
      consent: false,
      website: "",
    };
  }

  const search = new URLSearchParams(window.location.search);
  return {
    requestType: safeRequestType(search.get("type")),
    name: search.get("name")?.slice(0, 120) || "",
    email: search.get("email")?.slice(0, 254) || "",
    organization: search.get("organization")?.slice(0, 160) || "",
    needs: [],
    context: "",
    deadline: "",
    source: search.get("source")?.slice(0, 200) || "Site GapTrack",
    consent: false,
    website: "",
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ContactRequestPage() {
  const [form, setForm] = useState<FormState>(() => initialState());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const startedAt = useRef(Date.now());

  const selectedType = useMemo(
    () => REQUEST_TYPES.find((item) => item.value === form.requestType) || REQUEST_TYPES[1],
    [form.requestType],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleNeed(need: string) {
    setForm((current) => ({
      ...current,
      needs: current.needs.includes(need)
        ? current.needs.filter((item) => item !== need)
        : [...current.needs, need],
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const context = form.context.trim();

    if (name.length < 2) {
      setError("Indiquez votre nom ou le nom de votre équipe.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Saisissez une adresse e-mail valide.");
      return;
    }
    if (context.length < 10) {
      setError("Décrivez votre demande en quelques mots supplémentaires.");
      return;
    }
    if (!form.consent) {
      setError("Vous devez accepter l’utilisation de vos informations pour traiter la demande.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("send-contact-request", {
        body: {
          requestType: form.requestType,
          name,
          email,
          organization: form.organization.trim(),
          needs: form.needs,
          context,
          deadline: form.deadline.trim(),
          source: form.source,
          consent: form.consent,
          website: form.website,
          startedAt: startedAt.current,
        },
      });

      if (invokeError) throw invokeError;
      if (!data?.ok) throw new Error(data?.error || "La demande n’a pas pu être envoyée.");

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (submissionError) {
      console.error("GapTrack contact request failed", submissionError);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Une erreur est survenue. Réessayez dans quelques instants.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <main className="gt-contact-page">
        <div className="gt-contact-grid" aria-hidden="true" />
        <section className="gt-contact-success">
          <div className="gt-contact-success-icon"><CheckCircle2 aria-hidden="true" /></div>
          <span>DEMANDE TRANSMISE</span>
          <h1>Merci, votre message a bien été envoyé.</h1>
          <p>
            La demande a été enregistrée par GapTrack et transmise à
            <strong> contact@gaptrack.fr</strong>. Une réponse vous sera adressée sur
            <strong> {form.email.trim()}</strong>.
          </p>
          <div className="gt-contact-success-actions">
            <a className="gt-contact-primary" href="/">Retour à l’accueil</a>
            <button
              type="button"
              className="gt-contact-secondary"
              onClick={() => {
                setSubmitted(false);
                setForm((current) => ({ ...initialState(), email: current.email }));
                startedAt.current = Date.now();
              }}
            >
              Envoyer une autre demande
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="gt-contact-page">
      <div className="gt-contact-grid" aria-hidden="true" />
      <div className="gt-contact-glow gt-contact-glow-one" aria-hidden="true" />
      <div className="gt-contact-glow gt-contact-glow-two" aria-hidden="true" />

      <header className="gt-contact-header">
        <a className="gt-contact-brand" href="/" aria-label="Retour à l’accueil GapTrack">
          <img src="/icon-192.png" alt="" aria-hidden="true" />
          <span><strong>GapTrack</strong><small>Audit SSI</small></span>
        </a>
        <a className="gt-contact-back" href="/"><ArrowLeft aria-hidden="true" /> Retour au site</a>
      </header>

      <section className="gt-contact-shell">
        <div className="gt-contact-intro">
          <div className="gt-contact-kicker"><Mail aria-hidden="true" /> CONTACT GAPTRACK</div>
          <h1>Parlons de votre <span>besoin</span></h1>
          <p>
            Décrivez votre demande directement ici. Aucun logiciel de messagerie ne s’ouvrira :
            le formulaire transmettra votre message à l’équipe GapTrack.
          </p>

          <div className="gt-contact-trust">
            <article><ShieldCheck aria-hidden="true" /><div><strong>Transmission sécurisée</strong><span>Envoi via une fonction Supabase protégée.</span></div></article>
            <article><Clock3 aria-hidden="true" /><div><strong>Demande structurée</strong><span>Toutes les informations utiles sont regroupées.</span></div></article>
            <article><MessageSquareText aria-hidden="true" /><div><strong>Réponse par e-mail</strong><span>La réponse sera envoyée à l’adresse indiquée.</span></div></article>
          </div>
        </div>

        <form className="gt-contact-form" onSubmit={submit} noValidate>
          <div className="gt-contact-form-heading">
            <div>
              <span>{selectedType.label}</span>
              <h2>Envoyer une demande</h2>
            </div>
            <Send aria-hidden="true" />
          </div>

          <label className="gt-contact-field gt-contact-field-full">
            <span>Type de demande *</span>
            <select
              value={form.requestType}
              onChange={(event) => update("requestType", safeRequestType(event.target.value))}
            >
              {REQUEST_TYPES.map((item) => (
                <option key={item.value} value={item.value}>{item.label} — {item.description}</option>
              ))}
            </select>
          </label>

          <div className="gt-contact-two-columns">
            <label className="gt-contact-field">
              <span><UserRound aria-hidden="true" /> Nom *</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                autoComplete="name"
                maxLength={120}
                placeholder="Votre nom"
                required
              />
            </label>

            <label className="gt-contact-field">
              <span><Mail aria-hidden="true" /> E-mail *</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                autoComplete="email"
                maxLength={254}
                placeholder="vous@entreprise.fr"
                required
              />
            </label>
          </div>

          <label className="gt-contact-field gt-contact-field-full">
            <span><Building2 aria-hidden="true" /> Organisation</span>
            <input
              type="text"
              value={form.organization}
              onChange={(event) => update("organization", event.target.value)}
              autoComplete="organization"
              maxLength={160}
              placeholder="Entreprise, cabinet, établissement…"
            />
          </label>

          {form.requestType === "premium" ? (
            <fieldset className="gt-contact-needs">
              <legend>Fonctionnalités recherchées</legend>
              <div>
                {PREMIUM_NEEDS.map((need) => (
                  <label key={need} className={form.needs.includes(need) ? "selected" : ""}>
                    <input
                      type="checkbox"
                      checked={form.needs.includes(need)}
                      onChange={() => toggleNeed(need)}
                    />
                    <CheckCircle2 aria-hidden="true" />
                    <span>{need}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <label className="gt-contact-field gt-contact-field-full">
            <span><MessageSquareText aria-hidden="true" /> Votre demande *</span>
            <textarea
              value={form.context}
              onChange={(event) => update("context", event.target.value)}
              maxLength={4000}
              rows={7}
              placeholder={form.requestType === "premium"
                ? "Présentez votre contexte, le nombre d’utilisateurs envisagé et vos priorités…"
                : "Décrivez précisément votre question ou votre problème…"}
              required
            />
            <small>{form.context.length} / 4000 caractères</small>
          </label>

          <label className="gt-contact-field gt-contact-field-full">
            <span><Clock3 aria-hidden="true" /> Délai souhaité</span>
            <input
              type="text"
              value={form.deadline}
              onChange={(event) => update("deadline", event.target.value)}
              maxLength={160}
              placeholder="Ex. cette semaine, avant le 30 septembre, sans urgence…"
            />
          </label>

          <label className="gt-contact-honeypot" aria-hidden="true">
            Ne pas remplir ce champ
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={(event) => update("website", event.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </label>

          <label className="gt-contact-consent">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(event) => update("consent", event.target.checked)}
            />
            <span>
              J’accepte que GapTrack utilise ces informations uniquement pour traiter et répondre à ma demande.
              Consultez la <a href="/confidentialite">politique de confidentialité</a>.
            </span>
          </label>

          {error ? <div className="gt-contact-error" role="alert">{error}</div> : null}

          <button className="gt-contact-submit" type="submit" disabled={busy}>
            {busy ? <Loader2 className="gt-contact-spinner" aria-hidden="true" /> : <Send aria-hidden="true" />}
            {busy ? "Envoi en cours…" : "Envoyer la demande"}
          </button>

          <p className="gt-contact-form-note">
            La demande sera enregistrée dans Supabase et envoyée à contact@gaptrack.fr.
          </p>
        </form>
      </section>
    </main>
  );
}
