const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = [
  path.join(root, "src", "App.tsx"),
  path.join(root, "src", "components", "LoginAccessPage.tsx"),
  path.join(root, "src", "components", "LoginAccessPage.css"),
  path.join(root, "src", "styles", "gaptrack-global-theme.css"),
  path.join(root, "src", "index.css"),
].filter(fs.existsSync);

const replacements = [
  ["Ã€", "À"],
  ["Ã‚", "Â"],
  ["Ã‡", "Ç"],
  ["Ã‰", "É"],
  ["Ãˆ", "È"],
  ["ÃŠ", "Ê"],
  ["Ã‹", "Ë"],
  ["ÃŽ", "Î"],
  ["Ã”", "Ô"],
  ["Ã–", "Ö"],
  ["Ã™", "Ù"],
  ["Ã›", "Û"],
  ["Ãœ", "Ü"],

  ["Ã\xa0", "à"],
  ["Ã ", "à"],
  ["Ã ", "à "],
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

  ["dÃ©", "dé"],
  ["DÃ©", "Dé"],
  ["Ã©jÃ", "éjà"],
  ["dÃ©jÃ", "déjà"],
  ["dÃ©jÃ\xa0", "déjà"],
  ["dÃ©jÃ ", "déjà"],

  ["Ã©valuer", "évaluer"],
  ["Ã‰valuer", "Évaluer"],
  ["Ã‰tat", "État"],
  ["Ã©tat", "état"],
  ["Ã©cart", "écart"],
  ["Ã©carts", "écarts"],
  ["Ã©chéance", "échéance"],
  ["Ã©chÃ©ance", "échéance"],
  ["Ã©quipe", "équipe"],
  ["Ã©quipes", "équipes"],
  ["Ã©vidence", "évidence"],
  ["Ã©vidences", "évidences"],
  ["Ã©lÃ©ment", "élément"],
  ["Ã©lÃ©ments", "éléments"],
  ["Ã©lÃ©vÃ©e", "élevée"],
  ["Ã©levÃ©e", "élevée"],
  ["Ã©levé", "élevé"],
  ["Ã©levée", "élevée"],
  ["Ã©galement", "également"],

  ["Ã mettre", "à mettre"],
  ["Ã jour", "à jour"],
  ["Ã remplacer", "à remplacer"],
  ["Ã compléter", "à compléter"],
  ["Ã planifier", "à planifier"],
  ["Ã générer", "à générer"],
  ["Ã lancer", "à lancer"],
  ["Ã sécuriser", "à sécuriser"],
  ["Ã régulariser", "à régulariser"],
  ["Ã traiter", "à traiter"],
  ["Ã afficher", "à afficher"],
  ["Ã arbitrer", "à arbitrer"],
  ["Ã valoriser", "à valoriser"],
  ["Ã défendre", "à défendre"],
  ["Ã engager", "à engager"],
  ["Ã préciser", "à préciser"],
  ["Ã revoir", "à revoir"],
  ["Ã chacun", "à chacun"],
  ["Ã 0 point", "à 0 point"],
  ["Ã des", "à des"],
  ["Ã un", "à un"],
  ["Ã une", "à une"],
  ["Ã l", "à l"],

  ["jusqu'Ã", "jusqu'à"],
  ["jusqu’Ã", "jusqu’à"],
  ["lÃ,", "là,"],
  ["lÃ ", "là "],

  ["â€™", "’"],
  ["â€˜", "‘"],
  ["â€œ", "“"],
  ["â€�", "”"],
  ["â€“", "–"],
  ["â€”", "—"],
  ["â€¦", "…"],
  ["â€¢", "•"],
  ["â„¢", "™"],

  ["Å“", "œ"],
  ["Å’", "Œ"],

  ["Â·", "·"],
  ["Â°", "°"],
  ["Â©", "©"],
  ["Â®", "®"],
  ["Â«", "«"],
  ["Â»", "»"],
  ["Â\xa0", " "],
  ["Â ", " "],
  ["Â", ""],

  ["ï¼š", ":"],
];

for (const file of files) {
  let text = fs.readFileSync(file, "utf8");
  const original = text;

  for (const [bad, good] of replacements) {
    text = text.split(bad).join(good);
  }

  // Corrections finales ciblées sur les cas français fréquents.
  text = text
    .replace(/Contrôles à regarder/g, "Contrôles à regarder")
    .replace(/preuves à valider/g, "preuves à valider")
    .replace(/Plan à compléter/g, "Plan à compléter")
    .replace(/Mettre à jour/g, "Mettre à jour")
    .replace(/mise à jour/g, "mise à jour")
    .replace(/mis à jour/g, "mis à jour")
    .replace(/déjà/g, "déjà");

  if (text !== original) {
    if (!fs.existsSync(file + ".bak-encoding-final")) {
      fs.writeFileSync(file + ".bak-encoding-final", original, "utf8");
    }
    fs.writeFileSync(file, text, "utf8");
    console.log("Corrigé :", path.relative(root, file));
  }
}

console.log("Correction terminée.");
