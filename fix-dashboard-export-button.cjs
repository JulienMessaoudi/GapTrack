const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.tsx");

if (!fs.existsSync(appPath)) {
  console.error("src/App.tsx introuvable.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

fs.writeFileSync(appPath + ".backup-export-button", app, "utf8");

// Supprime l'état utilisé uniquement pour ouvrir/fermer le bouton "Plus"
app = app.replace(
  /\s*const \[showDashboardSecondary, setShowDashboardSecondary\] = useState\(false\);\s*/g,
  "\n"
);

// Remplace le bloc Voir les domaines + Plus + Export caché
const oldBlockRegex = /<Button size="sm" onClick=\{\(\) => document\.getElementById\("dashboard-domain-results"\)\?\.scrollIntoView\(\{ block: "start", behavior: "smooth" \}\)\}>\s*<BarChart3 className="h-4 w-4 mr-1" \/>\s*\{lang === "fr" \? "Voir les domaines" : "View domains"\}\s*<\/Button>\s*<Button\s+variant=\{showDashboardSecondary \? "default" : "outline"\}\s+size="sm"\s+onClick=\{\(\) => setShowDashboardSecondary\(\(v\) => !v\)\}\s+aria-expanded=\{showDashboardSecondary\}\s*>\s*\{lang === "fr" \? "Plus" : "More"\}\s*<\/Button>\s*\{showDashboardSecondary && \(\s*<div className="rounded-xl border bg-background\/60 p-2">\s*<Button variant="outline" size="sm" onClick=\{onExport\}>\{t\.export\}<\/Button>\s*<\/div>\s*\)\}/s;

const newBlock = `<Button size="sm" onClick={() => document.getElementById("dashboard-domain-results")?.scrollIntoView({ block: "start", behavior: "smooth" })}>
              <BarChart3 className="h-4 w-4 mr-1" />
              {lang === "fr" ? "Voir les domaines" : "View domains"}
            </Button>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-1" />
              {t.export}
            </Button>`;

if (!oldBlockRegex.test(app)) {
  console.error("Bloc Dashboard non trouvé.");
  console.error("Cherche manuellement dans src/App.tsx : Voir les domaines / showDashboardSecondary / t.export");
  process.exit(1);
}

app = app.replace(oldBlockRegex, newBlock);

fs.writeFileSync(appPath, app, "utf8");

console.log("OK - Le bouton Exporter le rapport PDF est maintenant affiché directement à côté de Voir les domaines.");
console.log("Sauvegarde créée : src/App.tsx.backup-export-button");
