const express = require("express");
const { z }           = require("zod");
const { autenticar }  = require("../middleware/auth");
const { limitadorIA } = require("../middleware/rateLimit");
const { chamarGroq }  = require("../services/iaService");

const router = express.Router();

const schema = z.object({
  mensagem: z.string().min(1).max(4000),
  tipo: z.enum(["resumo", "duvida", "plano"]).optional(),
});

// POST /ia
router.post("/", autenticar, limitadorIA, async (req, res) => {
  const parse = schema.safeParse(req.body);
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
