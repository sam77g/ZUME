const express = require("express");
const { z }           = require("zod");
const { autenticar }  = require("../middleware/auth");
const { limitadorIA } = require("../middleware/rateLimit");
const { chamarGroq }  = require("../services/iaService");

const router = express.Router();

const MODELOS_PERMITIDOS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

const SchemaIA = z.object({
  model: z.enum(MODELOS_PERMITIDOS, {
    errorMap: () => ({ message: "Modelo não permitido." }),
  }),
  max_tokens: z.number().int().min(1).max(4096).default(1024),
  messages: z
    .array(
      z.object({
        role:    z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(12000),
      })
    )
    .min(1)
    .max(10),
});

// POST /ia
router.post("/", autenticar, limitadorIA, async (req, res) => {
  const parse = SchemaIA.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ ok: false, msg: parse.error.errors[0].message });
  }

  try {
    const { status, data } = await chamarGroq(parse.data);
    return res.status(status).json(data);
  } catch (err) {
    if (err.message.includes("GROQ_API_KEY")) {
      return res.status(500).json({ ok: false, msg: err.message });
    }
    if (err.message === "GROQ_TIMEOUT") {
      return res.status(504).json({ ok: false, msg: "A IA demorou demais para responder. Tente novamente." });
    }
    console.error("[IA]", err.message);
    return res.status(502).json({ ok: false, msg: "Erro ao contatar a Groq" });
  }
});

module.exports = router;
