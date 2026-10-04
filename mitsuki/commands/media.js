// commands/media.js — .blur, .toimage, .tovideo, .tourl
// sharp est chargé à la demande (comme dans local.js) car il peut échouer à
// s'installer sur certains environnements (ex : Termux/Android).
// ffmpeg est installé par le Dockerfile ; s'il est absent, .tovideo le dit.
import axios from 'axios';
import FormData from 'form-data';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { API } from '../config.js';

const execFileAsync = promisify(execFile);
const UA = 'MitsukiKiryuMD/1.0 (bot WhatsApp)';

async function loadSharp() {
  try {
    return (await import('sharp')).default;
  } catch (_) {
    throw new Error("le traitement d'image (sharp) n'est pas disponible sur cet environnement");
  }
}

// Récupère le média d'un message cité (prioritaire) ou du message lui-même
// (commande envoyée en légende). `allowed` = types Baileys acceptés.
const ALL_MEDIA = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'];
export async function getQuotedMedia(msg, from, allowed = ALL_MEDIA) {
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = contextInfo?.quotedMessage;
  const candidates = [];
  if (quoted) {
    candidates.push({
      message: quoted,
      source: { key: { remoteJid: from, id: contextInfo.stanzaId, participant: contextInfo.participant }, message: quoted },
    });
  }
  if (msg.message) candidates.push({ message: msg.message, source: msg });

  for (const { message, source } of candidates) {
    const type = allowed.find((t) => message[t]);
    if (type) {
      const buffer = await downloadMediaMessage(source, 'buffer', {});
      return { buffer, type, media: message[type] };
    }
  }
  return null;
}

// ── .blur [intensité 1-60] ──
export async function blur(imageBuffer, level) {
  const sharp = await loadSharp();
  const sigma = Math.min(60, Math.max(1, Number(level) || 12));
  return sharp(imageBuffer).blur(sigma).jpeg({ quality: 85 }).toBuffer();
}

// ── .toimage — sticker -> image PNG (première image si animé) ──
export async function toimage(stickerBuffer) {
  const sharp = await loadSharp();
  return sharp(stickerBuffer).png().toBuffer();
}

// ── .tovideo — sticker animé -> mp4 ──
// ffmpeg (Debian 12) ne sait pas décoder les WebP animés : on extrait donc
// chaque image avec sharp, puis ffmpeg les assemble en vidéo.
export async function tovideo(stickerBuffer) {
  const sharp = await loadSharp();
  const meta = await sharp(stickerBuffer, { animated: true }).metadata();
  const pages = meta.pages || 1;
  if (pages < 2) throw new Error("ce sticker n'est pas animé — utilise .toimage pour l'avoir en image");

  const delays = Array.isArray(meta.delay) ? meta.delay.filter((d) => d > 0) : [];
  const avgDelay = delays.length ? delays.reduce((a, b) => a + b, 0) / delays.length : 100;
  const fps = Math.min(30, Math.max(5, Math.round(1000 / avgDelay)));

  const dir = await mkdtemp(path.join(os.tmpdir(), 'tovideo-'));
  try {
    const frames = Math.min(pages, 300);
    for (let i = 0; i < frames; i++) {
      const frame = await sharp(stickerBuffer, { page: i }).flatten({ background: '#ffffff' }).png().toBuffer();
      await writeFile(path.join(dir, `frame_${String(i).padStart(4, '0')}.png`), frame);
    }
    const out = path.join(dir, 'out.mp4');
    await execFileAsync('ffmpeg', [
      '-y', '-framerate', String(fps),
      '-i', path.join(dir, 'frame_%04d.png'),
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
      '-c:v', 'libx264', '-movflags', '+faststart', out,
    ], { timeout: 60000 });
    return await readFile(out);
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error("ffmpeg n'est pas installé sur cet environnement");
    throw new Error('conversion impossible');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// ── .tourl — envoie un média sur un hébergeur anonyme et renvoie le lien ──
// ⚠️ Le lien obtenu est PUBLIC (quiconque l'a peut ouvrir le fichier).
const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a',
  'application/pdf': 'pdf',
};

async function uploadTo(url, fieldName, extraFields, buffer, name, extraHeaders = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(extraFields)) form.append(k, v);
  form.append(fieldName, buffer, { filename: name });
  const { data } = await axios.post(url, form, {
    headers: { ...form.getHeaders(), ...extraHeaders },
    timeout: 60000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  const link = typeof data === 'string' ? data.trim() : '';
  return /^https?:\/\//.test(link) ? link : null;
}

export async function tourl(buffer, mimetype = '', fileName = '') {
  const mime = (mimetype || '').split(';')[0].trim();
  const ext = EXT[mime] || (fileName.includes('.') ? fileName.split('.').pop() : 'bin');
  const name = `file.${ext}`;

  try {
    const link = await uploadTo(API.catbox, 'fileToUpload', { reqtype: 'fileupload' }, buffer, name);
    if (link) return link;
  } catch (_) { /* on tente l'hébergeur de secours */ }

  try {
    const link = await uploadTo(API.zeroX0, 'file', {}, buffer, name, { 'User-Agent': UA });
    if (link) return link;
  } catch (_) { /* rien d'autre à tenter */ }

  throw new Error("échec de l'envoi vers l'hébergeur, réessaie plus tard");
}
