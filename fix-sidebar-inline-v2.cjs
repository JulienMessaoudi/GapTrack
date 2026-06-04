const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.tsx");

if (!fs.existsSync(appPath)) {
  console.error("src/App.tsx introuvable.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

// Sauvegarde
fs.writeFileSync(appPath + ".backup-sidebar", app, "utf8");

function findSidebarStart(source) {
  const direct = source.indexOf("function Sidebar");
  if (direct !== -1) return direct;

  const markers = [
    "gt-side-nav-v4",
    "gt-side-inner-v4",
    "sidebar-shell",
    "Navigation principale",
    "onNavigate(it.key)",
  ];

  for (const marker of markers) {
    const markerIndex = source.indexOf(marker);
    if (markerIndex !== -1) {
      const functionIndex = source.lastIndexOf("function ", markerIndex);
      if (functionIndex !== -1) return functionIndex;
    }
  }

  return -1;
}

function findFunctionEnd(source, start) {
  const firstBrace = source.indexOf("{", start);
  if (firstBrace === -1) return -1;

  let depth = 0;
  let inString = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = firstBrace; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      if (char === "\\") {
        i++;
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }

    if (char === "{") depth++;
    if (char === "}") depth--;

    if (depth === 0) {
      return i + 1;
    }
  }

  return -1;
}

const start = findSidebarStart(app);

if (start === -1) {
  console.error("Sidebar introuvable. Envoie-moi le résultat de cette commande :");
  console.error('Select-String -Path .\\src\\App.tsx -Pattern "Sidebar|sidebar-shell|gt-side|Navigation principale" -Context 3,3');
  process.exit(1);
}

const end = findFunctionEnd(app, start);

if (end === -1) {
  console.error("Début de Sidebar trouvé, mais impossible de trouver la fin du composant.");
  process.exit(1);
}

const newSidebar = `
function Sidebar({ current, onNavigate, lang }: { current: string; onNavigate: (k: string) => void; lang: LangKey }) {
  const t = I18N[lang];

  const items = [
    { key: "listing", label: t.listing, icon: <ListChecks className="h-5 w-5" /> },
    { key: "weekly", label: lang === "fr" ? "Cette semaine" : "This week", icon: <Lightbulb className="h-5 w-5" /> },
    { key: "plan", label: t.actionPlan, icon: <ListTodo className="h-5 w-5" /> },
    { key: "risks", label: lang === "fr" ? "Risques" : "Risks", icon: <AlertTriangle className="h-5 w-5" /> },
    { key: "dashboard", label: t.dashboard, icon: <BarChart3 className="h-5 w-5" /> },
    { key: "journal", label: lang === "fr" ? "Journal d’audit" : "Audit log", icon: <History className="h-5 w-5" /> },
  ];

  return (
    <aside
      className="hidden md:block no-print"
      style={{
        width: 256,
        minWidth: 256,
        minHeight: "calc(100vh - 64px)",
        padding: "24px 18px",
        background: "rgba(8, 18, 38, 0.86)",
        borderRight: "1px solid rgba(148, 163, 184, 0.14)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <Shield style={{ width: 28, height: 28, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#f8fbff", lineHeight: 1 }}>
            GapTrack
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#94a3b8", lineHeight: 1.2 }}>
            Audit GRC/SSI
          </div>
        </div>
      </div>

      <div
        style={{
          height: 1,
          background: "rgba(148, 163, 184, 0.14)",
          marginBottom: 26,
        }}
      />

      <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it) => {
          const active = current === it.key;

          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onNavigate(it.key)}
              aria-current={active ? "page" : undefined}
              style={{
                width: "100%",
                height: 56,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 14,
                padding: "0 18px",
                border: 0,
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                background: active
                  ? "linear-gradient(180deg, #68aefe, #5298f4)"
                  : "transparent",
                color: active ? "#06101f" : "#e5edf8",
                boxShadow: active ? "0 16px 34px rgba(47, 113, 255, 0.28)" : "none",
                fontSize: 15,
                fontWeight: 750,
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  width: 24,
                  minWidth: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {it.icon}
              </span>

              <span
                style={{
                  display: "block",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
`;

app = app.slice(0, start) + newSidebar + app.slice(end);

fs.writeFileSync(appPath, app, "utf8");

console.log("OK - Sidebar remplacée proprement.");
console.log("Sauvegarde créée : src/App.tsx.backup-sidebar");
