#!/data/data/com.termux/files/usr/bin/bash
# Lance Elya Prime dans une session tmux qui redémarre automatiquement si le bot plante.
# Usage : bash start.sh

SESSION="elya-prime"
DIR="$(cd "$(dirname "$0")" && pwd)"

# Empêche Android de mettre Termux en veille
termux-wake-lock

# Si la session tourne déjà, ne rien faire
if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "✅ La session '$SESSION' tourne déjà. Pour la voir : tmux attach -t $SESSION"
  exit 0
fi

# Lance le bot dans tmux avec boucle de redémarrage auto
tmux new-session -d -s "$SESSION" "cd '$DIR' && while true; do \
  echo '🎀 Démarrage d'\''Elya Prime (Elya AI + Mitsuki MD)...'; \
  node server.js; \
  echo '⚠️  Le bot s'\''est arrêté (code '\$?'). Redémarrage dans 5s... (Ctrl+C pour annuler)'; \
  sleep 5; \
done"

echo "✅ Elya Prime lancée dans tmux (session: $SESSION)"
echo "👉 Pour voir les logs / le code de jumelage : tmux attach -t $SESSION"
echo "👉 Pour détacher sans arrêter le bot : Ctrl+B puis D"
