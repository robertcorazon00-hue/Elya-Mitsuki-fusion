// shared/db.js — Couche de stockage pluggable, commune à Mitsuki et Elya.
//
// Par défaut (aucune variable d'environnement de BDD définie) : chaque "namespace"
// est stocké dans son propre fichier JSON, exactement comme avant — comportement
// inchangé pour qui ne configure rien.
//
// Si MONGO_URL, POSTGRES_URL ou MYSQL_URL est définie (dans cet ordre de priorité),
// les mêmes données sont stockées dans la base correspondante à la place, un
// "document" par namespace (une ligne/document = un store complet, ex: "mitsuki",
// "memory", "history"...). Utile en hébergement où le disque ne persiste pas
// entre redéploiements (Railway, Render, Fly sans volume...).
//
// API : loadDoc(namespace, jsonFilePath, defaultValue) / saveDoc(namespace, jsonFilePath, data)
// Le jsonFilePath n'est utilisé QUE par le backend JSON (fallback), pour garder
// exactement les mêmes emplacements de fichiers qu'avant.

import fs from 'fs';
import path from 'path';

let backendPromise = null;

function resolveBackend() {
  if (backendPromise) return backendPromise;
  backendPromise = (async () => {
    if (process.env.MONGO_URL) {
      try {
        return await createMongoBackend(process.env.MONGO_URL);
      } catch (err) {
        console.error('[db] Échec de connexion MongoDB, repli sur le stockage JSON :', err.message);
      }
    } else if (process.env.POSTGRES_URL) {
      try {
        return await createPostgresBackend(process.env.POSTGRES_URL);
      } catch (err) {
        console.error('[db] Échec de connexion PostgreSQL, repli sur le stockage JSON :', err.message);
      }
    } else if (process.env.MYSQL_URL) {
      try {
        return await createMysqlBackend(process.env.MYSQL_URL);
      } catch (err) {
        console.error('[db] Échec de connexion MySQL, repli sur le stockage JSON :', err.message);
      }
    }
    return createJsonBackend();
  })();
  return backendPromise;
}

// ── Backend JSON (par défaut) ──────────────────────────────────────────────
function createJsonBackend() {
  return {
    name: 'json',
    async load(namespace, jsonFilePath, defaultValue) {
      try {
        const dir = path.dirname(jsonFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(jsonFilePath)) {
          fs.writeFileSync(jsonFilePath, JSON.stringify(defaultValue, null, 2));
          return structuredClone(defaultValue);
        }
        return JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
      } catch (err) {
        console.error(`[db:json] Erreur de lecture pour "${namespace}" (${jsonFilePath}) :`, err.message);
        return structuredClone(defaultValue);
      }
    },
    async save(namespace, jsonFilePath, data) {
      try {
        const dir = path.dirname(jsonFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2));
      } catch (err) {
        console.error(`[db:json] Erreur d'écriture pour "${namespace}" (${jsonFilePath}) :`, err.message);
      }
    },
  };
}

// ── Backend MongoDB ─────────────────────────────────────────────────────────
async function createMongoBackend(url) {
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(url, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(); // nom de la base pris depuis l'URL de connexion
  const collection = db.collection('bot_store');
  console.log('[db] Connecté à MongoDB.');
  return {
    name: 'mongodb',
    async load(namespace, jsonFilePath, defaultValue) {
      const doc = await collection.findOne({ _id: namespace });
      if (!doc) {
        await collection.insertOne({ _id: namespace, data: defaultValue });
        return structuredClone(defaultValue);
      }
      return doc.data;
    },
    async save(namespace, jsonFilePath, data) {
      await collection.updateOne({ _id: namespace }, { $set: { data } }, { upsert: true });
    },
  };
}

// ── Backend PostgreSQL ───────────────────────────────────────────────────────
async function createPostgresBackend(url) {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: url });
  await pool.query(
    'CREATE TABLE IF NOT EXISTS bot_store (namespace TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())'
  );
  console.log('[db] Connecté à PostgreSQL.');
  return {
    name: 'postgres',
    async load(namespace, jsonFilePath, defaultValue) {
      const { rows } = await pool.query('SELECT data FROM bot_store WHERE namespace = $1', [namespace]);
      if (rows.length === 0) {
        await pool.query('INSERT INTO bot_store (namespace, data) VALUES ($1, $2)', [namespace, defaultValue]);
        return structuredClone(defaultValue);
      }
      return rows[0].data;
    },
    async save(namespace, jsonFilePath, data) {
      await pool.query(
        'INSERT INTO bot_store (namespace, data, updated_at) VALUES ($1, $2, now()) ' +
        'ON CONFLICT (namespace) DO UPDATE SET data = $2, updated_at = now()',
        [namespace, data]
      );
    },
  };
}

// ── Backend MySQL ─────────────────────────────────────────────────────────────
async function createMysqlBackend(url) {
  const { default: mysql } = await import('mysql2/promise');
  const pool = mysql.createPool(url);
  await pool.query(
    'CREATE TABLE IF NOT EXISTS bot_store (namespace VARCHAR(191) PRIMARY KEY, data JSON NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)'
  );
  console.log('[db] Connecté à MySQL.');
  return {
    name: 'mysql',
    async load(namespace, jsonFilePath, defaultValue) {
      const [rows] = await pool.query('SELECT data FROM bot_store WHERE namespace = ?', [namespace]);
      if (rows.length === 0) {
        await pool.query('INSERT INTO bot_store (namespace, data) VALUES (?, ?)', [namespace, JSON.stringify(defaultValue)]);
        return structuredClone(defaultValue);
      }
      // mysql2 renvoie déjà un objet JS pour une colonne JSON
      return typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
    },
    async save(namespace, jsonFilePath, data) {
      await pool.query(
        'INSERT INTO bot_store (namespace, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?',
        [namespace, JSON.stringify(data), JSON.stringify(data)]
      );
    },
  };
}

// ── API publique ─────────────────────────────────────────────────────────────
export async function loadDoc(namespace, jsonFilePath, defaultValue) {
  const backend = await resolveBackend();
  return backend.load(namespace, jsonFilePath, defaultValue);
}

export async function saveDoc(namespace, jsonFilePath, data) {
  const backend = await resolveBackend();
  return backend.save(namespace, jsonFilePath, data);
}

export async function getBackendName() {
  const backend = await resolveBackend();
  return backend.name;
}
