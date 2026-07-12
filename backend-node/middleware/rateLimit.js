const rateLimit = require("express-rate-limit");

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

// IA: 20 chamadas por minuto (protege a GROQ_API_KEY)
const limitadorIA = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { ok: false, msg: "Limite de requisições à IA atingido. Aguarde 1 minuto." },
});

module.exports = { limitadorGeral, limitadorAuth, limitadorIA };
