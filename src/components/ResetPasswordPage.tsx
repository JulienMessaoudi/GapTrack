import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { authErrorMessage } from "../lib/authErrorMessages";
import "./LoginAccessPage.css";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    if (password.length < 8) {
      toast.error("Mot de passe : 8 caractères minimum.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        toast.error(authErrorMessage(error));
        return;
      }

      toast.success("Mot de passe mis à jour.");
      window.location.href = "/";
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="gaptrack-auth">
      <div className="gt-bg-grid" />

      <section className="gt-login-card gt-reset-card">
        <div className="gt-secure-badge">
          <ShieldCheck aria-hidden="true" />
          <span>Réinitialisation sécurisée</span>
        </div>

        <div className="gt-login-heading">
          <h2>Nouveau mot de passe</h2>
          <p>Saisissez et confirmez votre nouveau mot de passe GapTrack.</p>
        </div>

        <form className="gt-form" onSubmit={submit}>
          <label className="gt-field">
            <span className="gt-label">Nouveau mot de passe</span>
            <span className="gt-control">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••••••"
                autoComplete="new-password"
              />
              <span className="gt-control-right">
                <button
                  type="button"
                  className="gt-eye"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label="Afficher ou masquer le nouveau mot de passe"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </span>
            </span>
          </label>

          <label className="gt-field">
            <span className="gt-label">Confirmer le mot de passe</span>
            <span className="gt-control">
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••••••••••"
                autoComplete="new-password"
              />
              <span className="gt-control-right">
                <button
                  type="button"
                  className="gt-eye"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label="Afficher ou masquer la confirmation du mot de passe"
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </button>
              </span>
            </span>
          </label>

          <button className="gt-primary" type="submit" disabled={busy}>
            {busy ? <Loader2 className="gt-spin" aria-hidden="true" /> : null}
            <span>{busy ? "Mise à jour…" : "Mettre à jour le mot de passe"}</span>
          </button>
        </form>
      </section>
    </main>
  );
}
