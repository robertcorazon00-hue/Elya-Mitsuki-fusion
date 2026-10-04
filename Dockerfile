FROM node:20-bookworm-slim

# ffmpeg : nécessaire pour yt-dlp (conversion audio/vidéo) et la synthèse vocale.
# python3 + pip : nécessaires pour installer yt-dlp (utilisé par commands/download.js).
# build-essential : au cas où sharp doive compiler depuis les sources sur cette plateforme.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    python3 \
    python3-pip \
    build-essential \
    ca-certificates \
    && pip3 install --break-system-packages -U yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Le disque persistant (Render : voir render.yaml) est monté sur /app/data.
# S'assure que le dossier existe même sans disque monté (Heroku, tests locaux).
RUN mkdir -p /app/data

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
