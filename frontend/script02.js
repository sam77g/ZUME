/* script02.js — conecta base.html ao servidor C */

const API = "http://localhost:8080";

/* ─── navegação entre formulários ─────────────────────────── */

const boasVindas  = document.getElementById("boasVindas");
const loginForm   = document.getElementById("loginForm");
const cadastroForm = document.getElementById("cadastroForm");

function mostrar(el) {
    [boasVindas, loginForm, cadastroForm].forEach(e => {
        e.classList.remove("ativo");
        e.classList.add("oculto");
    });
    el.classList.remove("oculto");
    el.classList.add("ativo");
}

document.getElementById("btnLogin")   .addEventListener("click", () => mostrar(loginForm));
document.getElementById("btnCadastro").addEventListener("click", () => mostrar(cadastroForm));
document.getElementById("irCadastro") .addEventListener("click", () => mostrar(cadastroForm));
document.getElementById("irLogin")    .addEventListener("click", () => mostrar(loginForm));

/* ─── utilitário: exibe mensagem inline ───────────────────── */

function setMsg(formEl, texto, cor = "red") {
    let msg = formEl.querySelector(".msg-feedback");
    if (!msg) {
        msg = document.createElement("p");
        msg.className = "msg-feedback";
        msg.style.cssText = "font-size:12px;margin-top:4px;text-align:center;";
        formEl.appendChild(msg);
    }
    msg.style.color = cor;
    msg.textContent = texto;
}

/* ─── cadastro ────────────────────────────────────────────── */

document.getElementById("btnCadastrar").addEventListener("click", async () => {
    const nome  = document.getElementById("nomeUsuario").value.trim();
    const email = document.getElementById("emailcadastro").value.trim();
    const senha = document.getElementById("senha").value;

    if (!nome || !email || !senha) {
        setMsg(cadastroForm, "Preencha todos os campos.");
        return;
    }

    try {
        const res  = await fetch(`${API}/cadastro`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, email, senha })
        });
        const data = await res.json();

        if (data.ok) {
            setMsg(cadastroForm, "Conta criada! Faça login.", "green");
            setTimeout(() => mostrar(loginForm), 1500);
        } else {
            setMsg(cadastroForm, data.msg || "Erro ao cadastrar.");
        }
    } catch {
        setMsg(cadastroForm, "Não foi possível conectar ao servidor.");
    }
});

/* ─── login ───────────────────────────────────────────────── */

document.getElementById("btnEntrar").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senhaLogin").value;

    if (!email || !senha) {
        setMsg(loginForm, "Preencha e-mail e senha.");
        return;
    }

    try {
        const res  = await fetch(`${API}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha })
        });
        const data = await res.json();

        if (data.ok) {
            /* salva sessão do usuário no sessionStorage */
            sessionStorage.setItem("usuario_id",   data.id);
            sessionStorage.setItem("usuario_nome",  data.nome);
            /* redireciona para o pomodoro */
            window.location.href = "/pomodoro/pomodoro.html";
        } else {
            setMsg(loginForm, data.msg || "Credenciais incorretas.");
        }
    } catch {
        setMsg(loginForm, "Não foi possível conectar ao servidor.");
    }
});