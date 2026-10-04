// mitsuki/scripts/test-davidcyril.js
//
// Teste en vrai, un par un, les 15 endpoints davidcyriltech jamais confirmés
// (apk, gdrive, mediafire, webdl, web2zip, web2apk, y2mate, compresspdf,
// pdf2jpg, ssweb, tgsticker, shorturl, ghstalk, flixier) en passant par les
// vraies fonctions de mitsuki/commands/pack-davidcyril.js — donc ça teste
// aussi le parsing (pickUrl/pickText), pas juste l'appel réseau brut.
//
// Usage : node mitsuki/scripts/test-davidcyril.js
// (lancé depuis la racine du projet, avec le vrai .env en place)
//
// Remplis TEST_INPUTS.gdrive, .mediafire et .tgsticker avec un vrai lien à
// toi avant de lancer — les autres ont déjà une valeur de test par défaut
// (sûre et publique) et seront testés tels quels.

import 'dotenv/config';
import * as pack from '../commands/pack-davidcyril.js';

const TEST_INPUTS = {
  apk: 'whatsapp',
  gdrive: '', // ⚠️ mets un vrai lien Google Drive partagé publiquement
  mediafire: '', // ⚠️ mets un vrai lien Mediafire
  webdl: 'https://example.com',
  web2zip: 'https://example.com',
  web2apk: 'https://example.com',
  y2mate: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  compresspdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  pdf2jpg: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  ssweb: 'https://example.com',
  tgsticker: '', // ⚠️ mets un vrai lien https://t.me/addstickers/...
  shorturl: 'https://example.com',
  ghstalk: 'torvalds',
  flixier: 'Bonjour, dis juste un mot pour tester.',
};

const TESTS = [
  ['apk', () => pack.apk(TEST_INPUTS.apk)],
  ['gdrive', () => pack.gdrive(TEST_INPUTS.gdrive)],
  ['mediafire', () => pack.mediafire(TEST_INPUTS.mediafire)],
  ['webdl', () => pack.webdl(TEST_INPUTS.webdl)],
  ['web2zip', () => pack.web2zip(TEST_INPUTS.web2zip)],
  ['web2apk', () => pack.web2apk(TEST_INPUTS.web2apk)],
  ['y2mate', () => pack.y2mate(TEST_INPUTS.y2mate)],
  ['compresspdf', () => pack.compresspdf(TEST_INPUTS.compresspdf)],
  ['pdf2jpg', () => pack.pdf2jpg(TEST_INPUTS.pdf2jpg)],
  ['ssweb', () => pack.ssweb(TEST_INPUTS.ssweb)],
  ['tgsticker', () => pack.tgsticker(TEST_INPUTS.tgsticker)],
  ['shorturl', () => pack.shorturl(TEST_INPUTS.shorturl)],
  ['ghstalk', () => pack.ghstalk(TEST_INPUTS.ghstalk)],
  ['flixier', () => pack.flixier(TEST_INPUTS.flixier)],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function preview(value) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return s.length > 300 ? s.slice(0, 300) + '…' : s;
}

async function main() {
  if (!process.env.DAVIDCYRIL_API_KEY) {
    console.log('⚠️  DAVIDCYRIL_API_KEY absente de .env — certains endpoints vont probablement répondre 401.\n');
  }

  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const [name, fn] of TESTS) {
    const neededInput = TEST_INPUTS[name];
    if (neededInput === '') {
      console.log(`⏭️  ${name} : ignoré (remplis TEST_INPUTS.${name} dans le script pour le tester)`);
      skipped++;
      continue;
    }

    process.stdout.write(`→ ${name}... `);
    try {
      const result = await fn();
      console.log('✅');
      console.log('   ' + preview(result));
      ok++;
    } catch (err) {
      console.log('❌');
      console.log('   ' + (err.message || String(err)));
      failed++;
    }
    await sleep(1000); // on reste poli avec l'API gratuite
  }

  console.log(`\n--- Résumé : ${ok} OK, ${failed} échec(s), ${skipped} ignoré(s) ---`);
}

main();
