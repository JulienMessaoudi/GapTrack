import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const roots = ['src', 'backend/src'].map((p) => path.join(projectRoot, p)).filter((p) => fs.existsSync(p));
const allowedExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.md']);
const ignoredDirs = new Set(['node_modules', '.git', 'dist', 'build', '.vite', 'coverage']);

// Windows-1252 extra characters, needed for sequences like â€™, â€œ, â€, â€“, â€¦
const cp1252 = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

function toCp1252Bytes(value) {
  const bytes = [];
  for (const ch of value) {
    const code = ch.codePointAt(0);
    if (code <= 0xff) bytes.push(code);
    else if (cp1252.has(code)) bytes.push(cp1252.get(code));
    else return null;
  }
  return Buffer.from(bytes);
}

function decodeMojibakeRun(run) {
  const bytes = toCp1252Bytes(run);
  if (!bytes) return run;
  const decoded = bytes.toString('utf8');

  // Do not keep a repair that introduces replacement characters or removes content.
  if (!decoded || decoded.includes('\uFFFD')) return run;
  return decoded;
}

function repairText(text) {
  let output = text;

  // Fix runs containing typical mojibake markers: Ã, Â, â.
  // Examples: CrÃ©er -> Créer, Ã‰valuation -> Évaluation, dâ€™audit -> d’audit.
  output = output.replace(/[^\s"'`<>{}\[\]();,]*[ÃÂâ][^\s"'`<>{}\[\]();,]*/g, (run) => {
    const repaired = decodeMojibakeRun(run);
    return repaired;
  });

  // Common leftover cases for broken non-breaking spaces.
  output = output.replace(/Â\s/g, ' ');
  output = output.replace(/Â\u00a0/g, ' ');

  return output;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

if (!roots.length) {
  console.error('Aucun dossier src ou backend/src trouvé. Lance ce script depuis la racine du projet.');
  process.exit(1);
}

let changed = 0;
let scanned = 0;

for (const root of roots) {
  for (const file of walk(root)) {
    if (!allowedExt.has(path.extname(file))) continue;
    scanned += 1;

    const before = fs.readFileSync(file, 'utf8');
    const after = repairText(before);

    if (after !== before) {
      const backup = `${file}.bak-encoding`;
      if (!fs.existsSync(backup)) fs.writeFileSync(backup, before, 'utf8');
      fs.writeFileSync(file, after, 'utf8');
      changed += 1;
      console.log(`Corrigé: ${path.relative(projectRoot, file)}`);
    }
  }
}

console.log(`\nAnalyse terminée: ${scanned} fichier(s) analysé(s), ${changed} fichier(s) corrigé(s).`);
console.log('Des sauvegardes .bak-encoding ont été créées pour chaque fichier modifié.');
