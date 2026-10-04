// commands/download.js
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { API } from '../config.js';
import { buildCard } from '../card.js';

const execAsync = promisify(exec);

export async function tiktok(url) {
  if (!url || !url.includes('tiktok.com')) {
    throw new Error('Lien invalide — envoie un vrai lien TikTok.');
  }

  // 1ère tentative : tikwm
  try {
    const { data } = await axios.get(API.tikwm, { params: { url } });
    if (data && data.code === 0) {
      const d = data.data;
      return {
        caption: buildCard('TikTok Downloader', [
          ['Titre', d.title || 'Inconnu'],
          ['Auteur', d.author?.nickname || 'Inconnu'],
          ['Duree', d.duration ? `${d.duration}s` : '?'],
        ]),
        videoUrl: d.play,
      };
    }
  } catch (_) {
    // on retente avec l'API de secours ci-dessous
  }

  // 2e tentative (secours) : bk9.dev
  const { data } = await axios.get('https://api.bk9.dev/download/tiktok', {
    params: { url },
  });
  if (!data.status || !data.BK9 || !data.BK9.BK9) {
    throw new Error('Video TikTok introuvable ou lien invalide.');
  }
  return {
    caption: buildCard('TikTok Downloader', [['Statut', 'Telecharge avec succes']]),
    videoUrl: data.BK9.BK9,
  };
}

// ── Aide : télécharge un fichier distant vers un chemin local ──
async function downloadToFile(url, destPath) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  fs.writeFileSync(destPath, Buffer.from(res.data));
  return destPath;
}

// ── APIs de secours si yt-dlp échoue (vidéo géo-bloquée, YouTube change son algo, etc.) ──
async function getEliteProTechDownload(url, format) {
  const { data } = await axios.get('https://eliteprotech-apis.zone.id/ytdown', {
    params: { url, format },
    timeout: 30000,
  });
  if (!data?.success || !data?.downloadURL) throw new Error('EliteProTech: aucun resultat.');
  return { downloadUrl: data.downloadURL, title: data.title };
}

async function getYupraDownload(url, type) {
  const endpoint = type === 'mp3' ? 'ytmp3' : 'ytmp4';
  const { data } = await axios.get(`https://api.yupra.my.id/api/downloader/${endpoint}`, {
    params: { url },
    timeout: 30000,
  });
  if (!data?.success || !data?.data?.download_url) throw new Error('Yupra: aucun resultat.');
  return { downloadUrl: data.data.download_url, title: data.data.title };
}

// ── YouTube via yt-dlp installé localement (Termux/serveur) ──
// Prérequis : pkg install python && pip install -U yt-dlp --break-system-packages
// Si yt-dlp échoue, on retombe sur EliteProTech puis Yupra (moins fiables mais dépannent).
export async function ytmp3(url) {
  const outPath = path.join(os.tmpdir(), `yt_${Date.now()}.mp3`);

  try {
    await execAsync(
      `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outPath}" "${url}"`,
      { timeout: 120000 }
    );
    const { stdout: title } = await execAsync(`yt-dlp --get-title "${url}"`);
    return {
      caption: buildCard('YouTube MP3', [['Titre', title.trim() || 'Inconnu']]),
      audioUrl: outPath,
    };
  } catch (_) {
    // yt-dlp a échoué — on tente les APIs de secours
  }

  try {
    const { downloadUrl, title } = await getEliteProTechDownload(url, 'mp3');
    await downloadToFile(downloadUrl, outPath);
    return {
      caption: buildCard('YouTube MP3', [['Titre', title || 'Inconnu'], ['Source', 'EliteProTech (secours)']]),
      audioUrl: outPath,
    };
  } catch (_) {
    // on tente le dernier recours
  }

  const { downloadUrl, title } = await getYupraDownload(url, 'mp3');
  await downloadToFile(downloadUrl, outPath);
  return {
    caption: buildCard('YouTube MP3', [['Titre', title || 'Inconnu'], ['Source', 'Yupra (secours)']]),
    audioUrl: outPath,
  };
}

