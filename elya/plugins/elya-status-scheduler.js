// elya-status-scheduler.js — Statuts WhatsApp programmés (!programmerstatut),
// même principe que elya-send-scheduler.js : démarré une seule fois depuis
// server.js, vérifie toutes les 30s les statuts arrivés à échéance.
//
// Persistance : elya/store.js (scheduledStatusStore) pour les métadonnées ;
// les fichiers média (photo/vidéo) sont sur disque dans STATUS_MEDIA_DIR.
// ⚠️ Sur Render (plan gratuit), le disque est effacé à chaque redéploiement —
// un statut média programmé avant un redéploiement et pas encore publié
// perdra son fichier. Rien à faire côté code, c'est une limite de l'hébergement.

import fs from 'fs';
import { scheduledStatusStore, contactsStore, historyStore, saveData, STATUS_MEDIA_DIR } from './elya/store.js';

const CHECK_INTERVAL_MS = 30_000;

export function listPendingStatus() {
  return scheduledStatusStore.items
    .filter((it) => it.status === 'pending')
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

export async function addScheduledStatus({ type, content, mediaFileName, mimetype, caption, scheduledAt, createdBy }) {
  const item = {
    id: scheduledStatusStore.nextId++,
    type, // 'text' | 'image' | 'video'
    content: content || null, // texte (pour type text)
    mediaFileName: mediaFileName || null, // nom de fichier dans STATUS_MEDIA_DIR (pour image/video)
    mimetype: mimetype || null,
    caption: caption || null,
    scheduledAt: scheduledAt.toISOString(),
    createdAt: new Date().toISOString(),
    createdBy,
    status: 'pending',
    error: null,
  };
  scheduledStatusStore.items.push(item);
  await saveData('scheduledStatus', scheduledStatusStore);
  return item;
}

export async function cancelScheduledStatus(id) {
  const item = scheduledStatusStore.items.find((it) => it.id === id && it.status === 'pending');
  if (!item) return null;
  item.status = 'cancelled';
  await saveData('scheduledStatus', scheduledStatusStore);
  if (item.mediaFileName) {
    try { fs.unlinkSync(`${STATUS_MEDIA_DIR}/${item.mediaFileName}`); } catch (_) { /* déjà absent, pas grave */ }
  }
  return item;
}

function getStatusJidList() {
  let list = Object.keys(contactsStore);
  if (list.length === 0) list = Object.keys(historyStore).filter((id) => id.endsWith('@s.whatsapp.net'));
  return list;
}

let schedulerStarted = false;
export function startStatusScheduler(sock) {
  if (schedulerStarted) return;
  schedulerStarted = true;

  setInterval(async () => {
    const now = new Date();
    const due = scheduledStatusStore.items.filter(
      (it) => it.status === 'pending' && new Date(it.scheduledAt) <= now
    );
    if (due.length === 0) return;

    for (const item of due) {
      const statusJidList = getStatusJidList();
      try {
        if (statusJidList.length === 0) throw new Error('aucun contact connu à qui montrer le statut');

        let content;
        if (item.type === 'text') {
          content = { text: item.content };
        } else {
          const mediaPath = `${STATUS_MEDIA_DIR}/${item.mediaFileName}`;
          if (!fs.existsSync(mediaPath)) throw new Error('fichier média introuvable (effacé par un redéploiement ?)');
          const buffer = fs.readFileSync(mediaPath);
          content = item.type === 'image'
            ? { image: buffer, caption: item.caption || undefined }
            : { video: buffer, caption: item.caption || undefined };
        }

        await sock.sendMessage('status@broadcast', content, { statusJidList });
        item.status = 'sent';
        item.sentAt = new Date().toISOString();
        if (item.mediaFileName) {
          try { fs.unlinkSync(`${STATUS_MEDIA_DIR}/${item.mediaFileName}`); } catch (_) { /* nettoyage, pas grave si échoue */ }
        }
      } catch (err) {
        item.status = 'failed';
        item.error = err.message;
      }
      await saveData('scheduledStatus', scheduledStatusStore);

      try {
        const notif = item.status === 'sent'
          ? `✅ Statut programmé #${item.id} publié (visible par ${getStatusJidList().length} contact(s)).`
          : `❌ Échec du statut programmé #${item.id} : ${item.error}`;
        await sock.sendMessage(item.createdBy, { text: notif });
      } catch (e) {
        console.error('Erreur notification statut programmé:', e.message);
      }
    }
  }, CHECK_INTERVAL_MS);
}
