// elya-channel-posts.js — Planification de publications sur des chaînes WhatsApp,
// porté depuis "Digital Post AI" (ES Modules, socket séparé) vers CommonJS,
// greffé sur le socket partagé d'Elya Prime.
//
// Contrairement à l'original, les étapes du wizard (.projet / .programmer)
// acceptent le texte "brut" sans avoir à retaper le préfixe à chaque étape.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'channel-projects.json');
const MEDIA_DIR = path.join(DATA_DIR, 'channel-media');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (_) {
    return { projects: [] };
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── État de conversation (wizard multi-étapes), en mémoire, par expéditeur ──
const userStates = {};
function getState(from) { return userStates[from]; }
function setState(from, state) { userStates[from] = state; }
function clearState(from) { delete userStates[from]; }

// ── Projets ──
function listProjects() { return load().projects; }
function findProject(id) { return load().projects.find((p) => p.id === id); }
function findProjectByNewsletter(jid) { return load().projects.find((p) => p.newsletter === jid); }

function createProject(name, newsletter) {
  const data = load();
  const project = { id: Date.now().toString(), name, newsletter, posts: [], createdAt: new Date().toISOString() };
  data.projects.push(project);
  save(data);
  return project;
}

function deleteProject(id) {
  const data = load();
  const idx = data.projects.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  data.projects.splice(idx, 1);
  save(data);
  return true;
}

// ── Publications ──
// media (optionnel) : { buffer, type: 'image'|'video', mimetype } — enregistré sur disque,
// seul le chemin est gardé en JSON (un Buffer ne se sérialise pas correctement en JSON)
function addPost(projectId, { content, media, scheduledAt }) {
  const data = load();
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return null;

  const postId = Date.now().toString();
  let mediaPath = null;
  let mediaType = null;
  if (media) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    const ext = media.type === 'video' ? 'mp4' : 'jpg';
    mediaPath = path.join(MEDIA_DIR, `${postId}.${ext}`);
    fs.writeFileSync(mediaPath, media.buffer);
    mediaType = media.type;
  }

  const post = {
    id: postId,
    content: content || '',
    mediaPath,
    mediaType,
    scheduledAt: scheduledAt || new Date().toISOString(),
    sent: false,
    createdAt: new Date().toISOString(),
  };
  project.posts.push(post);
  save(data);
  return post;
}

function deletePost(projectId, postId) {
  const data = load();
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return false;
  const idx = project.posts.findIndex((p) => p.id === postId);
  if (idx === -1) return false;
  const [removed] = project.posts.splice(idx, 1);
  save(data);
  if (removed?.mediaPath && fs.existsSync(removed.mediaPath)) {
    try { fs.unlinkSync(removed.mediaPath); } catch (_) {}
  }
  return true;
}

// ── Planificateur : vérifie toutes les 30s les posts arrivés à échéance ──
let schedulerStarted = false;
function startScheduler(sock) {
  if (schedulerStarted) return;
  schedulerStarted = true;

  setInterval(async () => {
    const data = load();
    const now = new Date();
    let changed = false;

    for (const project of data.projects) {
      for (const post of project.posts) {
        if (post.sent) continue;
        if (post.scheduledAt && new Date(post.scheduledAt) > now) continue;

        try {
          let messageContent;
          if (post.mediaPath && fs.existsSync(post.mediaPath)) {
            const buffer = fs.readFileSync(post.mediaPath);
            messageContent = post.mediaType === 'video'
              ? { video: buffer, caption: post.content }
              : { image: buffer, caption: post.content };
          } else {
            messageContent = { text: post.content };
          }
          await sock.sendMessage(project.newsletter, messageContent);
          post.sent = true;
          post.sentAt = new Date().toISOString();
          changed = true;
        } catch (err) {
          console.error(`Erreur envoi post programmé (projet ${project.name}):`, err.message);
        }
      }
    }
    if (changed) save(data);
  }, 30000);
}

// Force une vérification immédiate (commande .forcecheck équivalent)
async function forceCheck(sock) {
  const data = load();
  const now = new Date();
  let count = 0;
  for (const project of data.projects) {
    for (const post of project.posts) {
      if (!post.sent && (!post.scheduledAt || new Date(post.scheduledAt) <= now)) count++;
    }
  }
  return count;
}

export {
  getState, setState, clearState,
  listProjects, findProject, findProjectByNewsletter, createProject, deleteProject,
  addPost, deletePost,
  startScheduler, forceCheck,
};
