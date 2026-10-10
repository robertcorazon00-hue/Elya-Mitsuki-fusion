// elya/media.js — Génération de contenu (synthèse vocale, PDF), pour que les plugins
// concernés n'aient pas besoin de dépendre de server.js.
import axios from 'axios';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { BOT_NAME } from './config.js';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

// ─── Synthèse vocale (TTS) ───
// 1) Essaie d'abord le service vocal local (voice/service.py, edge-tts — bien meilleure
//    qualité, pas de limite de caractères stricte).
// 2) Se rabat sur Google Translate TTS si le service local ne répond pas (non installé,
//    pas encore démarré, dépendances Python manquantes...).
const VOICE_SERVICE_URL = `http://127.0.0.1:${process.env.VOICE_PORT || 5001}`;

// WhatsApp n'affiche une note vocale "cliquable" (bulle ronde avec forme d'onde) que
// si le fichier est en ogg/opus. Un mp3 envoyé avec ptt:true est accepté à l'envoi mais
// échoue souvent à la lecture côté destinataire ("ce fichier n'existe pas / indisponible").
// On repasse donc systématiquement par ffmpeg (déjà installé dans l'image Docker) pour
// garantir un format lisible, quelle que soit la source (service local ou repli Google).
async function convertToOggOpus(inputBuffer) {
  const tmpDir = os.tmpdir();
  const id = crypto.randomUUID();
  const inputPath = path.join(tmpDir, `tts-in-${id}`);
  const outputPath = path.join(tmpDir, `tts-out-${id}.ogg`);
  await fs.writeFile(inputPath, inputBuffer);
  try {
    await new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', [
        '-y', '-i', inputPath,
        '-c:a', 'libopus', '-ar', '16000', '-ac', '1', '-b:a', '32k',
        outputPath,
      ]);
      let stderr = '';
      ff.stderr.on('data', (d) => { stderr += d.toString(); });
      ff.on('error', reject);
      ff.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-300)}`));
      });
    });
    return await fs.readFile(outputPath);
  } finally {
    fs.unlink(inputPath).catch(() => {});
    fs.unlink(outputPath).catch(() => {});
  }
}

// Nettoie le texte avant synthèse vocale : markdown (gras/italique/barré/code),
// emojis, et espaces en trop — sinon le moteur TTS les lit tels quels
// ("étoile", le nom de l'emoji, etc.) au lieu de les ignorer.
export function cleanTextForSpeech(text) {
  return text
    // Markdown WhatsApp/standard : *gras*, _italique_, ~barré~, `code`, ```bloc```
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_~`]/g, '')
    // Emojis et pictos (couvre la grande majorité des plages Unicode emoji)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateTTS(text, lang) {
  const spoken = cleanTextForSpeech(text) || text; // si le nettoyage vide tout (texte 100% emoji), on garde l'original en dernier recours
  let raw;
  if (lang === 'fr') {
    try {
      const res = await axios.post(
        `${VOICE_SERVICE_URL}/speak`,
        { text: spoken.slice(0, 800) },
        { responseType: 'arraybuffer', timeout: 8000 }
      );
      raw = Buffer.from(res.data);
    } catch (e) {
      // Service vocal local indisponible : on continue avec le repli ci-dessous, sans planter.
    }
  }
  if (!raw) raw = await generateTTSFallback(spoken, lang);
  try {
    return await convertToOggOpus(raw);
  } catch (e) {
    // Si la conversion échoue pour une raison quelconque, on renvoie quand même le
    // buffer d'origine plutôt que de planter toute la réponse.
    console.error('Erreur conversion ogg/opus pour la note vocale:', e.message);
    return raw;
  }
}

async function generateTTSFallback(text, lang) {
  const cleanText = text.slice(0, 200);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(cleanText)}`;
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  });
  return Buffer.from(res.data);
}

// ─── Transcription vocale (voix -> texte) ───
// Essaie le service vocal local (Whisper, gratuit, illimité) ; l'appelant (server.js)
// se charge lui-même du repli sur AssemblyAI si ça échoue.
export async function transcribeLocally(audioBuffer) {
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('audio', audioBuffer, { filename: 'audio.ogg' });
  const res = await axios.post(`${VOICE_SERVICE_URL}/transcribe`, form, {
    headers: form.getHeaders(),
    timeout: 30000,
  });
  if (res.data?.error) throw new Error(res.data.error);
  return res.data?.text || '';
}

// ─── Génération de PDF depuis un texte ───
export async function generatePDF(text, title) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  const pageSize = [595, 842]; // A4
  let page = pdfDoc.addPage(pageSize);
  let y = 792;

  page.drawText(title || `Document ${BOT_NAME}`, { x: margin, y, size: 16, font: fontBold, color: rgb(0.35, 0.25, 0.55) });
  y -= 30;

  const maxWidth = pageSize[0] - margin * 2;
  const paragraphs = text.split(/\n+/);
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    const lines = [];
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (font.widthOfTextAtSize(test, 11) > maxWidth) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    if (lines.length === 0) lines.push('');

    for (const l of lines) {
      if (y < margin) {
        page = pdfDoc.addPage(pageSize);
        y = 792;
      }
      page.drawText(l, { x: margin, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
      y -= 16;
    }
    y -= 8;
  }

  return Buffer.from(await pdfDoc.save());
}
