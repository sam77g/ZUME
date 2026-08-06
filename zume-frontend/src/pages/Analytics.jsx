import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { API } from "../lib/api";
import { getUsuario, authHeaders } from "../lib/auth";
import "./Analytics.css";

// ── helpers ────────────────────────────────────────────────────────────────

function renderMd(text) {
  if (!window.marked) return text;
  return window.marked.parse(text);
}

// Gráfico de barras SVG — tempo estudado por dia
function GraficoBarras({ dados }) {
  if (!dados || dados.length === 0)
    return <p className="analytics-vazio">Nenhuma sessão registrada ainda.</p>;

  const maxMin = Math.max(...dados.map((d) => d.minutos), 1);
  const barWidth = Math.floor(560 / dados.length) - 4;

  return (
    <svg viewBox={`0 0 580 160`} className="analytics-svg" aria-label="Gráfico de tempo estudado por dia">
      {dados.map((d, i) => {
        const h = Math.max(4, (d.minutos / maxMin) * 120);
        const x = i * (barWidth + 4) + 2;
        const y = 130 - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={h} rx={4} className="bar-tempo" />
            <title>{d.data}: {d.minutos} min</title>
            <text x={x + barWidth / 2} y={148} textAnchor="middle" className="bar-label">
              {d.data?.slice(5)}
            </text>
            {d.minutos > 0 && (
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className="bar-valor">
                {d.minutos}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Gráfico de linha SVG — pontuação nos testes
function GraficoLinha({ dados }) {
  if (!dados || dados.length === 0)
    return <p className="analytics-vazio">Nenhum teste realizado ainda.</p>;

  const max = 10;
  const w = 560;
  const h = 130;
  const padX = 20;
  const step = dados.length > 1 ? (w - padX * 2) / (dados.length - 1) : 0;

  const pontos = dados.map((d, i) => ({
    x: padX + i * step,
    y: h - (d.nota / max) * (h - 20),
    nota: d.nota,
    data: d.data,
  }));

  const path = pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 580 160`} className="analytics-svg" aria-label="Gráfico de pontuação nos testes">
      <polyline points={pontos.map((p) => `${p.x},${p.y}`).join(" ")} className="linha-score" />
      {pontos.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={5} className="ponto-score" />
          <title>{p.data}: {p.nota}/10</title>
          <text x={p.x} y={p.y - 9} textAnchor="middle" className="bar-valor">{p.nota}</text>
          <text x={p.x} y={148} textAnchor="middle" className="bar-label">{p.data?.slice(5)}</text>
        </g>
      ))}
      <path d={path} fill="none" className="linha-score" />
    </svg>
  );
}

// ── componente principal ───────────────────────────────────────────────────

export default function Analytics() {
  const navigate = useNavigate();
  const usuario = getUsuario();
  const token = usuario?.token;

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  const [sessoes, setSessoes] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [topicos, setTopicos] = useState(null);
  const [relatorio, setRelatorio] = useState(null);
  const [carregandoRel, setCarregandoRel] = useState(false);
  const [erroRel, setErroRel] = useState(null);
  const [erroLoad, setErroLoad] = useState(null);

  useEffect(() => {
    if (!token) return;

    async function carregar() {
      try {
        const [resSessoes, resHistorico, resTopicos] = await Promise.all([
          fetch(`${API}/sessoes/analytics`, { headers: authHeaders(token) }),
          fetch(`${API}/testes/historico`, { headers: authHeaders(token) }),
          fetch(`${API}/testes/topicos-dificeis`, { headers: authHeaders(token) }),
        ]);

        if (resSessoes.ok) setSessoes(await resSessoes.json());
        if (resHistorico.ok) setHistorico(await resHistorico.json());
        if (resTopicos.ok) setTopicos(await resTopicos.json());
      } catch {
        setErroLoad("Erro ao carregar dados. Verifique sua conexão.");
      }
    }

    carregar();
  }, [token]);

  async function gerarRelatorio() {
    setErroRel(null);
    setCarregandoRel(true);
    setRelatorio(null);

    try {
      const res = await fetch(`${API}/ia/relatorio`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          sessoes,
          historico,
          topicos,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErroRel(data?.msg || `Erro HTTP ${res.status}`); return; }

      const textoIA = data?.choices?.[0]?.message?.content || data?.relatorio || "";
      if (!textoIA) { setErroRel("Resposta inesperada. Tente novamente."); return; }
      setRelatorio(textoIA);
    } catch {
      setErroRel("Erro de rede ao gerar relatório.");
    } finally {
      setCarregandoRel(false);
    }
  }

  if (!token) return null;

  return (
    <div className="analytics-page">
      <Navbar />
      <div className="analytics-container">
        <header>
          <h1>📊 Analytics de Estudo</h1>
          <p>Acompanhe seu desempenho e evolução ao longo do tempo.</p>
        </header>

        {erroLoad && <div className="aviso-erro">⚠️ {erroLoad}</div>}

        {/* ── Tempo estudado ── */}
        <section className="analytics-card">
          <h2>⏱️ Tempo Estudado por Dia</h2>
          <p className="analytics-sub">Últimos 30 dias (em minutos)</p>
          {sessoes === null
            ? <div className="spinner" />
            : <GraficoBarras dados={sessoes} />}
        </section>

        {/* ── Pontuação nos testes ── */}
        <section className="analytics-card">
          <h2>🎯 Pontuação nos Testes</h2>
          <p className="analytics-sub">Histórico de notas (0–10)</p>
          {historico === null
            ? <div className="spinner" />
            : <GraficoLinha dados={historico} />}
        </section>

        {/* ── Tópicos difíceis ── */}
        <section className="analytics-card">
          <h2>⚠️ Tópicos com Mais Erros</h2>
          {topicos === null
            ? <div className="spinner" />
            : topicos.length === 0
              ? <p className="analytics-vazio">Nenhum erro registrado ainda.</p>
              : (
                <ul className="topicos-lista">
                  {topicos.map((t, i) => (
                    <li key={i} className="topico-item">
                      <span className="topico-nome">{t.topico}</span>
                      <span className="topico-erros">{t.total_erros} erro{t.total_erros !== 1 ? "s" : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
        </section>

        {/* ── Relatório por IA ── */}
        <section className="analytics-card">
          <h2>🤖 Relatório Personalizado com IA</h2>
          <p className="analytics-sub">A IA analisa seus dados e sugere o que focar nos estudos.</p>
          <div className="actions">
            <button className="btn-primary" disabled={carregandoRel} onClick={gerarRelatorio}>
              {carregandoRel ? "Gerando..." : "✨ Gerar Relatório"}
            </button>
          </div>
          {carregandoRel && <div className="spinner" />}
          {erroRel && <div className="aviso-erro">⚠️ {erroRel}</div>}
          {relatorio && (
            <div
              className="relatorio-md"
              dangerouslySetInnerHTML={{ __html: renderMd(relatorio) }}
            />
          )}
        </section>
      </div>
    </div>
  );
}
