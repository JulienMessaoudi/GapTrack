const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.tsx");
let app = fs.readFileSync(appPath, "utf8");

const oldBlock = `<Button
            key={it.key}
            variant={active ? "default" : "ghost"}
            className={"h-10 min-w-0 " + (collapsed ? "justify-center px-0" : "justify-start gap-3")}
            onClick={() => onNavigate(it.key)}
            aria-label={collapsed ? it.label : undefined}
            aria-current={active ? "page" : undefined}
            title={collapsed ? it.label : undefined}
          >
            {it.icon}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key={\`${it.key}-label\`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="truncate"
                >
                  {it.label}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>`;

const newBlock = `<button
            key={it.key}
            type="button"
            className={
              "sidebar-nav-item " +
              (active ? "sidebar-nav-item-active " : "") +
              (collapsed ? "sidebar-nav-item-collapsed" : "")
            }
            onClick={() => onNavigate(it.key)}
            aria-label={collapsed ? it.label : undefined}
            aria-current={active ? "page" : undefined}
            title={collapsed ? it.label : undefined}
          >
            <span className="sidebar-nav-icon">{it.icon}</span>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key={\`${it.key}-label\`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="sidebar-nav-label"
                >
                  {it.label}
                </motion.span>
              )}
            </AnimatePresence>
          </button>`;

if (!app.includes(oldBlock)) {
  console.error("Bloc exact non trouvé. Vérifie que src/App.tsx contient encore l'ancien code de Sidebar.");
  process.exit(1);
}

app = app.replace(oldBlock, newBlock);
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

.sidebar-shell .sidebar-divider {
  margin: 18px 0 22px !important;
}

.sidebar-nav-item {
  width: 100%;
  height: 58px;
  display: grid;
  grid-template-columns: 42px 1fr;
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
  transition:
    background-color 160ms ease,
    color 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
}

.sidebar-nav-item:hover {
  background: rgba(255, 255, 255, 0.055);
  transform: translateX(1px);
}

.sidebar-nav-item-active {
  color: #06101f;
  background: linear-gradient(180deg, #6aaeff, #4d95f3);
  box-shadow:
    0 18px 36px rgba(47, 113, 255, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.34);
}

.sidebar-nav-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex: 0 0 42px;
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

.sidebar-nav-item-collapsed .sidebar-nav-icon {
  width: 42px;
}
`;

if (!css.includes("Sidebar navigation final alignment fix")) {
  css += patch;
  fs.writeFileSync(cssPath, css, "utf8");
}

console.log("OK - Sidebar corrigée avec classes dédiées.");
