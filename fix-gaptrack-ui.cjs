const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

// 1) Supprimer langue + thème dans la toolbar principale App.tsx
const appPath = path.join(root, "src", "App.tsx");
let app = read(appPath);

if (app) {
  app = app.replace(
    /\s*\{\/\* Lang \/ Theme \*\/\}\s*<Select value=\{lang\} onValueChange=\{\(v\) => setLang\(v as LangKey\)\}>[\s\S]*?<\/Select>\s*<Button\s+size="sm"\s+variant="outline"\s+className="px-2"\s+onClick=\{\(\) => setTheme\(theme === "dark" \? "light" : "dark"\)\}[\s\S]*?<\/Button>/,
    ""
  );

  // Supprime aussi la commande cachée "Basculer le theme" dans la palette de commande
  app = app.replace(
    /\s*\{\s*label:\s*['"]Basculer le theme['"],\s*action:\s*\(\)\s*=>\s*onToggleTheme\(\)\s*\},?/g,
    ""
  );

  write(appPath, app);
}

// 2) Supprimer langue + thème sur la page de connexion
const loginPath = path.join(root, "src", "components", "LoginAccessPage.tsx");
let login = read(loginPath);

if (login) {
  login = login.replace(
    /\s*<div className="gt-top-actions" aria-label="Préférences">[\s\S]*?<\/div>\s*<main className="gt-shell">/,
    "\n      <main className=\"gt-shell\">"
  );

  write(loginPath, login);
}

// 3) Ajouter un correctif CSS robuste pour la sidebar + cacher les restes éventuels
const themePath = fs.existsSync(path.join(root, "src", "styles", "gaptrack-global-theme.css"))
  ? path.join(root, "src", "styles", "gaptrack-global-theme.css")
  : path.join(root, "src", "index.css");

let css = read(themePath);

const patch = `

/* =========================================================
   GapTrack UI fixes: sidebar alignment + remove lang/theme
   ========================================================= */

/* Cache définitivement les contrôles langue / thème s'il en reste dans le JSX */
.gt-top-actions,
[aria-label="Language"],
[aria-label="Switch to light theme"],
[aria-label="Switch to dark theme"],
[title="Light"],
[title="Dark"] {
  display: none !important;
}

/* Garde l'expérience visuelle sombre cohérente */
:root,
.dark {
  color-scheme: dark;
}

/* Correction de la barre latérale */
.sidebar-shell {
  padding-left: 12px !important;
  padding-right: 12px !important;
}

/* Les boutons de navigation doivent être alignés à gauche, pas centrés */
.sidebar-shell button:not([aria-label]) {
  width: 100% !important;
  justify-content: flex-start !important;
  text-align: left !important;
  gap: 12px !important;
  padding-left: 16px !important;
  padding-right: 16px !important;
}

/* Icônes stables et alignées */
.sidebar-shell button:not([aria-label]) svg {
  width: 20px !important;
  height: 20px !important;
  min-width: 20px !important;
  flex: 0 0 20px !important;
  margin: 0 !important;
}

/* Texte stable */
.sidebar-shell button:not([aria-label]) span {
  margin-left: 0 !important;
  text-align: left !important;
}

/* Les boutons uniquement icône, comme réduire/ouvrir la sidebar, restent centrés */
.sidebar-shell button[aria-label] {
  justify-content: center !important;
}
`;

if (!css.includes("GapTrack UI fixes: sidebar alignment")) {
  css += patch;
  write(themePath, css);
}

console.log("OK - Sidebar corrigée, langue/thème supprimés.");
