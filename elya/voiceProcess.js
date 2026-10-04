// elya/voiceProcess.js — Démarre automatiquement voice/service.py (Whisper + edge-tts)
// en sous-processus au lancement du bot, pour ne pas avoir besoin d'un terminal séparé.
// Repli gracieux : si Python ou les dépendances manquent, le bot continue de tourner
// normalement — seules les fonctionnalités vocales locales seront indisponibles
// (generateTTS et la transcription se rabattent alors sur leurs anciennes méthodes).
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let voiceProcess = null;

export function startVoiceService() {
  if ((process.env.AUTO_START_VOICE_SERVICE || 'true').toLowerCase() === 'false') {
    console.log('[voice] Démarrage automatique désactivé (AUTO_START_VOICE_SERVICE=false).');
    return;
  }

  const scriptPath = path.join(__dirname, '..', 'voice', 'service.py');
  const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');

  try {
    voiceProcess = spawn(pythonBin, [scriptPath], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    console.warn('[voice] Impossible de lancer le service vocal (' + pythonBin + ' introuvable ?) :', err.message);
    voiceProcess = null;
    return;
  }

  voiceProcess.stdout.on('data', (data) => process.stdout.write(`[voice] ${data}`));
  voiceProcess.stderr.on('data', (data) => process.stderr.write(`[voice] ${data}`));

  voiceProcess.on('error', (err) => {
    console.warn('[voice] Service vocal indisponible (python/dépendances manquantes ?) :', err.message);
    voiceProcess = null;
  });

  voiceProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.warn(`[voice] Le service vocal s'est arrêté de façon inattendue (code ${code}).`);
    }
    voiceProcess = null;
  });

  const stopAndExit = () => { stopVoiceService(); process.exit(0); };
  process.on('SIGINT', stopAndExit);
  process.on('SIGTERM', stopAndExit);
}

export function stopVoiceService() {
  if (voiceProcess) {
    voiceProcess.kill();
    voiceProcess = null;
  }
}

export function isVoiceProcessRunning() {
  return voiceProcess !== null;
}
