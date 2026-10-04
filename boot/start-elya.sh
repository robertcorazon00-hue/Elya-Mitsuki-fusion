#!/data/data/com.termux/files/usr/bin/bash
# À copier dans ~/.termux/boot/ pour un démarrage automatique au redémarrage du téléphone.
# Nécessite l'app "Termux:Boot" installée (même source que Termux, ex: F-Droid).
#
# Installation :
#   mkdir -p ~/.termux/boot
#   cp boot/start-elya.sh ~/.termux/boot/
#   chmod +x ~/.termux/boot/start-elya.sh
# Puis ouvre l'app Termux:Boot une fois pour activer la permission.

termux-wake-lock

# Adapte ce chemin si ton dossier du bot n'est pas ~/elya-prime-bot
DIR="$HOME/elya-prime-bot"
SESSION="elya-prime"

sleep 10  # laisse le réseau du téléphone se stabiliser après le boot

if ! tmux has-session -t "$SESSION" 2>/dev/null; then
  tmux new-session -d -s "$SESSION" "cd '$DIR' && while true; do node server.js; sleep 5; done"
fi
