import "../index.css";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";

type LoadedApp = {
  default?: ComponentType;
};

export default function ClientAppMount() {
  const [AppComponent, setAppComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;

    import("../App")
      .then((module: LoadedApp | any) => {
        if (!alive) return;

        const Component = module.default || module.App;

        if (!Component) {
          setError("Impossible de trouver le composant App dans src/App.tsx.");
          return;
        }

        setAppComponent(() => Component);
      })
      .catch((err) => {
        console.error("Erreur pendant le chargement de l’application GapTrack :", err);
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(135deg, #071126, #081a38)",
          color: "#f8fbff",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: 24,
        }}
      >
        <section
          style={{
            maxWidth: 720,
            border: "1px solid rgba(160, 180, 220, .24)",
            borderRadius: 18,
            padding: 28,
            background: "rgba(8, 18, 38, .76)",
          }}
        >
          <h1 style={{ margin: "0 0 12px" }}>Erreur de chargement GapTrack</h1>
          <p style={{ color: "#c8d2e4" }}>
            L’application React n’a pas pu être chargée.
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              color: "#ffb4b4",
              background: "rgba(255,255,255,.06)",
              padding: 16,
              borderRadius: 12,
              overflow: "auto",
            }}
          >
            {error}
          </pre>
        </section>
      </main>
    );
  }

  if (!AppComponent) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(135deg, #071126, #081a38)",
          color: "#f8fbff",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <section
          style={{
            minWidth: 360,
            textAlign: "center",
            border: "1px solid rgba(160, 180, 220, .24)",
            borderRadius: 18,
            padding: 34,
            background: "rgba(8, 18, 38, .76)",
          }}
        >
          <img
            src="/icon-192.png"
            alt=""
            width="54"
            height="54"
            style={{ marginBottom: 18 }}
          />
          <h1 style={{ margin: "0 0 10px", fontSize: 28 }}>GapTrack</h1>
          <p style={{ margin: 0, color: "#c8d2e4" }}>
            Chargement de l’espace sécurisé...
          </p>
        </section>
      </main>
    );
  }

  return (
    <>
      <Toaster richColors closeButton position="top-center" />
      <AppComponent />
    </>
  );
}
