/*
 * server.js — Backend ZUME (modo local)
 * Rodar: node server.js
 * Requer: arquivo .env com DATABASE_URL e GROQ_API_KEY
 */

require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const crypto  = require("crypto");
const { Pool } = require("pg");

const PORT         = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";

// ── Banco de dados ────────────────────────────────────────────
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
    console.error("           Verifique o DATABASE_URL no arquivo .env");
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
    console.log("[DATABASE] Tabelas OK.");
  } catch (err) {
    console.error("[DATABASE] Erro ao criar tabelas:", err.message);
  }
};
inicializarTabelas();

// ── Criptografia ──────────────────────────────────────────────
function gerarHashSenha(senhaPura) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(senhaPura, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verificarSenha(senhaDigitada, senhaArmazenada) {
  try {
    const [salt, hashOriginal] = senhaArmazenada.split(":");
    const hashDigitado = crypto.pbkdf2Sync(senhaDigitada, salt, 1000, 64, "sha512").toString("hex");
    return hashOriginal === hashDigitado;
  } catch {
    return false;
  }
}

// ── App ───────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: "*" })); // local: aceita qualquer origem
app.use(express.json());

// ── Rota: cadastro ────────────────────────────────────────────
app.post("/cadastro", async (req, res) => {
  const { nome, email, senha } = req.body || {};
  if (!nome || !email || !senha) return res.json({ ok: false, msg: "Campos faltando" });

  try {
    await db.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3);",
      [nome, email, gerarHashSenha(senha)]
    );
    return res.json({ ok: true, msg: "Conta criada!" });
  } catch {
    return res.json({ ok: false, msg: "Erro ou email já cadastrado" });
  }
});

// ── Rota: login ───────────────────────────────────────────────
app.post("/login", async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.json({ ok: false, msg: "Campos faltando" });

  try {
    const result = await db.query(
      "SELECT id, nome, senha FROM usuarios WHERE email = $1 LIMIT 1;",
      [email]
    );
    const row = result.rows[0];
    if (row && verificarSenha(senha, row.senha)) {
      return res.json({ ok: true, id: row.id, nome: row.nome });
    }
    return res.json({ ok: false, msg: "Email ou senha incorretos" });
  } catch {
    return res.json({ ok: false, msg: "Erro interno" });
  }
});

// ── Rota: salvar sessão ───────────────────────────────────────
app.post("/salvar_sessao", async (req, res) => {
  const { usuario_id, duracao_seg } = req.body || {};
  if (usuario_id === undefined || duracao_seg === undefined) return res.json({ ok: false });

  try {
    await db.query(
      "INSERT INTO sessoes (usuario_id, duracao_seg) VALUES ($1, $2);",
      [parseInt(usuario_id, 10), parseInt(duracao_seg, 10)]
    );
    return res.json({ ok: true });
  } catch {
    return res.json({ ok: false });
  }
});

// ── Rota: tempo total ─────────────────────────────────────────
app.get("/tempo_total", async (req, res) => {
  const usuarioId = parseInt(req.query.usuario_id, 10);
  if (!usuarioId) return res.json({ ok: false });

  try {
    const result = await db.query(
      "SELECT COALESCE(SUM(duracao_seg),0) AS total, COUNT(*) AS sessoes FROM sessoes WHERE usuario_id = $1;",
      [usuarioId]
    );
    const row = result.rows[0];
    return res.json({
      ok: true,
      total_seg: parseInt(row.total, 10),
      total_min: Math.floor(parseInt(row.total, 10) / 60),
      sessoes:   parseInt(row.sessoes, 10),
    });
  } catch {
    return res.json({ ok: false });
  }
});

// ── Rota: proxy IA (Groq) ─────────────────────────────────────
app.post("/ia", async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ ok: false, msg: "GROQ_API_KEY não configurada no .env" });
  }
  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    });
    const data = await groqRes.json();
    return res.status(groqRes.status).json(data);
  } catch {
    return res.json({ ok: false, msg: "Erro ao contatar a Groq" });
  }
});

app.use((req, res) => res.status(404).json({ ok: false, msg: "Rota não encontrada" }));

app.listen(PORT, () => {
  console.log(`\n🍅 ZUME Backend rodando em http://localhost:${PORT}`);
  console.log(`   Abra o frontend com Live Server ou VS Code\n`);
});
