const express = require("express");
const db      = require("../config/db");
const { autenticar } = require("../middleware/auth");

const router = express.Router();

// GET /conquistas — catálogo completo
router.get("/", autenticar, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT slug, nome, descricao, icone FROM conquistas ORDER BY id ASC;`
    );
    return res.json({ ok: true, conquistas: result.rows });
  } catch (err) {
    console.error("[CONQUISTAS]", err.message);
    return res.status(500).json({ ok: false, msg: "Erro ao buscar conquistas" });
  }
});

// GET /conquistas/minhas — conquistas desbloqueadas pelo usuário autenticado
router.get("/minhas", autenticar, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.slug, c.nome, c.descricao, c.icone, uc.desbloqueado
       FROM usuario_conquistas uc
       JOIN conquistas c ON c.id = uc.conquista_id
       WHERE uc.usuario_id = $1
       ORDER BY uc.desbloqueado ASC;`,
      [req.usuario.id]
    );
    return res.json({ ok: true, conquistas: result.rows });
  } catch (err) {
    console.error("[CONQUISTAS]", err.message);
    return res.status(500).json({ ok: false, msg: "Erro ao buscar conquistas do usuário" });
  }
});

module.exports = router;
