const fs = require("fs");
const path = require("path");

const root = process.cwd();

const folders = [
  path.join(root, "src"),
  path.join(root, "backend", "src"),
];

const extensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".css",
  ".json",
  ".html",
  ".md",
]);

const replacements = [
  ["Ã€", "À"],
  ["Ã‚", "Â"],
  ["Ã‡", "Ç"],
  ["Ã‰", "É"],
  ["Ãˆ", "È"],
  ["ÃŠ", "Ê"],
  ["Ã‹", "Ë"],
  ["ÃŽ", "Î"],
  ["Ã�", "Ï"],
  ["Ã”", "Ô"],
  ["Ã–", "Ö"],
  ["Ã™", "Ù"],
  ["Ã›", "Û"],
  ["Ãœ", "Ü"],

  ["Ã ", "à"],
  ["Ã¢", "â"],
  ["Ã§", "ç"],
  ["Ã©", "é"],
  ["Ã¨", "è"],
  ["Ãª", "ê"],
  ["Ã«", "ë"],
  ["Ã®", "î"],
  ["Ã¯", "ï"],
  ["Ã´", "ô"],
  ["Ã¶", "ö"],
  ["Ã¹", "ù"],
  ["Ã»", "û"],
  ["Ã¼", "ü"],

  ["Å“", "œ"],
  ["Å’", "Œ"],

  ["â€™", "'"],
  ["â€˜", "'"],
  ["â€œ", "“"],
  ["â€�", "”"],
  ["â€", "”"],
  ["â€“", "–"],
  ["â€”", "—"],
  ["â€¦", "…"],
  ["â€¢", "•"],
  ["â„¢", "™"],

  ["Â·", "·"],
  ["Â°", "°"],
  ["Â©", "©"],
  ["Â®", "®"],
  ["Â«", "«"],
  ["Â»", "»"],
  ["Â ", " "],
  ["Â", ""],
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === ".git" ||
        entry.name === ".vite"
      ) {
        continue;
      }

      files = files.concat(walk(full));
      continue;
    }

    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      files.push(full);
    }
  }

  return files;
}

function fixText(input) {
  let output = input;

  for (const [bad, good] of replacements) {
    output = output.split(bad).join(good);
  }

  return output;
}

let changed = 0;

for (const folder of folders) {
  for (const file of walk(folder)) {
    const original = fs.readFileSync(file, "utf8");
    const fixed = fixText(original);

    if (fixed !== original) {
      if (!fs.existsSync(file + ".bak-mojibake")) {
        fs.writeFileSync(file + ".bak-mojibake", original, "utf8");
      }

      fs.writeFileSync(file, fixed, "utf8");
      changed++;
      console.log("Corrigé :", path.relative(root, file));
    }
  }
}

console.log("");
console.log("Correction terminée.");
console.log("Fichiers modifiés :", changed);
