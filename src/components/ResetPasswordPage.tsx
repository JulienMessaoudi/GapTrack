import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import "./LoginAccessPage.css";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("Mot de passe : 8 caractères minimum.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        toast.error(error.message);
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

      <section className="gt-login-card" style={{ margin: "10vh auto", maxWidth: 560 }}>
        <div className="gt-secure-badge">
          <ShieldCheck aria-hidden="true" />
          <span>Réinitialisation sécurisée</span>
        </div>

        <div className="gt-login-heading">
          <h2>Nouveau mot de passe</h2>
          <p>Saisissez votre nouveau mot de passe GapTrack.</p>
        </div>

        <form className="gt-form" onSubmit={submit}>
          <label className="gt-field">
            <span className="gt-label">Mot de passe</span>
            <span className="gt-control">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••••••••••"
                autoComplete="new-password"
              />
            </span>
          </label>

          <button className="gt-primary" type="submit" disabled={busy}>
            {busy ? "Mise à jour…" : "Mettre à jour le mot de passe"}
          </button>
        </form>
      </section>
    </main>
  );
}
