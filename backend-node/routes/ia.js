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

const schemaRelatorio = z.object({
  topicos_errados: z.array(z.string()).max(20),
  media_acertos: z.number().min(0).max(100),
  tempo_total_min: z.number().min(0),
});

const schemaPlano = z.object({
  tema: z.string().min(1).max(200),
  data_prova: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  topicos_errados: z.array(z.string()).max(20).default([]),
});

// POST /ia/relatorio
router.post("/relatorio", autenticar, limitadorIA, async (req, res) => {
  const parse = schemaRelatorio.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ ok: false, msg: parse.error.errors[0].message });

  const { topicos_errados, media_acertos, tempo_total_min } = parse.data;
  const mensagem = `O aluno estudou ${tempo_total_min} minutos no total, teve média de ${media_acertos}% de acertos nos testes e apresentou dificuldade nos seguintes tópicos: ${topicos_errados.join(", ") || "nenhum registrado"}. Gere um relatório analítico em português com diagnóstico e recomendações de estudo.`;

  try {
    const { status, data } = await chamarGroq({ mensagem, tipo: "duvida" });
    return res.status(status).json(data);
  } catch (err) {
    console.error("[IA/RELATORIO]", err.message);
    res.status(502).json({ ok: false, msg: "Erro ao gerar relatório" });
  }
});

// POST /ia/plano
router.post("/plano", autenticar, limitadorIA, async (req, res) => {
  const parse = schemaPlano.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ ok: false, msg: parse.error.errors[0].message });

  const { tema, data_prova, topicos_errados } = parse.data;
  const diasRestantes = Math.ceil((new Date(data_prova) - new Date()) / (1000 * 60 * 60 * 24));
  const mensagem = `O aluno precisa estudar "${tema}" e tem ${diasRestantes} dias até a prova (${data_prova}). ${topicos_errados.length > 0 ? `Ele tem dificuldade nos seguintes tópicos: ${topicos_errados.join(", ")}.` : ""} Crie um cronograma de estudos dia a dia em português, priorizando os tópicos com dificuldade, com tempo sugerido por dia e dicas práticas.`;

  try {
    const { status, data } = await chamarGroq({ mensagem, tipo: "plano" });
    return res.status(status).json(data);
  } catch (err) {
    console.error("[IA/PLANO]", err.message);
    res.status(502).json({ ok: false, msg: "Erro ao gerar plano" });
  }
});

module.exports = router;