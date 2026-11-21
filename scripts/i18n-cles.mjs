/**
 * Les clés qui manquent à une langue, et ce qu'il faut y traduire.
 *
 * Le compilateur refuse déjà un catalogue incomplet (chacun est typé
 * `Messages`), mais il le dit clé par clé, en anglais de compilateur, et
 * sans le texte français à traduire. Ce script le dit en une liste : pour
 * chaque langue, les clés absentes avec leur valeur française, les clés en
 * trop, et les `{paramètres}` qui ne sont pas ceux du français.
 *
 * Usage : node scripts/i18n-cles.mjs [en es nl de]
 * Sort en 1 au moindre écart, en 0 sinon. Node lit le TypeScript des
 * catalogues tel quel (types effacés), sans étape de compilation.
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const LANGUES = ['en', 'es', 'nl', 'de'];
const voulues = process.argv.slice(2);
const langues = voulues.length > 0 ? voulues : LANGUES;

const dossier = resolve(import.meta.dirname, '../src/i18n');
const charger = async (fichier, nom) =>
  (await import(pathToFileURL(resolve(dossier, fichier)).href))[nom];

/** Les feuilles d'un catalogue : `'board.carried.one' → 'Position…'`. */
function feuilles(objet, prefixe = '', sortie = new Map()) {
  for (const [cle, valeur] of Object.entries(objet)) {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle;
    if (valeur && typeof valeur === 'object') feuilles(valeur, chemin, sortie);
    else sortie.set(chemin, valeur);
  }
  return sortie;
}

const parametres = texte =>
  [...String(texte).matchAll(/\{(\w+)\}/g)]
    .map(m => m[1])
    .sort()
    .join(',');

const fr = feuilles(await charger('messages.ts', 'fr'));
let ecarts = 0;

for (const langue of langues) {
  if (!LANGUES.includes(langue)) {
    process.stderr.write(`langue inconnue : ${langue}\n`);
    process.exit(1);
  }
  const autre = feuilles(await charger(`messages.${langue}.ts`, langue));
  const manquantes = [...fr.keys()].filter(cle => !autre.has(cle));
  const enTrop = [...autre.keys()].filter(cle => !fr.has(cle));
  const parametresFaux = [...fr.keys()].filter(
    cle =>
      autre.has(cle) && parametres(fr.get(cle)) !== parametres(autre.get(cle))
  );

  const total = manquantes.length + enTrop.length + parametresFaux.length;
  ecarts += total;
  process.stdout.write(
    `\n${langue} : ${total === 0 ? 'complet' : `${total} écart(s)`}\n`
  );
  for (const cle of manquantes) {
    process.stdout.write(
      `  manque   ${cle}  ←  ${JSON.stringify(fr.get(cle))}\n`
    );
  }
  for (const cle of enTrop) {
    process.stdout.write(`  en trop  ${cle}\n`);
  }
  for (const cle of parametresFaux) {
    process.stdout.write(
      `  {…}      ${cle}  fr {${parametres(fr.get(cle))}} ≠ ${langue} {${parametres(autre.get(cle))}}\n`
    );
  }
}

process.exit(ecarts === 0 ? 0 : 1);
