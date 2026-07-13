const db = require("../config/db");

// Soma minutos/pomodoros do dia (upsert) e retorna a linha atualizada
async function registrarStreak(usuarioId, minutos, pomodoros) {
  const result = await db.query(
    `INSERT INTO streaks (usuario_id, data, minutos_total, pomodoros)
     VALUES ($1, CURRENT_DATE, $2, $3)
     ON CONFLICT (usuario_id, data)
     DO UPDATE SET minutos_total = streaks.minutos_total + EXCLUDED.minutos_total,
                   pomodoros     = streaks.pomodoros + EXCLUDED.pomodoros
     RETURNING data, minutos_total, pomodoros;`,
    [usuarioId, minutos, pomodoros]
  );
  return result.rows[0];
}

// Calcula streak atual (dias consecutivos até hoje, incluindo hoje) a partir do histórico
async function calcularStreakAtual(usuarioId) {
  const result = await db.query(
    `SELECT data FROM streaks WHERE usuario_id = $1 AND minutos_total > 0 ORDER BY data DESC;`,
    [usuarioId]
  );
  const dias = result.rows.map(r => r.data.toISOString().slice(0, 10));
  const diasSet = new Set(dias);

  let streak = 0;
  const cursor = new Date();
  // Se hoje ainda não estudou, streak conta a partir de ontem
  const hojeKey = cursor.toISOString().slice(0, 10);
  if (!diasSet.has(hojeKey)) cursor.setDate(cursor.getDate() - 1);

  while (diasSet.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function desbloquearConquista(usuarioId, slug) {
  const result = await db.query(
    `INSERT INTO usuario_conquistas (usuario_id, conquista_id)
     SELECT $1, id FROM conquistas WHERE slug = $2
     ON CONFLICT (usuario_id, conquista_id) DO NOTHING
     RETURNING conquista_id;`,
    [usuarioId, slug]
  );
  return result.rowCount > 0;
}

// Verifica condições automáticas após uma sessão registrada e desbloqueia o que se aplicar.
// Retorna array de slugs recém-desbloqueados.
async function verificarConquistasAutomaticas(usuarioId, { totalPomodoros, minutosHoje }) {
  const desbloqueadas = [];
  const hora = new Date().getHours();

  const candidatos = [];
  if (totalPomodoros >= 1) candidatos.push("primeira_semente");
  if (minutosHoje >= 240) candidatos.push("maratonista");
  if (hora >= 22) candidatos.push("coruja");
  if (hora < 7) candidatos.push("madrugador");

  const streakAtual = await calcularStreakAtual(usuarioId);
  if (streakAtual >= 7) candidatos.push("semana_em_chamas");

  for (const slug of candidatos) {
    if (await desbloquearConquista(usuarioId, slug)) desbloqueadas.push(slug);
  }
  return desbloqueadas;
}

module.exports = { registrarStreak, calcularStreakAtual, desbloquearConquista, verificarConquistasAutomaticas };
