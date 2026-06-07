type AuthLikeError = {
  message?: unknown;
  status?: unknown;
  code?: unknown;
};

function normalizeAuthErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybeError = error as AuthLikeError;
    return String(maybeError.message || maybeError.code || "");
  }
  return "";
}

export function authErrorMessage(error: unknown): string {
  const message = normalizeAuthErrorMessage(error);
  const normalized = message.toLowerCase();

  if (!normalized) {
    return "Une erreur est survenue. Veuillez réessayer.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Adresse e-mail ou mot de passe incorrect.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Adresse e-mail non confirmée. Vérifiez votre boîte mail avant de vous connecter.";
  }

  if (normalized.includes("auth session missing")) {
    return "Session de réinitialisation absente ou expirée. Relancez “Mot de passe oublié ?”.";
  }

  if (normalized.includes("new password should be different")) {
    return "Le nouveau mot de passe doit être différent de l’ancien.";
  }

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already registered") ||
    normalized.includes("already exists")
  ) {
    return "Un compte existe déjà avec cette adresse e-mail.";
  }

  if (normalized.includes("password should be at least") || normalized.includes("password must be at least")) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }

  if (normalized.includes("signup is disabled")) {
    return "La création de compte est actuellement désactivée.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
  }

  if (normalized.includes("network") || normalized.includes("failed to fetch")) {
    return "Connexion impossible au serveur. Vérifiez votre connexion internet.";
  }

  return message;
}
