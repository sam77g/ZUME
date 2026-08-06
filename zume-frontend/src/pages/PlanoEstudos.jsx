import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { API } from "../lib/api";
import { getUsuario, authHeaders } from "../lib/auth";
import "./PlanoEstudos.css";

function renderMd(text) {
  if (!window.marked) return text;
  return window.marked.parse(text);
}

export default function PlanoEstudos() {
  const navigate = useNavigate();
  const usuario = getUsuario();
  const token = usuario?.token;

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  const [tema, setTema] = useState("");
  const [dataProva, setDataProva] = useState("");
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [plano, setPlano] = useState(null);

  async function gerarPlano() {
    if (!tema.trim()) { setErro("Informe o tema do plano de estudos."); return; }
    if (!dataProva) { setErro("Informe a data da prova."); return; }

    const hoje = new Date();
    const prova = new Date(dataProva);
    if (prova <= hoje) { setErro("A data da prova deve ser no futuro."); return; }

    setErro(null);
    setCarregando(true);
    setPlano(null);

    // 1. Busca tópicos com mais erros do usuário
    let topicosErrados = [];
    try {
      const res = await fetch(`${API}/testes/topicos-dificeis`, {
        headers: authHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        topicosErrados = (data.topicos || []).map((t) => t.topico);
      }
    } catch {
      // Continua sem tópicos — não é bloqueante
    }

    const diasDisponiveis = Math.max(1, Math.ceil((prova - hoje) / (1000 * 60 * 60 * 24)));

    // 2. Chama a IA para gerar o plano
    try {
      const res = await fetch(`${API}/ia/plano`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ tema, data_prova: dataProva, topicos_errados: topicosErrados }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data?.msg || `Erro HTTP ${res.status}`); return; }

      const textoIA = data?.choices?.[0]?.message?.content || data?.plano || "";
      if (!textoIA) { setErro("Resposta inesperada da IA. Tente novamente."); return; }
      setPlano({ texto: textoIA, dias: diasDisponiveis, topicosErrados });
    } catch {
      setErro("Erro de rede ao gerar o plano. Verifique sua conexão.");
    } finally {
      setCarregando(false);
    }
  }

  if (!token) return null;

  return (
    <div className="plano-page">
      <Navbar />
      <div className="plano-container">
        <header>
          <h1>🗓️ Plano de Estudos</h1>
          <p>Gere um cronograma personalizado com IA, priorizando seus pontos fracos.</p>
        </header>

        <div className="plano-form">
          <div className="text-zone">
            <label htmlFor="tema">Tema / Disciplina</label>
            <input
              id="tema"
              type="text"
              placeholder="Ex: Química Orgânica, Gramática Portuguesa, Cálculo I..."
              value={tema}
              onChange={(e) => setTema(e.target.value)}
            />
          </div>

          <div className="text-zone">
            <label htmlFor="dataProva">Data da prova</label>
            <input
              id="dataProva"
              type="date"
              value={dataProva}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDataProva(e.target.value)}
            />
          </div>
        </div>

        {erro && <div className="aviso-erro">⚠️ {erro}</div>}

        <div className="actions">
          <button className="btn-primary" disabled={carregando} onClick={gerarPlano}>
            {carregando ? "Gerando..." : "🗓️ Gerar Plano"}
          </button>
          {plano && (
            <button className="btn-secondary" onClick={() => setPlano(null)}>
              ↺ Novo Plano
            </button>
          )}
        </div>

        {carregando && <div className="spinner" />}

        {plano && (
          <div className="plano-resultado">
            <div className="plano-meta">
              <span>📅 {plano.dias} dia{plano.dias !== 1 ? "s" : ""} até a prova</span>
              {plano.topicosErrados.length > 0 && (
                <span>⚠️ {plano.topicosErrados.length} tópico{plano.topicosErrados.length !== 1 ? "s" : ""} priorizados</span>
              )}
            </div>
            <div
              className="plano-md"
              dangerouslySetInnerHTML={{ __html: renderMd(plano.texto) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}