/*
 * server.js — Backend ZUME
 * Ponto de entrada — só inicialização
 */

require("dotenv").config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("ERRO: JWT_SECRET ausente ou fraco. Servidor não iniciado.");
  process.exit(1);
}
if (!process.env.GROQ_API_KEY) {
  console.error("ERRO: GROQ_API_KEY ausente.");
  process.exit(1);
}

const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const http       = require("http");
const { Server } = require("socket.io");
const { limitadorGeral } = require("./middleware/rateLimit");
const registrarSalaFoco  = require("./sockets/salaFoco");

const app = express();

// ── CORS — fonte única de verdade ──────────────────────────────
const origensPermitidas = (process.env.FRONTEND_URL || "")
  .split(",")
  .map(s => s.trim())
  .concat(["http://localhost:5173", "http://localhost:3000"])
  .filter(Boolean);

function validarOrigem(origin, callback) {
  if (!origin || origensPermitidas.includes(origin)) callback(null, true);
  else callback(new Error("CORS bloqueado"));
}

// ── Segurança ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:         validarOrigem,
  methods:        ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(limitadorGeral);

// ── Rotas ──────────────────────────────────────────────────────
app.use("/auth",    require("./routes/auth"));
app.use("/sessoes", require("./routes/sessoes"));
app.use("/ia",      require("./routes/ia"));
app.use("/usuario", require("./routes/usuario"));


// ── 404 ────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ ok: false, msg: "Rota não encontrada" }));

// ── Erros globais ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ ok: false, msg: err.message });
  }
  console.error("[ERRO]", err.message);
  res.status(500).json({ ok: false, msg: "Erro interno do servidor" });
});

// ── Socket.io — reutiliza a mesma função validarOrigem ────────────
const servidorHttp = http.createServer(app);

const io = new Server(servidorHttp, {
  cors: {
    origin:  validarOrigem,
    methods: ["GET", "POST"],
  },
});
registrarSalaFoco(io);

// ── Start ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
servidorHttp.listen(PORT, () => {
  console.log(`\n🍅 ZUME Backend rodando em http://localhost:${PORT}`);
  console.log(`   Helmet ✓  Rate Limit ✓  Zod ✓  JWT ✓  bcrypt ✓  Socket.io ✓\n`);
});
