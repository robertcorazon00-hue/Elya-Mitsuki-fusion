import * as channelPosts from '../../elya-channel-posts.js';

export default [
  {
    command: 'projet',
    category: 'GENERAL',
    description: 'Configure un nouveau projet de chaîne WhatsApp',
    handler: async ({ sock, chatId }) => {
      channelPosts.setState(chatId, { type: 'projet', step: 'waiting_project_name' });
      await sock.sendMessage(chatId, { text: '📝 Configuration d\'un nouveau projet\n\nDonne le *nom du projet* :' });
    },
  },
  {
    command: 'programmer',
    category: 'GENERAL',
    description: 'Programme une publication sur un projet existant',
    handler: async ({ sock, chatId }) => {
      const projects = channelPosts.listProjects();
      if (!projects.length) {
        await sock.sendMessage(chatId, { text: '• Aucun projet configuré. Crée-en un avec !projet d\'abord.' });
        return;
      }
      const liste = projects.map((p, i) => `${i + 1}. ${p.name} (${p.newsletter})`).join('\n');
      channelPosts.setState(chatId, { type: 'programmer', step: 'waiting_post_project' });
      await sock.sendMessage(chatId, { text: `📢 Quel projet ?\n\n${liste}\n\nRéponds avec le numéro.` });
    },
  },
  {
    command: 'projets',
    category: 'GENERAL',
    description: 'Liste les projets et leurs publications',
    handler: async ({ sock, chatId }) => {
      const projects = channelPosts.listProjects();
      if (!projects.length) {
        await sock.sendMessage(chatId, { text: '• Aucun projet configuré pour l\'instant. Tape !projet pour en créer un.' });
        return;
      }
      let texte = '📋 *Projets et publications*\n\n';
      for (const p of projects) {
        const enAttente = p.posts.filter(post => !post.sent);
        const envoyees = p.posts.filter(post => post.sent);
        texte += `📌 *${p.name}* (${p.newsletter})\n`;
        texte += `   En attente : ${enAttente.length} | Envoyées : ${envoyees.length}\n`;
        for (const post of enAttente) {
          texte += `   • [${post.id}] ${post.content.slice(0, 40) || '(média sans texte)'} — prévu le ${new Date(post.scheduledAt).toLocaleString('fr-FR')}\n`;
        }
        texte += '\n';
      }
      await sock.sendMessage(chatId, { text: texte.trim() });
    },
  },
  {
    command: 'delprojet',
    category: 'GENERAL',
    description: 'Supprime un projet ou une publication en attente',
    handler: async ({ sock, chatId, args }) => {
      const projects = channelPosts.listProjects();
      if (!args[1]) {
        if (!projects.length) { await sock.sendMessage(chatId, { text: '• Aucun projet à supprimer.' }); return; }
        const liste = projects.map((p, i) => `${i + 1}. ${p.name} — id: ${p.id}`).join('\n');
        await sock.sendMessage(chatId, { text: `• Usage : !delprojet <id>\n(ou !delprojet <id_projet> <id_post> pour supprimer juste une publication en attente)\n\n${liste}` });
        return;
      }
      if (args[2]) {
        const ok = channelPosts.deletePost(args[1], args[2]);
        await sock.sendMessage(chatId, { text: ok ? '✅ Publication supprimée.' : '• Publication introuvable.' });
      } else {
        const ok = channelPosts.deleteProject(args[1]);
        await sock.sendMessage(chatId, { text: ok ? '✅ Projet supprimé.' : '• Projet introuvable.' });
      }
    },
  },
];