export async function ytmp4(url, quality = '360p') {
  const outPath = path.join(os.tmpdir(), `yt_${Date.now()}.mp4`);

  try {
    await execAsync(
      `yt-dlp -f "best[height<=480]" -o "${outPath}" "${url}"`,
      { timeout: 180000 }
    );
    const { stdout: title } = await execAsync(`yt-dlp --get-title "${url}"`);
    return {
      caption: buildCard('YouTube MP4', [
        ['Titre', title.trim() || 'Inconnu'],
        ['Qualite', quality],
      ]),
      videoUrl: outPath,
    };
  } catch (_) {
    // yt-dlp a échoué — on tente les APIs de secours
  }

  try {
    const { downloadUrl, title } = await getEliteProTechDownload(url, 'mp4');
    await downloadToFile(downloadUrl, outPath);
    return {
      caption: buildCard('YouTube MP4', [['Titre', title || 'Inconnu'], ['Source', 'EliteProTech (secours)']]),
      videoUrl: outPath,
    };
  } catch (_) {
    // on tente le dernier recours
  }

  const { downloadUrl, title } = await getYupraDownload(url, 'mp4');
  await downloadToFile(downloadUrl, outPath);
  return {
    caption: buildCard('YouTube MP4', [['Titre', title || 'Inconnu'], ['Source', 'Yupra (secours)']]),
    videoUrl: outPath,
  };
}

export async function instagram(url) {
  const { data } = await axios.get(`${API.maxxtechBase}/downloader`, {
    params: { url, apikey: API.maxxtechKey },
  });
  return {
    caption: buildCard('Instagram Downloader', [['Statut', 'Telecharge avec succes']]),
    mediaUrl: data.url || data.media,
  };
}

export async function facebook(url) {
  const { data } = await axios.get(`${API.maxxtechBase}/downloader`, {
    params: { url, apikey: API.maxxtechKey },
  });
  return {
    caption: buildCard('Facebook Downloader', [['Statut', 'Telecharge avec succes']]),
    mediaUrl: data.url || data.media,
  };
}

// .song <nom> — recherche et télécharge un titre depuis YouTube via yt-dlp (aucune API tierce)
export async function song(query) {
  const outPath = path.join(os.tmpdir(), `song_${Date.now()}.mp3`);
  const searchTerm = `ytsearch1:${query}`;

  await execAsync(
    `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outPath}" "${searchTerm}"`,
    { timeout: 120000 }
  );
  const { stdout: title } = await execAsync(`yt-dlp --get-title "${searchTerm}"`);

  return {
    caption: buildCard('Recherche musicale', [['Titre', title.trim() || query]]),
    audioUrl: outPath,
  };
}

// .mediafire <lien> — extrait le lien de téléchargement direct
export async function mediafire(url) {
  if (!url || !url.includes('mediafire.com')) {
    throw new Error('Lien invalide — envoie un vrai lien MediaFire.');
  }
  const { data } = await axios.get(API.mediafireWorker, { params: { url } });
  if (!data.success || !data.direct_download) {
    throw new Error(data.message || 'Fichier introuvable ou lien expire.');
  }
  return {
    caption: buildCard('MediaFire Downloader', [
      ['Fichier', data.file_name || 'Inconnu'],
      ['Taille', data.file_size || '?'],
    ]),
    mediaUrl: data.direct_download,
  };
}

export async function wallpaper(query) {
  const { data } = await axios.get(`${API.maxxtechBase}/4kwallpaper`, {
    params: { q: query, apikey: API.maxxtechKey },
  });
  return {
    caption: buildCard('Wallpaper 4K', [['Recherche', query]]),
    imageUrl: data.url || data.image,
  };
}

export async function waifu() {
  const { data } = await axios.get(API.waifuPics);
  return {
    caption: buildCard('Waifu Aleatoire', []),
    imageUrl: data.url,
  };
}

// .download / .video — détecte automatiquement la plateforme du lien et route
// vers le bon téléchargeur (TikTok, Instagram, Facebook, YouTube)
function detectPlatform(url) {
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/facebook\.com|fb\.watch/i.test(url)) return 'facebook';
  if (/youtu\.?be/i.test(url)) return 'youtube';
  return null;
}

export async function generic(url) {
  const platform = detectPlatform(url);
  if (platform === 'tiktok') return { type: 'video', ...(await tiktok(url)) };
  if (platform === 'instagram') return { type: 'image', ...(await instagram(url)) };
  if (platform === 'facebook') return { type: 'video', ...(await facebook(url)) };
  if (platform === 'youtube') return { type: 'video', ...(await ytmp4(url)) };
  throw new Error('Lien non reconnu — TikTok, Instagram, Facebook ou YouTube uniquement.');
}
