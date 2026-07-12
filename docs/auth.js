/* auth.js — funções de autenticação compartilhadas entre todas as páginas */

const API = "http://localhost:3000";

/* ── token ─────────────────────────────────────────────────── */
function getToken()        { return localStorage.getItem("zume_token"); }
function getNome()         { return localStorage.getItem("zume_nome"); }
function salvarSessaoAuth(token, nome) {
  localStorage.setItem("zume_token", token);
  localStorage.setItem("zume_nome", nome);
}
function logout() {
  localStorage.removeItem("zume_token");
  localStorage.removeItem("zume_nome");
  window.location.href = "/docs/login.html";
}

/* ── headers autenticados ───────────────────────────────────── */
function headersAuth() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`
  };
}

/* ── fetch autenticado ──────────────────────────────────────── */
async function fetchAuth(url, opcoes = {}) {
  const res = await fetch(url, {
    ...opcoes,
    headers: { ...headersAuth(), ...(opcoes.headers || {}) }
  });
  if (res.status === 401) {
    logout();
    return null;
  }
  return res;
}

/* ── proteção de página ─────────────────────────────────────── */
/* Chame no topo de qualquer página que exige login */
function exigirLogin() {
  if (!getToken()) {
    window.location.href = "../login.html";
  }
}
function exigirLoginRaiz() {
  if (!getToken()) {
    window.location.href = "login.html";
  }
}
