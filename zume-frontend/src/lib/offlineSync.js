// Sync offline-first: se salvar a sessão falhar (sem internet), ela entra
// numa fila no localStorage (por usuário) e é reenviada quando a conexão
// voltar, sem o usuário perder o progresso.
import { API } from "./api";
import { authHeaders } from "./auth";

const filaKey = (usuarioId) => `u${usuarioId ?? "anon"}_sessoes_pendentes`;

export function enfileirarSessaoPendente(usuarioId, duracaoSeg) {
  const key = filaKey(usuarioId);
  const fila = JSON.parse(localStorage.getItem(key) || "[]");
  fila.push({ duracao_seg: duracaoSeg, criado_em: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(fila));
}

export async function sincronizarSessoesPendentes(usuarioId, token) {
  if (!usuarioId || !token) return;
  const key = filaKey(usuarioId);
  const fila = JSON.parse(localStorage.getItem(key) || "[]");
  if (!fila.length) return;

  const restantes = [];
  for (const sessao of fila) {
    try {
      const res = await fetch(`${API}/sessoes/salvar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ duracao_seg: sessao.duracao_seg }),
      });
      if (!res.ok) throw new Error("falha ao sincronizar sessão");
    } catch {
      restantes.push(sessao); // mantém na fila e tenta de novo na próxima vez
    }
  }

  if (restantes.length) {
    localStorage.setItem(key, JSON.stringify(restantes));
  } else {
    localStorage.removeItem(key);
  }
}
