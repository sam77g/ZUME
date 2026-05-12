const btnLogin    = document.getElementById("btnLogin");
const btnCadastro = document.getElementById("btnCadastro");
const loginForm   = document.getElementById("loginForm");
const cadastroForm = document.getElementById("cadastroForm");
const boasVindas  = document.getElementById("boasVindas");
const subtitulo   = document.getElementById("subtitulo");
const irCadastro  = document.getElementById("irCadastro");
const irLogin     = document.getElementById("irLogin");
const btnEntrar   = document.getElementById("btnEntrar");
const btnCadastrar = document.getElementById("btnCadastrar");

let atual = null;

function mostrar(qual) {
  loginForm.classList.remove("ativo");
  cadastroForm.classList.remove("ativo");
  btnLogin.classList.remove("ativo");
  btnCadastro.classList.remove("ativo");

  if (atual === qual) {
    atual = null;
    boasVindas.classList.remove("oculto");
    subtitulo.textContent = "Escolha uma opção abaixo";
    return;
  }

  atual = qual;
  boasVindas.classList.add("oculto");

  if (qual === "login") {
    setTimeout(() => loginForm.classList.add("ativo"), 50);
    btnLogin.classList.add("ativo");
    subtitulo.textContent = "Acesse sua conta";
  } else {
    setTimeout(() => cadastroForm.classList.add("ativo"), 50);
    btnCadastro.classList.add("ativo");
    subtitulo.textContent = "Crie sua conta grátis";
  }
}

btnLogin.addEventListener("click", () => mostrar("login"));
btnCadastro.addEventListener("click", () => mostrar("cadastro"));
irCadastro.addEventListener("click", () => mostrar("cadastro"));
irLogin.addEventListener("click", () => mostrar("login"));

// ── LOGIN ──────────────────────────────────────────────────────────────────
btnEntrar.addEventListener("click", () => {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senhaLogin").value.trim();

  if (!email || !senha) {
    alert("Por favor, preencha e-mail e senha.");
    return;
  }

  // Salva o usuário logado no localStorage para o pomodoro.js reconhecer
  const usuario = {
    nome: email.split("@")[0],
    email: email
  };
  localStorage.setItem("usuarioLogado", JSON.stringify(usuario));

  alert("Bem-vindo, " + email + "!");

  window.location.href = "../pomodoro/pomodoro.html";
});

// ── CADASTRO ───────────────────────────────────────────────────────────────
btnCadastrar.addEventListener("click", () => {
  const nome  = document.getElementById("nomeUsuario").value.trim();
  const email = document.getElementById("emailcadastro").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!nome || !email || !senha) {
    alert("Por favor, preencha todos os campos.");
    return;
  }

  if (senha.length < 6) {
    alert("A senha deve ter pelo menos 6 caracteres.");
    return;
  }

  // Salva o usuário recém-cadastrado no localStorage
  const usuario = {
    nome: nome,
    email: email
  };
  localStorage.setItem("usuarioLogado", JSON.stringify(usuario));

  alert("Cadastro realizado com sucesso! Bem-vindo, " + nome + "!");

  window.location.href = "../pomodoro/pomodoro.html";
});