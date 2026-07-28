/*
 * server.js — Backend ZUME
 * Ponto de entrada — só inicialização
 */

require("dotenv").config();

if (!process.env.JWT_SECRET) {
  console.error("[FATAL] JWT_SECRET não definido no .env — servidor não iniciado.");
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
const origensPermitidas = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "null", // file:// em mobile/Capacitor
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

function corsOrigin(origin, callback) {
  if (!origin || origensPermitidas.includes(origin)) {
    callback(null, true);
  } else {
    console.warn("[CORS] Origem bloqueada:", origin);
    callback(new Error("CORS: origem não permitida"));
  }
}

// ── Segurança ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:         corsOrigin,
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

// Aliases de compatibilidade — Login.jsx ainda chama /cadastro e /login.
// TODO: atualizar Login.jsx para /auth/cadastro e /auth/login e remover estas linhas.
app.post("/cadastro", (req, res) => res.redirect(307, "/auth/cadastro"));
app.post("/login",    (req, res) => res.redirect(307, "/auth/login"));

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

// ── Socket.io — reutiliza a mesma função corsOrigin ────────────
const servidorHttp = http.createServer(app);

const io = new Server(servidorHttp, {
  cors: {
    origin:  corsOrigin,
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
