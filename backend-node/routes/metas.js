const express = require("express");
const { z }   = require("zod");
const db      = require("../config/db");
const { autenticar } = require("../middleware/auth");

const router = express.Router();

const SchemaMeta = z.object({
  minutos_dia: z.number().int().positive().max(1440),
  pomodos_dia: z.number().int().positive().max(100),
});

// GET /metas/me — retorna a meta do usuário (cria com padrão se não existir)
router.get("/me", autenticar, async (req, res) => {
  try {
    const result = await db.query(
      `INSERT INTO metas (usuario_id) VALUES ($1)
       ON CONFLICT (usuario_id) DO UPDATE SET usuario_id = metas.usuario_id
       RETURNING minutos_dia, pomodos_dia;`,
      [req.usuario.id]
    );
    return res.json({ ok: true, ...result.rows[0] });
  } catch (err) {
    console.error("[METAS]", err.message);
    return res.status(500).json({ ok: false, msg: "Erro ao buscar meta" });
  }
});

// PUT /metas — atualiza minutos_dia e pomodos_dia
router.put("/", autenticar, async (req, res) => {
  const parse = SchemaMeta.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ ok: false, msg: parse.error.errors[0].message });
  }
  const { minutos_dia, pomodos_dia } = parse.data;
  try {
    await db.query(
      `INSERT INTO metas (usuario_id, minutos_dia, pomodos_dia)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id)
       DO UPDATE SET minutos_dia = $2, pomodos_dia = $3, atualizado = NOW();`,
      [req.usuario.id, minutos_dia, pomodos_dia]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("[METAS]", err.message);
    return res.status(500).json({ ok: false, msg: "Erro ao salvar meta" });
  }
});

module.exports = router;
