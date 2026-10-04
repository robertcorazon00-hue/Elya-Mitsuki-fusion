// commands/local.js — Commandes ne nécessitant aucune API externe
import QRCode from 'qrcode';
import { evaluate } from 'mathjs';
import { PDFDocument } from 'pdf-lib';
import { buildCard } from '../card.js';

// .sticker — convertit une image reçue (ou citée) en sticker webp
// sharp est chargé seulement ici (pas au démarrage) car il peut échouer
// à se compiler correctement sur certains environnements (ex: Termux/Android)
export async function sticker(imageBuffer) {
  let sharp;
  try {
    const mod = await import('sharp');
    sharp = mod.default;
  } catch (err) {
    throw new Error(
      "La conversion en sticker n'est pas disponible sur cet appareil (sharp ne s'est pas installé correctement)."
    );
  }

  const webpBuffer = await sharp(imageBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp()
    .toBuffer();
  return webpBuffer;
}

// .qrcode <texte/lien> — génère un QR code en image
export async function qrcode(text) {
  const buffer = await QRCode.toBuffer(text, { width: 512 });
  return { imageBuffer: buffer, caption: buildCard('QR Code', [['Contenu', text]]) };
}

// .calc <expression> — calcule une expression mathématique
export function calc(expression) {
  try {
    const result = evaluate(expression);
    return buildCard('Calculatrice', [
      ['Expression', expression],
      ['Resultat', result],
    ]);
  } catch (err) {
    return buildCard('Calculatrice', [['Erreur', 'Expression invalide.']]);
  }
}

// .time — affiche l'heure actuelle
export function time() {
  const now = new Date();
  return buildCard('Heure Actuelle', [
    ['Date', now.toLocaleDateString('fr-FR')],
    ['Heure', now.toLocaleTimeString('fr-FR')],
  ]);
}

const JOKES = [
  "Pourquoi les plongeurs plongent-ils toujours en arriere ? Parce que sinon ils tombent dans le bateau.",
  "Quel est le comble pour un electricien ? De ne pas etre au courant.",
  "Pourquoi les poissons detestent l'ordinateur ? A cause des poissons d'avril.",
];
export function joke() {
  const pick = JOKES[Math.floor(Math.random() * JOKES.length)];
  return buildCard('Blague', [['Texte', pick]]);
}

const QUIZZES = [
  { q: 'Quelle est la capitale du Senegal ?', a: 'Dakar' },
  { q: 'Combien font 7 x 8 ?', a: '56' },
  { q: 'Quel est le plus grand ocean du monde ?', a: 'Pacifique' },
];
export function quiz() {
  const pick = QUIZZES[Math.floor(Math.random() * QUIZZES.length)];
  return { card: buildCard('Quiz', [['Question', pick.q]]), answer: pick.a };
}

// .rate <texte> — note humoristique aleatoire sur 10
export function rate(subject) {
  const score = Math.floor(Math.random() * 11);
  return buildCard('Note', [[subject || 'Ca', `${score}/10`]]);
}

// .ship <a> <b> — pourcentage de compatibilite pour rire
export function ship(a, b) {
  const pct = Math.floor(Math.random() * 101);
  return buildCard('Compatibilite', [[`${a} + ${b}`, `${pct}%`]]);
}

// .love / .love2 — messages doux aléatoires (cycle sur 10 variantes)
// Requis par plugins/love.js — absentes du zip d'origine (bug préexistant :
// .love et .love2 plantaient en appelant des fonctions qui n'existaient pas).
const LOVE_LINES = [
  (n) => `${n}, ta simple présence rend cette discussion plus belle. 💛`,
  (n) => `Dis-moi ${n}, tu utilises un aimant ou c'est naturel chez toi ? 🧲`,
  (n) => `${n}, si la gentillesse avait un visage, ce serait le tien.`,
  (n) => `Petit rappel du jour : ${n} mérite qu'on prenne soin de lui/elle. ✨`,
  (n) => `${n}, ton sourire devrait être classé patrimoine national.`,
  (n) => `On dirait que ${n} a été codé(e) avec un peu trop de charme.`,
  (n) => `${n}, continue d'illuminer les groupes comme tu le fais.`,
  (n) => `Une pensée pour ${n}, juste parce que ça fait du bien.`,
  (n) => `${n}, si t'étais un emoji tu serais 🌟, clairement.`,
  (n) => `${n}, la journée est déjà meilleure grâce à toi.`,
];
export function love(name, index) {
  const n = name || 'Toi';
  return LOVE_LINES[index % LOVE_LINES.length](n);
}

const LOVE2_LINES = [
  (n) => `${n} + toi = combo parfait, non ? 😌`,
  (n) => `${n}, sérieusement, comment tu fais pour être aussi cool ?`,
  (n) => `${n} mérite un câlin virtuel 🤗 (et un vrai, si possible).`,
  (n) => `${n}, garde ce sourire, il est précieux.`,
  (n) => `Petit coucou affectueux à ${n} 💌`,
  (n) => `${n}, t'es le genre de personne qu'on est content de croiser.`,
  (n) => `Aujourd'hui c'est officiel : ${n} est adorable.`,
  (n) => `${n}, ne change rien, t'es déjà top.`,
  (n) => `Une dose de douceur pour ${n} : 🌸🌸🌸`,
  (n) => `${n}, continue d'être toi-même, ça marche très bien.`,
];
export function love2(name, index) {
  const n = name || 'Toi';
  return LOVE2_LINES[index % LOVE2_LINES.length](n);
}
// Reconstruit par déduction de son usage (buffer image -> pdfBuffer), pas
// retrouvé dans le zip d'origine ; s'inspire du même patron que elya/media.js.
export async function topdf(imageBuffer) {
  const pdfDoc = await PDFDocument.create();
  let image;
  try {
    image = await pdfDoc.embedJpg(imageBuffer);
  } catch (_) {
    image = await pdfDoc.embedPng(imageBuffer);
  }
  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  return Buffer.from(await pdfDoc.save());
}
