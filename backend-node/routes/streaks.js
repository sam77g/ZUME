const express = require("express");
const { z }   = require("zod");
const db      = require("../config/db");
const { autenticar } = require("../middleware/auth");
const {
  registrarStreak,
  calcularStreakAtual,
  verificarConquistasAutomaticas,
} = require("../services/progressoService");

const router = express.Router();

const SchemaRegistro = z.object({
  minutos:   z.number().int().nonnegative().default(0),
  pomodoros: z.number().int().nonnegative().default(0),
});

// POST /streaks/registrar — soma progresso do dia atual e verifica conquistas
router.post("/registrar", autenticar, async (req, res) => {
  const parse = SchemaRegistro.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ ok: false, msg: parse.error.errors[0].message });
  }
  const { minutos, pomodoros } = parse.data;
  try {
    const dia = await registrarStreak(req.usuario.id, minutos, pomodoros);

    const totalResult = await db.query(
      `SELECT COALESCE(SUM(pomodoros),0) AS total FROM streaks WHERE usuario_id = $1;`,
      [req.usuario.id]
    );

    const conquistas = await verificarConquistasAutomaticas(req.usuario.id, {
      totalPomodoros: parseInt(totalResult.rows[0].total, 10),
      minutosHoje: dia.minutos_total,
    });

    return res.json({ ok: true, dia, conquistas_desbloqueadas: conquistas });
  } catch (err) {
    console.error("[STREAKS]", err.message);
    return res.status(500).json({ ok: false, msg: "Erro ao registrar progresso" });
  }
});

// GET /streaks/me — histórico (últimos 60 dias) + streak atual
router.get("/me", autenticar, async (req, res) => {
  try {
    const historico = await db.query(
      `SELECT data, minutos_total, pomodoros FROM streaks
       WHERE usuario_id = $1 AND data >= CURRENT_DATE - INTERVAL '60 days'
       ORDER BY data ASC;`,
      [req.usuario.id]
    );
    const streakAtual = await calcularStreakAtual(req.usuario.id);
    return res.json({ ok: true, streak_atual: streakAtual, historico: historico.rows });
  } catch (err) {
    console.error("[STREAKS]", err.message);
    return res.status(500).json({ ok: false, msg: "Erro ao buscar streaks" });
  }
});

module.exports = router;
