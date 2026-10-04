// elya/media.js — Génération de contenu (synthèse vocale, PDF), pour que les plugins
// concernés n'aient pas besoin de dépendre de server.js.
import axios from 'axios';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { BOT_NAME } from './config.js';

// ─── Synthèse vocale (TTS) ───
// 1) Essaie d'abord le service vocal local (voice/service.py, edge-tts — bien meilleure
//    qualité, pas de limite de caractères stricte).
// 2) Se rabat sur Google Translate TTS si le service local ne répond pas (non installé,
//    pas encore démarré, dépendances Python manquantes...).
const VOICE_SERVICE_URL = `http://127.0.0.1:${process.env.VOICE_PORT || 5001}`;

export async function generateTTS(text, lang) {
  if (lang === 'fr') {
    try {
      const res = await axios.post(
        `${VOICE_SERVICE_URL}/speak`,
        { text: text.slice(0, 800) },
        { responseType: 'arraybuffer', timeout: 8000 }
      );
      return Buffer.from(res.data);
    } catch (e) {
      // Service vocal local indisponible : on continue avec le repli ci-dessous, sans planter.
    }
  }
  return generateTTSFallback(text, lang);
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
