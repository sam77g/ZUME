const express = require("express");
const { z } = require("zod");
const { autenticar } = require("../middleware/auth");
const { limitadorGeral } = require("../middleware/rateLimit");
const db = require("../config/db");

const router = express.Router();

const schemaResultado = z.object({
  tema: z.string().min(1).max(200),
  total: z.number().int().min(1).max(20),
  acertos: z.number().int().min(0).max(20),
  topicos_errados: z.array(z.string().max(200)).max(20).default([]),
});

// POST /testes/salvar
router.post("/salvar", autenticar, limitadorGeral, async (req, res) => {
  const parse = schemaResultado.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ ok: false, msg: parse.error.errors[0].message });
  }
  const { tema, total, acertos, topicos_errados } = parse.data;
  try {
    await db.query(
      `INSERT INTO resultados_teste (usuario_id, tema, total, acertos, topicos_errados)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.usuario.id, tema, total, acertos, topicos_errados]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("[TESTES]", err.message);
    res.status(500).json({ ok: false, msg: "Erro ao salvar resultado" });
  }
});

// GET /testes/historico
router.get("/historico", autenticar, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, tema, total, acertos, topicos_errados, criado_em
       FROM resultados_teste
       WHERE usuario_id = $1
       ORDER BY criado_em DESC
       LIMIT 50`,
      [req.usuario.id]
    );
    res.json({ ok: true, testes: result.rows });
  } catch (err) {
    console.error("[TESTES]", err.message);
    res.status(500).json({ ok: false, msg: "Erro ao buscar histórico" });
  }
});

// GET /testes/topicos-dificeis
router.get("/topicos-dificeis", autenticar, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT unnest(topicos_errados) AS topico, COUNT(*) AS erros
       FROM resultados_teste
       WHERE usuario_id = $1
       GROUP BY topico
       ORDER BY erros DESC
       LIMIT 10`,
      [req.usuario.id]
    );
    res.json({ ok: true, topicos: result.rows });
  } catch (err) {
    console.error("[TESTES]", err.message);
    res.status(500).json({ ok: false, msg: "Erro ao buscar tópicos" });
  }
});

module.exports = router;