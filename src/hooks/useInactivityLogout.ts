import { useEffect, useRef } from "react";
import { toast } from "sonner";

type Language = "fr" | "en";

interface UseInactivityLogoutOptions {
  enabled: boolean;
  timeoutMs: number;
  warningMs: number;
  lang: Language;
  onTimeout: () => void | Promise<void>;
}

const ACTIVITY_STORAGE_KEY = "gaptrack:last-activity";
const WARNING_TOAST_ID = "gaptrack-inactivity-warning";

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
];

function warningDurationLabel(milliseconds: number, lang: Language): string {
  const seconds = Math.max(1, Math.round(milliseconds / 1_000));

  if (seconds < 60) {
    return lang === "fr"
      ? `${seconds} seconde${seconds > 1 ? "s" : ""}`
      : `${seconds} second${seconds > 1 ? "s" : ""}`;
  }

  const minutes = Math.max(1, Math.round(seconds / 60));

  return lang === "fr"
    ? `${minutes} minute${minutes > 1 ? "s" : ""}`
    : `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

export function useInactivityLogout({
  enabled,
  timeoutMs,
  warningMs,
  lang,
  onTimeout,
}: UseInactivityLogoutOptions): void {
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) {
      toast.dismiss(WARNING_TOAST_ID);
      return;
    }

    let warningTimer: number | undefined;
    let logoutTimer: number | undefined;
    let retryTimer: number | undefined;
    let lastActivityAt = Date.now();
    let lastResetAt = 0;
    let logoutInProgress = false;
    let disposed = false;

    const clearTimers = () => {
      if (warningTimer !== undefined) {
        window.clearTimeout(warningTimer);
      }

      if (logoutTimer !== undefined) {
        window.clearTimeout(logoutTimer);
      }

      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer);
      }

      warningTimer = undefined;
      logoutTimer = undefined;
      retryTimer = undefined;
    };

    const expireSession = async () => {
      if (disposed || logoutInProgress) return;

      logoutInProgress = true;
      clearTimers();
      toast.dismiss(WARNING_TOAST_ID);

      try {
        await onTimeoutRef.current();
      } finally {
        logoutInProgress = false;

        // Si une opération ou une sauvegarde a empêché la déconnexion,
        // une nouvelle tentative est effectuée une minute plus tard.
        if (!disposed) {
          retryTimer = window.setTimeout(() => {
            void expireSession();
          }, 60_000);
        }
      }
    };

    const scheduleTimers = (activityAt: number) => {
      clearTimers();
      lastActivityAt = activityAt;

      const now = Date.now();
      const warningAt = activityAt + timeoutMs - warningMs;
      const logoutAt = activityAt + timeoutMs;
      const warningDelay = Math.max(0, warningAt - now);
      const logoutDelay = Math.max(0, logoutAt - now);

      if (logoutDelay <= 0) {
        void expireSession();
        return;
      }

      warningTimer = window.setTimeout(() => {
        const remaining = warningDurationLabel(warningMs, lang);

        toast.warning(
          lang === "fr"
            ? `Votre session va expirer dans ${remaining} pour cause d’inactivité.`
            : `Your session will expire in ${remaining} due to inactivity.`,
          {
            id: WARNING_TOAST_ID,
            duration: warningMs,
            action: {
              label: lang === "fr" ? "Rester connecté" : "Stay signed in",
              onClick: () => {
                registerActivity(true);
              },
            },
          }
        );
      }, warningDelay);

      logoutTimer = window.setTimeout(() => {
        void expireSession();
      }, logoutDelay);
    };

    const registerActivity = (force = false) => {
      if (logoutInProgress) return;

      const now = Date.now();

      // Évite que des événements répétés, notamment le défilement,
      // recréent les minuteurs plusieurs dizaines de fois par seconde.
      if (!force && now - lastResetAt < 1_000) return;

      lastResetAt = now;
      lastActivityAt = now;

      try {
        window.localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
      } catch {
        // Le stockage peut être indisponible dans certains modes privés.
      }

      toast.dismiss(WARNING_TOAST_ID);
      scheduleTimers(now);
    };

    const handleActivity = () => {
      registerActivity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key !== ACTIVITY_STORAGE_KEY ||
        !event.newValue ||
        logoutInProgress
      ) {
        return;
      }

      const activityAt = Number(event.newValue);

      if (!Number.isFinite(activityAt)) return;

      lastActivityAt = activityAt;
      toast.dismiss(WARNING_TOAST_ID);
      scheduleTimers(activityAt);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      const elapsed = Date.now() - lastActivityAt;

      if (elapsed >= timeoutMs) {
        void expireSession();
        return;
      }

      scheduleTimers(lastActivityAt);
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, {
        passive: true,
      });
    }

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // L’ouverture ou le rechargement de l’application compte comme activité.
    registerActivity(true);

    return () => {
      disposed = true;
      clearTimers();
      toast.dismiss(WARNING_TOAST_ID);

      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }

      window.removeEventListener("storage", handleStorage);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [enabled, lang, timeoutMs, warningMs]);
}
