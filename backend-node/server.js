/*
 * server.js — Backend Pomodoro + Groq IA (porta do server.c para Node.js/Express)
 *
 * Mantém EXATAMENTE as mesmas rotas, formatos de entrada/saída e o mesmo
 * arquivo pomodoro.db do backend original em C, para que o frontend
 * (script02.js, pomodoro.js) continue funcionando sem nenhuma alteração.
 *
 * Instalar:   npm install
 * Executar:   npm start   (ou: node server.js)
 */

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const PORT = 8080;
const DB_FILE = "pomodoro.db";

// Mesma chave usada no proxy de IA do server.c
const GROQ_API_KEY = "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";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// ── banco de dados ──────────────────────────────────────────
const db = new Database(DB_FILE);

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    duracao_seg INTEGER NOT NULL,
    criado_em TEXT DEFAULT (datetime('now'))
  );
`);

// ── utilitários ──────────────────────────────────────────────

// Mesmo algoritmo do C: SHA-256 hex, sem salt (mantém compatibilidade
// com senhas já cadastradas pelo backend antigo).
function sha256Hex(texto) {
  return crypto.createHash("sha256").update(texto, "utf8").digest("hex");
}

// ── app ──────────────────────────────────────────────────────
const app = express();
app.use(cors()); // equivalente a Access-Control-Allow-Origin: *
app.use(express.json());

// ── rota: cadastro ──────────────────────────────────────────
app.post("/cadastro", (req, res) => {
  const { nome, email, senha } = req.body || {};

  if (!nome || !email || !senha) {
    return res.json({ ok: false, msg: "Campos faltando" });
  }

  try {
    const senhaHash = sha256Hex(senha);
    const stmt = db.prepare(
      "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?);"
    );
    stmt.run(nome, email, senhaHash);
    return res.json({ ok: true, msg: "Conta criada!" });
  } catch (err) {
    // ex: e-mail duplicado (UNIQUE constraint)
    return res.json({ ok: false, msg: "Erro ou email duplicado" });
  }
});

// ── rota: login ──────────────────────────────────────────────
app.post("/login", (req, res) => {
  const { email, senha } = req.body || {};

  if (!email || !senha) {
    return res.json({ ok: false, msg: "Campos faltando" });
  }

  const senhaHash = sha256Hex(senha);
  const row = db
    .prepare("SELECT id, nome FROM usuarios WHERE email = ? AND senha = ? LIMIT 1;")
    .get(email, senhaHash);

  if (row) {
    return res.json({ ok: true, id: row.id, nome: row.nome });
  }
  return res.json({ ok: false, msg: "Incorreto" });
});

// ── rota: salvar sessão de estudo ────────────────────────────
app.post("/salvar_sessao", (req, res) => {
  const { usuario_id, duracao_seg } = req.body || {};

  if (usuario_id === undefined || duracao_seg === undefined) {
    return res.json({ ok: false });
  }

  const stmt = db.prepare(
    "INSERT INTO sessoes (usuario_id, duracao_seg) VALUES (?, ?);"
  );
  stmt.run(parseInt(usuario_id, 10), parseInt(duracao_seg, 10));
  return res.json({ ok: true });
});

// ── rota: tempo total de estudo ──────────────────────────────
app.get("/tempo_total", (req, res) => {
  const usuarioId = parseInt(req.query.usuario_id, 10);

  if (!usuarioId) {
    return res.json({ ok: false });
  }

  const row = db
    .prepare(
      "SELECT COALESCE(SUM(duracao_seg),0) AS total, COUNT(*) AS sessoes FROM sessoes WHERE usuario_id = ?;"
    )
    .get(usuarioId);

  return res.json({
    ok: true,
    total_seg: row.total,
    total_min: Math.floor(row.total / 60),
    sessoes: row.sessoes,
  });
});

// ── rota: proxy para a IA (Groq) ─────────────────────────────
app.post("/ia", async (req, res) => {
  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await groqRes.json();
    return res.status(groqRes.status).json(data);
  } catch (err) {
    return res.json({ ok: false, msg: "Erro de conexao com a API externa" });
  }
});

// ── rota não encontrada ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ ok: false, msg: "Erro" });
});

// ── inicialização ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[SERVER] Servidor rodando na porta ${PORT}`);
});