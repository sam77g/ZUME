const { Pool } = require("pg");

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("supabase")
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

db.connect()
  .then(() => console.log("[DATABASE] Conectado ao PostgreSQL!"))
  .catch(err => {
    console.error("[DATABASE] Erro ao conectar:", err.message);
    console.error("           Verifique o DATABASE_URL no .env");
  });

const inicializarTabelas = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id       SERIAL PRIMARY KEY,
        nome     TEXT NOT NULL,
        email    TEXT NOT NULL UNIQUE,
        senha    TEXT NOT NULL
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS sessoes (
        id          SERIAL PRIMARY KEY,
        usuario_id  INTEGER NOT NULL,
        duracao_seg INTEGER NOT NULL,
        criado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS resultados_teste (
        id           SERIAL PRIMARY KEY,
        usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        tema         TEXT NOT NULL,
        total        INTEGER NOT NULL,
        acertos      INTEGER NOT NULL,
        topicos_errados TEXT[] DEFAULT '{}',
        criado_em    TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("[DATABASE] Tabelas OK.");
  } catch (err) {
    console.error("[DATABASE] Erro ao criar tabelas:", err.message);
  }
};
inicializarTabelas();

module.exports = db;