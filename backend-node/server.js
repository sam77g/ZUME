/*
 * server.js — Backend ZUME (local)
 * Segurança: bcrypt + JWT + Helmet + Rate Limit + Zod
 * Rodar: npm install && npm start
 */

require("dotenv").config();

const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt    = require("bcrypt");
const jwt       = require("jsonwebtoken");
const { z }     = require("zod");
const { Pool }  = require("pg");

const PORT         = process.env.PORT || 3000;
const JWT_SECRET   = process.env.JWT_SECRET;
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";
const SALT_ROUNDS  = 12;

// ── Validação de variáveis obrigatórias ───────────────────────
if (!JWT_SECRET) {
  console.error("[FATAL] JWT_SECRET não definido no .env — servidor não iniciado.");
  process.exit(1);
}

// ── Banco de dados ─────────────────────────────────────────────
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
    console.log("[DATABASE] Tabelas OK.");
  } catch (err) {
    console.error("[DATABASE] Erro ao criar tabelas:", err.message);
  }
};
inicializarTabelas();

// ── Schemas de validação (Zod) ────────────────────────────────
const SchemaCadastro = z.object({
  nome:  z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(128),
});

const SchemaLogin = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(1, "Informe a senha"),
});

const SchemaSessao = z.object({
  duracao_seg: z.number().int().positive("Duração inválida"),
});

// ── Middleware JWT ─────────────────────────────────────────────
function autenticar(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, msg: "Não autorizado" });
  }
  try {
    const payload = jwt.verify(auth.split(" ")[1], JWT_SECRET);
    req.usuario = payload; // { id, nome }
    next();
  } catch {
    return res.status(401).json({ ok: false, msg: "Token inválido ou expirado. Faça login novamente." });
  }
}

// ── Rate limiters ──────────────────────────────────────────────
// Geral: 100 requisições por 15 minutos por IP
const limitadorGeral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, msg: "Muitas requisições. Aguarde alguns minutos." },
});

// Login/cadastro: 10 tentativas por 15 minutos (proteção contra brute force)
const limitadorAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { ok: false, msg: "Muitas tentativas de login. Aguarde 15 minutos." },
});

// IA: 20 chamadas por minuto (protege sua GROQ_API_KEY)
const limitadorIA = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { ok: false, msg: "Limite de requisições à IA atingido. Aguarde 1 minuto." },
});

// ── App ────────────────────────────────────────────────────────
const app = express();

// Helmet — adiciona ~15 headers de segurança automaticamente
app.use(helmet());

// CORS — aceita apenas origens conhecidas
const origensPermitidas = [
  "http://localhost:5500",   // Live Server padrão do VS Code
  "http://127.0.0.1:5500",
  "http://localhost:5173",   // Vite (futuro)
  "http://127.0.0.1:5173",
  "null",                    // abertura direta via file:// no navegador
];
app.use(cors({
  origin: (origin, callback) => {
    // Permite sem origin (ex: curl, Insomnia, apps mobile)
    if (!origin || origensPermitidas.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("[CORS] Origem bloqueada:", origin);
      callback(new Error("CORS: origem não permitida"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "1mb" })); // limita tamanho do body
app.use(limitadorGeral);                  // rate limit em todas as rotas

// ── POST /cadastro ─────────────────────────────────────────────
app.post("/cadastro", limitadorAuth, async (req, res) => {
  const parse = SchemaCadastro.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ ok: false, msg: parse.error.errors[0].message });
  }
  const { nome, email, senha } = parse.data;

  try {
    const hash = await bcrypt.hash(senha, SALT_ROUNDS);
    await db.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3);",
      [nome.trim(), email.trim().toLowerCase(), hash]
    );
    return res.json({ ok: true, msg: "Conta criada! Faça login." });
  } catch {
    return res.json({ ok: false, msg: "Email já cadastrado" });
  }
});

// ── POST /login ────────────────────────────────────────────────
app.post("/login", limitadorAuth, async (req, res) => {
  const parse = SchemaLogin.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ ok: false, msg: parse.error.errors[0].message });
  }
  const { email, senha } = parse.data;

  try {
    const result = await db.query(
      "SELECT id, nome, senha FROM usuarios WHERE email = $1 LIMIT 1;",
      [email.trim().toLowerCase()]
    );
    const row = result.rows[0];
    if (!row) return res.json({ ok: false, msg: "Email ou senha incorretos" });

    const senhaCorreta = await bcrypt.compare(senha, row.senha);
    if (!senhaCorreta) return res.json({ ok: false, msg: "Email ou senha incorretos" });

    const token = jwt.sign(
      { id: row.id, nome: row.nome },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.json({ ok: true, token, nome: row.nome });
  } catch (err) {
    console.error("[LOGIN]", err.message);
    return res.json({ ok: false, msg: "Erro interno" });
  }
});

// ── POST /salvar_sessao (protegida) ───────────────────────────
app.post("/salvar_sessao", autenticar, async (req, res) => {
  const parse = SchemaSessao.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ ok: false, msg: parse.error.errors[0].message });
  }
  try {
    await db.query(
      "INSERT INTO sessoes (usuario_id, duracao_seg) VALUES ($1, $2);",
      [req.usuario.id, parse.data.duracao_seg]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("[SESSAO]", err.message);
    return res.json({ ok: false });
  }
});

// ── GET /tempo_total (protegida) ───────────────────────────────
app.get("/tempo_total", autenticar, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT COALESCE(SUM(duracao_seg),0) AS total, COUNT(*) AS sessoes FROM sessoes WHERE usuario_id = $1;",
      [req.usuario.id]
    );
    const row = result.rows[0];
    return res.json({
      ok: true,
      total_seg: parseInt(row.total, 10),
      total_min: Math.floor(parseInt(row.total, 10) / 60),
      sessoes:   parseInt(row.sessoes, 10),
    });
  } catch (err) {
    console.error("[TEMPO_TOTAL]", err.message);
    return res.json({ ok: false });
  }
});

// ── POST /ia (protegida + rate limit próprio) ─────────────────
app.post("/ia", autenticar, limitadorIA, async (req, res) => {
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

// ── GET /me (protegida) ────────────────────────────────────────
app.get("/me", autenticar, (req, res) => {
  res.json({ ok: true, id: req.usuario.id, nome: req.usuario.nome });
});

// ── 404 ────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ ok: false, msg: "Rota não encontrada" }));

// ── Handler global de erros ───────────────────────────────────
app.use((err, req, res, next) => {
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ ok: false, msg: err.message });
  }
  console.error("[ERRO]", err.message);
  res.status(500).json({ ok: false, msg: "Erro interno do servidor" });
});

app.listen(PORT, () => {
  console.log(`\n🍅 ZUME Backend rodando em http://localhost:${PORT}`);
  console.log(`   Helmet ✓  Rate Limit ✓  Zod ✓  JWT ✓  bcrypt ✓\n`);
});