const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.tsx");

if (!fs.existsSync(appPath)) {
  console.error("src/App.tsx introuvable.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const newSidebar = [
'function Sidebar({ current, onNavigate, lang }: { current: string; onNavigate: (k: string) => void; lang: LangKey }) {',
'  const t = I18N[lang];',
'  const [collapsed, setCollapsed] = useState(false);',
'',
'  const items = [',
'    { key: "listing", label: t.listing, icon: <ListChecks className="h-5 w-5" /> },',
'    { key: "weekly", label: lang === "fr" ? "Cette semaine" : "This week", icon: <Lightbulb className="h-5 w-5" /> },',
'    { key: "plan", label: t.actionPlan, icon: <ListTodo className="h-5 w-5" /> },',
'    { key: "risks", label: lang === "fr" ? "Risques" : "Risks", icon: <AlertTriangle className="h-5 w-5" /> },',
'    { key: "dashboard", label: t.dashboard, icon: <BarChart3 className="h-5 w-5" /> },',
'    { key: "journal", label: lang === "fr" ? "Journal d’audit" : "Audit log", icon: <History className="h-5 w-5" /> },',
'  ];',
'',
'  const toggleLabel = collapsed',
'    ? (lang === "fr" ? "Déplier la sidebar" : "Expand sidebar")',
'    : (lang === "fr" ? "Replier la sidebar" : "Collapse sidebar");',
'',
'  return (',
'    <motion.aside',
'      initial={false}',
'      animate={{ width: collapsed ? 76 : 256 }}',
'      className="sidebar-shell shrink-0 min-h-[calc(100vh-64px)] bg-background/60 hidden md:flex md:flex-col no-print overflow-hidden"',
'      aria-label="Navigation principale"',
'    >',
'      <div className="gt-side-inner-v4">',
'        <div className={"gt-side-brand-v4 " + (collapsed ? "gt-side-brand-v4-collapsed" : "")}>',
'          <div className="gt-side-brand-left-v4">',
'            <Shield className="gt-side-brand-icon-v4" />',
'            <AnimatePresence initial={false}>',
'              {!collapsed && (',
'                <motion.div',
'                  key="sidebar-brand"',
'                  initial={{ opacity: 0, x: -8 }}',
'                  animate={{ opacity: 1, x: 0 }}',
'                  exit={{ opacity: 0, x: -8 }}',
'                  className="gt-side-brand-text-v4"',
'                >',
'                  <div className="gt-side-brand-name-v4">GapTrack</div>',
'                  <div className="gt-side-brand-sub-v4">Audit GRC/SSI</div>',
'                </motion.div>',
'              )}',
'            </AnimatePresence>',
'          </div>',
'',
'          {!collapsed && (',
'            <Button',
'              type="button"',
'              variant="ghost"',
'              size="icon"',
'              onClick={() => setCollapsed(true)}',
'              aria-label={toggleLabel}',
'              title={toggleLabel}',
'              className="gt-side-collapse-v4"',
'            >',
'              <PanelLeftClose className="h-4 w-4" />',
'            </Button>',
'          )}',
'        </div>',
'',
'        <div className="gt-side-divider-v4" />',
'',
'        {collapsed && (',
'          <Button',
'            type="button"',
'            variant="ghost"',
'            size="icon"',
'            onClick={() => setCollapsed(false)}',
'            aria-label={toggleLabel}',
'            title={toggleLabel}',
'            className="gt-side-open-v4"',
'          >',
'            <PanelLeftOpen className="h-4 w-4" />',
'          </Button>',
'        )}',
'',
'        <nav className="gt-side-nav-v4">',
'          {items.map((it) => {',
'            const active = current === it.key;',
'',
'            return (',
'              <button',
'                key={it.key}',
'                type="button"',
'                className={',
'                  "gt-side-link-v4 " +',
'                  (active ? "gt-side-link-v4-active " : "") +',
'                  (collapsed ? "gt-side-link-v4-collapsed" : "")',
'                }',
'                onClick={() => onNavigate(it.key)}',
'                aria-label={collapsed ? it.label : undefined}',
'                aria-current={active ? "page" : undefined}',
'                title={collapsed ? it.label : undefined}',
'              >',
'                <span className="gt-side-link-icon-v4">{it.icon}</span>',
'                <AnimatePresence initial={false}>',
'                  {!collapsed && (',
'                    <motion.span',
'                      key={it.key + "-label"}',
'                      initial={{ opacity: 0, x: -8 }}',
'                      animate={{ opacity: 1, x: 0 }}',
'                      exit={{ opacity: 0, x: -8 }}',
'                      className="gt-side-link-label-v4"',
'                    >',
'                      {it.label}',
'                    </motion.span>',
'                  )}',
'                </AnimatePresence>',
'              </button>',
'            );',
'          })}',
'        </nav>',
'      </div>',
'    </motion.aside>',
'  );',
'}',
'',
'',
'function MobileNav'
].join("\n");

const sidebarRegex = /function Sidebar\([\s\S]*?\nfunction MobileNav/;

if (!sidebarRegex.test(app)) {
  console.error("Impossible de trouver la fonction Sidebar complète dans src/App.tsx.");
  process.exit(1);
}

app = app.replace(sidebarRegex, newSidebar);
fs.writeFileSync(appPath, app, "utf8");

const cssPath = fs.existsSync(path.join(process.cwd(), "src", "styles", "gaptrack-global-theme.css"))
  ? path.join(process.cwd(), "src", "styles", "gaptrack-global-theme.css")
  : path.join(process.cwd(), "src", "index.css");

let css = fs.readFileSync(cssPath, "utf8");

const patch = `

/* =========================================================
   GapTrack Sidebar V4 - alignement définitif
   ========================================================= */

.sidebar-shell {
  padding: 0 !important;
}

.gt-side-inner-v4 {
  width: 100%;
  height: 100%;
  padding: 24px 18px;
}

.gt-side-brand-v4 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 72px;
}

.gt-side-brand-v4-collapsed {
  justify-content: center;
}

.gt-side-brand-left-v4 {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.gt-side-brand-icon-v4 {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
}

.gt-side-brand-text-v4 {
  min-width: 0;
  line-height: 1.1;
}

.gt-side-brand-name-v4 {
  font-size: 18px;
  font-weight: 800;
  color: #f8fbff;
}

.gt-side-brand-sub-v4 {
  margin-top: 5px;
  font-size: 13px;
  color: #94a3b8;
}

.gt-side-collapse-v4,
.gt-side-open-v4 {
  flex: 0 0 auto !important;
}

.gt-side-open-v4 {
  margin: 0 auto 14px !important;
}

.gt-side-divider-v4 {
  height: 1px;
  margin: 18px 0 24px;
  background: rgba(255, 255, 255, 0.08);
}

.gt-side-nav-v4 {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gt-side-link-v4 {
  appearance: none !important;
  border: 0 !important;
  width: 100% !important;
  height: 56px !important;
  padding: 0 16px !important;
  margin: 0 !important;
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 14px !important;
  border-radius: 10px !important;
  background: transparent !important;
  color: #e5edf8 !important;
  text-align: left !important;
  font-size: 16px !important;
  font-weight: 750 !important;
  line-height: 1 !important;
  cursor: pointer !important;
  box-shadow: none !important;
}

.gt-side-link-v4:hover {
  background: rgba(255, 255, 255, 0.06) !important;
}

.gt-side-link-v4-active {
  background: linear-gradient(180deg, #68aefe, #5298f4) !important;
  color: #06101f !important;
  box-shadow:
    0 16px 34px rgba(47, 113, 255, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.35) !important;
}

.gt-side-link-icon-v4 {
  width: 24px !important;
  height: 24px !important;
  min-width: 24px !important;
  flex: 0 0 24px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin: 0 !important;
  padding: 0 !important;
}

.gt-side-link-icon-v4 svg {
  width: 24px !important;
  height: 24px !important;
  min-width: 24px !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
}

.gt-side-link-label-v4 {
  display: block !important;
  width: auto !important;
  max-width: 100% !important;
  min-width: 0 !important;
  flex: 0 1 auto !important;
  margin: 0 !important;
  padding: 0 !important;
  text-align: left !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  transform: none !important;
}

.gt-side-link-v4-collapsed {
  justify-content: center !important;
  padding: 0 !important;
  gap: 0 !important;
}

.gt-side-link-v4-collapsed .gt-side-link-icon-v4 {
  margin: 0 !important;
}
`;

if (!css.includes("GapTrack Sidebar V4")) {
  css += patch;
}

fs.writeFileSync(cssPath, css, "utf8");

console.log("OK - Fonction Sidebar remplacée et alignement V4 appliqué.");
