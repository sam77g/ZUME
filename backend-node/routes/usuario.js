const express = require("express");
const { autenticar } = require("../middleware/auth");

const router = express.Router();

// GET /usuario/me
router.get("/me", autenticar, (req, res) => {
  res.json({ ok: true, id: req.usuario.id, nome: req.usuario.nome });
});

module.exports = router;
