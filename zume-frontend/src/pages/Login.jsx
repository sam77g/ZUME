import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../lib/api";
import { getToken, setToken } from "../lib/auth";
import "./Login.css";

const VIEWS = { BOAS_VINDAS: "boas", LOGIN: "login", CADASTRO: "cadastro" };

export default function Login() {
  const navigate = useNavigate();
  const [view, setView] = useState(VIEWS.BOAS_VINDAS);

  const [email, setEmail] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");
  const [msgLogin, setMsgLogin] = useState(null);

  const [nomeUsuario, setNomeUsuario] = useState("");
  const [emailCadastro, setEmailCadastro] = useState("");
  const [senhaCadastro, setSenhaCadastro] = useState("");
  const [msgCadastro, setMsgCadastro] = useState(null);

  // redireciona se já estiver logado
  useEffect(() => {
    if (getToken()) navigate("/pomodoro", { replace: true });
  }, [navigate]);

  async function handleCadastrar() {
    const nome = nomeUsuario.trim();
    const emailC = emailCadastro.trim();
    if (!nome || !emailC || !senhaCadastro) {
      setMsgCadastro({ texto: "Preencha todos os campos.", cor: "red" });
      return;
    }
    try {
      const res = await fetch(`${API}/cadastro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email: emailC, senha: senhaCadastro }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsgCadastro({ texto: "Conta criada! Faça login.", cor: "green" });
        setTimeout(() => setView(VIEWS.LOGIN), 1500);
      } else {
        setMsgCadastro({ texto: data.msg || "Erro ao cadastrar.", cor: "red" });
      }
    } catch {
      setMsgCadastro({ texto: "Não foi possível conectar ao servidor.", cor: "red" });
    }
  }

  async function handleEntrar() {
    const emailL = email.trim();
    if (!emailL || !senhaLogin) {
      setMsgLogin({ texto: "Preencha e-mail e senha.", cor: "red" });
      return;
    }
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailL, senha: senhaLogin }),
      });
      const data = await res.json();
      if (data.ok) {
        setToken(data.token, data.nome);
        navigate("/pomodoro", { replace: true });
      } else {
        setMsgLogin({ texto: data.msg || "Credenciais incorretas.", cor: "red" });
      }
    } catch {
      setMsgLogin({ texto: "Não foi possível conectar ao servidor.", cor: "red" });
    }
  }

  return (
    <div className="container">
      <div className="left">
        <div className="icone">
          <img src="/assets/path58.png" alt="ZUME" />
        </div>
        <h1>ZUME</h1>
        <p>Estude com foco, conquiste mais</p>
        <button className="btn-nav" onClick={() => setView(VIEWS.LOGIN)}>ENTRAR</button>
        <button className="btn-nav" onClick={() => setView(VIEWS.CADASTRO)}>CRIAR CONTA</button>
      </div>

      <div className="right">
        <div className={`boas-vindas ${view === VIEWS.BOAS_VINDAS ? "ativo" : "oculto"}`}>
          <div className="icone">🍅</div>
          <h2>Olá!</h2>
          <span>Selecione uma opção ao lado para continuar.</span>
        </div>

        <div className={`formulario ${view === VIEWS.LOGIN ? "ativo" : "oculto"}`}>
          <h2>Entrar</h2>
          <form onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Senha"
              value={senhaLogin}
              onChange={(e) => setSenhaLogin(e.target.value)}
            />
            <button type="button" onClick={handleEntrar}>ENTRAR</button>
            <p className="link-alt" onClick={() => setView(VIEWS.CADASTRO)}>
              Não tem conta? Cadastre-se
            </p>
            {msgLogin && (
              <p className="msg-feedback" style={{ color: msgLogin.cor }}>
                {msgLogin.texto}
              </p>
            )}
          </form>
        </div>

        <div className={`formulario ${view === VIEWS.CADASTRO ? "ativo" : "oculto"}`}>
          <h2>Criar conta</h2>
          <form onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              placeholder="Nome de usuário"
              value={nomeUsuario}
              onChange={(e) => setNomeUsuario(e.target.value)}
            />
            <input
              type="email"
              placeholder="E-mail"
              value={emailCadastro}
              onChange={(e) => setEmailCadastro(e.target.value)}
            />
            <input
              type="password"
              placeholder="Senha"
              value={senhaCadastro}
              onChange={(e) => setSenhaCadastro(e.target.value)}
            />
            <button type="button" onClick={handleCadastrar}>CADASTRAR</button>
            <p className="link-alt" onClick={() => setView(VIEWS.LOGIN)}>
              Já tem conta? Entre aqui
            </p>
            {msgCadastro && (
              <p className="msg-feedback" style={{ color: msgCadastro.cor }}>
                {msgCadastro.texto}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
