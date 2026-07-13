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
      CREATE TABLE IF NOT EXISTS metas (
        id          SERIAL PRIMARY KEY,
        usuario_id  INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
        minutos_dia INTEGER NOT NULL DEFAULT 100,
        pomodos_dia INTEGER NOT NULL DEFAULT 4,
        atualizado  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS streaks (
        id            SERIAL PRIMARY KEY,
        usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        data          DATE NOT NULL,
        minutos_total INTEGER NOT NULL DEFAULT 0,
        pomodoros     INTEGER NOT NULL DEFAULT 0,
        UNIQUE(usuario_id, data)
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS conquistas (
        id        SERIAL PRIMARY KEY,
        slug      TEXT NOT NULL UNIQUE,
        nome      TEXT NOT NULL,
        descricao TEXT,
        icone     TEXT
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS usuario_conquistas (
        usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        conquista_id INTEGER NOT NULL REFERENCES conquistas(id),
        desbloqueado TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (usuario_id, conquista_id)
      );
    `);
    await db.query(`
      INSERT INTO conquistas (slug, nome, descricao, icone) VALUES
        ('primeira_semente', 'Primeira semente', 'Primeiro Pomodoro concluído', '🌱'),
        ('semana_em_chamas', 'Semana em chamas', '7 dias de streak', '🔥'),
        ('maratonista', 'Maratonista', '4 horas em um dia', '📚'),
        ('coruja', 'Coruja', 'Pomodoro concluído depois das 22h', '🌙'),
        ('madrugador', 'Madrugador', 'Pomodoro concluído antes das 7h', '☀️'),
        ('ia_explorer', 'IA Explorer', 'Gerou o primeiro resumo com IA', '🤖')
      ON CONFLICT (slug) DO NOTHING;
    `);
    console.log("[DATABASE] Tabelas OK.");
  } catch (err) {
    console.error("[DATABASE] Erro ao criar tabelas:", err.message);
  }
};
inicializarTabelas();

module.exports = db;
