const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.tsx");

if (!fs.existsSync(appPath)) {
  console.error("src/App.tsx introuvable.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const sidebarButtonRegex = /<Button\s+key=\{it\.key\}[\s\S]*?<\/Button>/;

const newSidebarButton = [
'          <button',
'            key={it.key}',
'            type="button"',
'            className={',
'              "sidebar-nav-item " +',
'              (active ? "sidebar-nav-item-active " : "") +',
'              (collapsed ? "sidebar-nav-item-collapsed" : "")',
'            }',
'            onClick={() => onNavigate(it.key)}',
'            aria-label={collapsed ? it.label : undefined}',
'            aria-current={active ? "page" : undefined}',
'            title={collapsed ? it.label : undefined}',
'          >',
'            <span className="sidebar-nav-icon">{it.icon}</span>',
'            <AnimatePresence initial={false}>',
'              {!collapsed && (',
'                <motion.span',
'                  key={`${it.key}-label`}',
'                  initial={{ opacity: 0, x: -8 }}',
'                  animate={{ opacity: 1, x: 0 }}',
'                  exit={{ opacity: 0, x: -8 }}',
'                  className="sidebar-nav-label"',
'                >',
'                  {it.label}',
'                </motion.span>',
'              )}',
'            </AnimatePresence>',
'          </button>'
].join("\n");

if (!sidebarButtonRegex.test(app)) {
  console.error("Bloc de navigation Sidebar non trouvé dans App.tsx.");
  console.error("Le fichier a peut-être déjà été modifié ou la structure est différente.");
  process.exit(1);
}

app = app.replace(sidebarButtonRegex, newSidebarButton);
fs.writeFileSync(appPath, app, "utf8");

const cssPath = fs.existsSync(path.join(process.cwd(), "src", "styles", "gaptrack-global-theme.css"))
  ? path.join(process.cwd(), "src", "styles", "gaptrack-global-theme.css")
  : path.join(process.cwd(), "src", "index.css");

let css = fs.readFileSync(cssPath, "utf8");

const patch = `

/* =========================================================
   Sidebar navigation final alignment fix
   ========================================================= */

.sidebar-shell {
  width: 256px;
  padding: 18px 18px !important;
}

.sidebar-nav-item {
  width: 100%;
  height: 58px;
  display: grid;
  grid-template-columns: 44px 1fr;
  align-items: center;
  column-gap: 14px;
  padding: 0 18px;
  margin: 0 0 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #dbe5f4;
  text-align: left;
  cursor: pointer;
  font-weight: 750;
  font-size: 16px;
  line-height: 1;
}

.sidebar-nav-item:hover {
  background: rgba(255, 255, 255, 0.055);
}

.sidebar-nav-item-active {
  color: #06101f;
  background: linear-gradient(180deg, #6aaeff, #4d95f3);
  box-shadow:
    0 18px 36px rgba(47, 113, 255, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.34);
}

.sidebar-nav-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex: 0 0 44px;
}

.sidebar-nav-icon svg {
  width: 23px !important;
  height: 23px !important;
  margin: 0 !important;
}

.sidebar-nav-label {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-nav-item-collapsed {
  grid-template-columns: 1fr;
  justify-items: center;
  padding: 0;
}
`;

if (!css.includes("Sidebar navigation final alignment fix")) {
  css += patch;
  fs.writeFileSync(cssPath, css, "utf8");
}

console.log("OK - Sidebar corrigée.");
