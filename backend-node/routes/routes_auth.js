const express = require("express");
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
const { z }   = require("zod");
const db      = require("../config/db");
const { limitadorAuth } = require("../middleware/rateLimit");

const router = express.Router();
const SALT_ROUNDS = 12;

const SchemaCadastro = z.object({
  nome:  z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(128),
});

const SchemaLogin = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(1, "Informe a senha"),
});

// POST /auth/cadastro
router.post("/cadastro", limitadorAuth, async (req, res) => {
  const parse = SchemaCadastro.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ ok: false, msg: parse.error.errors[0].message });
  }
  const { nome, email, senha } = parse.data;
  try {
    const hash = await bcrypt.hash(senha, SALT_ROUNDS);
    await db.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3);",
      [nome.trim(), email.trim().toLowerCase(), hash]
    );
    return res.json({ ok: true, msg: "Conta criada! Faça login." });
  } catch {
    return res.json({ ok: false, msg: "Email já cadastrado" });
  }
});

// POST /auth/login
router.post("/login", limitadorAuth, async (req, res) => {
  const parse = SchemaLogin.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ ok: false, msg: parse.error.errors[0].message });
  }
  const { email, senha } = parse.data;
  try {
    const result = await db.query(
      "SELECT id, nome, senha FROM usuarios WHERE email = $1 LIMIT 1;",
      [email.trim().toLowerCase()]
    );
    const row = result.rows[0];
    if (!row) return res.json({ ok: false, msg: "Email ou senha incorretos" });

    const senhaCorreta = await bcrypt.compare(senha, row.senha);
    if (!senhaCorreta) return res.json({ ok: false, msg: "Email ou senha incorretos" });

    const token = jwt.sign(
      { id: row.id, nome: row.nome },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.json({ ok: true, token, nome: row.nome });
  } catch (err) {
    console.error("[LOGIN]", err.message);
    return res.json({ ok: false, msg: "Erro interno" });
  }
});

module.exports = router;
