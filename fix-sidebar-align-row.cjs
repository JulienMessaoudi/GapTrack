const fs = require("fs");
const path = require("path");

const cssPath = fs.existsSync(path.join(process.cwd(), "src", "styles", "gaptrack-global-theme.css"))
  ? path.join(process.cwd(), "src", "styles", "gaptrack-global-theme.css")
  : path.join(process.cwd(), "src", "index.css");

let css = fs.readFileSync(cssPath, "utf8");

const patch = `

/* =========================================================
   Sidebar final row alignment override
   Icône + texte parfaitement alignés
   ========================================================= */

.sidebar-nav-item {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  width: 100% !important;
  height: 58px !important;
  padding: 0 22px !important;
  gap: 16px !important;
  text-align: left !important;
}

.sidebar-nav-icon {
  width: 24px !important;
  height: 24px !important;
  min-width: 24px !important;
  flex: 0 0 24px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  place-items: unset !important;
}

.sidebar-nav-icon svg {
  width: 24px !important;
  height: 24px !important;
  min-width: 24px !important;
  margin: 0 !important;
}

.sidebar-nav-label {
  display: block !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
  text-align: left !important;
  justify-self: unset !important;
  align-self: center !important;
  margin: 0 !important;
  transform: none !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.sidebar-nav-item-collapsed {
  justify-content: center !important;
  padding: 0 !important;
  gap: 0 !important;
}

.sidebar-nav-item-collapsed .sidebar-nav-icon {
  margin: 0 !important;
}
`;

css += patch;
fs.writeFileSync(cssPath, css, "utf8");

console.log("OK - Alignement sidebar forcé en flex.");
