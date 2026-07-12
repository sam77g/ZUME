const express = require("express");
const { autenticar }  = require("../middleware/auth");
const { limitadorIA } = require("../middleware/rateLimit");
const { chamarGroq }  = require("../services/iaService");

const router = express.Router();

// POST /ia
router.post("/", autenticar, limitadorIA, async (req, res) => {
  try {
    const { status, data } = await chamarGroq(req.body);
    return res.status(status).json(data);
  } catch (err) {
    if (err.message.includes("GROQ_API_KEY")) {
      return res.status(500).json({ ok: false, msg: err.message });
    }
    console.error("[IA]", err.message);
    return res.json({ ok: false, msg: "Erro ao contatar a Groq" });
  }
});

module.exports = router;
