const express = require("express");
const { z }   = require("zod");
const db      = require("../config/db");
const { autenticar } = require("../middleware/auth");

const router = express.Router();

const SchemaSessao = z.object({
  duracao_seg: z.number().int().positive("Duração inválida"),
});

// POST /sessoes/salvar
router.post("/salvar", autenticar, async (req, res) => {
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

// GET /sessoes/tempo_total
router.get("/tempo_total", autenticar, async (req, res) => {
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

// GET /sessoes/analytics
router.get("/analytics", autenticar, async (req, res) => {
  try {
    const ultimos30 = await db.query(
      `SELECT DATE(criado_em) AS dia,
              SUM(duracao_seg) AS total_seg,
              COUNT(*) AS sessoes
       FROM sessoes
       WHERE usuario_id = $1
         AND criado_em >= NOW() - INTERVAL '30 days'
       GROUP BY dia
       ORDER BY dia ASC`,
      [req.usuario.id]
    );
    res.json({ ok: true, dias: ultimos30.rows });
  } catch (err) {
    console.error("[ANALYTICS]", err.message);
    res.status(500).json({ ok: false, msg: "Erro ao buscar analytics" });
  }
});

module.exports = router;