// Helpers de autenticação — mesma lógica do projeto antigo (JWT em localStorage)

export function getToken() {
  return localStorage.getItem("zume_token");
}

export function setToken(token, nome) {
  localStorage.setItem("zume_token", token);
  if (nome) localStorage.setItem("zume_nome", nome);
}

export function logout() {
  localStorage.removeItem("zume_token");
  localStorage.removeItem("zume_nome");
}

export function decodeJWT(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function getUsuario() {
  const token = getToken();
  if (!token) return null;
  const payload = decodeJWT(token);
  if (!payload) return null;
  return { id: payload.id, nome: payload.nome, token };
}

// Cada usuário tem seu próprio espaço de chaves no localStorage,
// prefixado pelo id — evita que dados de uma conta vazem para outra
// conta criada no mesmo navegador/dispositivo.
export function chave(usuarioId, nome) {
  return `u${usuarioId ?? "anon"}_${nome}`;
}

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
