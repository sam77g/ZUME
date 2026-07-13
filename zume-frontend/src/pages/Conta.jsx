import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { API } from "../lib/api";
import { getUsuario, chave, authHeaders, logout } from "../lib/auth";
import "./Conta.css";

const CONQUISTAS_TEMPO = [
  { id: "c25", emoji: "🌱", nome: "Primeira vez", req: 25, label: "25 min" },
  { id: "c60", emoji: "📚", nome: "Estudioso", req: 60, label: "1 hora" },
  { id: "c90", emoji: "🎯", nome: "Focado", req: 90, label: "90 min" },
  { id: "c120", emoji: "⚡", nome: "Super Foco", req: 120, label: "2 horas" },
  { id: "c180", emoji: "🔥", nome: "Fora do Normal", req: 180, label: "3 horas" },
  { id: "c240", emoji: "🚀", nome: "Máquina", req: 240, label: "4 horas" },
  { id: "c300", emoji: "🧠", nome: "Mente Afiada", req: 300, label: "5 horas" },
  { id: "c360", emoji: "🌟", nome: "Estrela", req: 360, label: "6 horas" },
  { id: "c420", emoji: "💎", nome: "Diamante", req: 420, label: "7 horas" },
  { id: "c480", emoji: "👑", nome: "Lendário", req: 480, label: "8 horas" },
];

const CONQUISTAS_STREAK = [
  { id: "s3", emoji: "🌤️", nome: "Começando", req: 3, label: "3 dias seguidos" },
  { id: "s7", emoji: "🗓️", nome: "1 Semana", req: 7, label: "7 dias seguidos" },
  { id: "s14", emoji: "🔥", nome: "Quinzena", req: 14, label: "14 dias seguidos" },
  { id: "s21", emoji: "💪", nome: "3 Semanas", req: 21, label: "21 dias seguidos" },
  { id: "s30", emoji: "🏅", nome: "Um Mês", req: 30, label: "30 dias seguidos" },
  { id: "s45", emoji: "🌊", nome: "Imparável", req: 45, label: "45 dias seguidos" },
  { id: "s60", emoji: "⚔️", nome: "Guerreiro", req: 60, label: "60 dias seguidos" },
  { id: "s90", emoji: "🏆", nome: "3 Meses", req: 90, label: "90 dias seguidos" },
  { id: "s180", emoji: "🌙", nome: "Meio Ano", req: 180, label: "180 dias seguidos" },
  { id: "s365", emoji: "👑", nome: "Um Ano Inteiro", req: 365, label: "365 dias seguidos" },
];

function calcularStreak(k) {
  const dias = JSON.parse(localStorage.getItem(k("diasEstudados")) || "[]");
  let streak = 0;
  const d = new Date();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (dias.includes(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

function ConquistaCard({ c, desbloqueada, emDestaque, onToggleDestaque }) {
  return (
    <div className={`conquista-card${desbloqueada ? "" : " bloqueada"}${emDestaque ? " destaque" : ""}`}>
      <span className="emoji">{desbloqueada ? c.emoji : "🔒"}</span>
      <div className="nome">{c.nome}</div>
      <div className="req">{c.label}</div>
      {desbloqueada && (
        <button
          className={`btn-destaque${emDestaque ? " ativo" : ""}`}
          onClick={() => onToggleDestaque(c.id)}
        >
          {emDestaque ? "★ Destaque" : "☆ Destacar"}
        </button>
      )}
    </div>
  );
}

export default function Conta() {
  const navigate = useNavigate();
  const usuario = getUsuario();
  const usuarioId = usuario?.id;
  const token = usuario?.token;
  const k = (nome) => chave(usuarioId, nome);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  const [avatarUrl, setAvatarUrl] = useState(() =>
    usuarioId ? localStorage.getItem(k("avatarURL")) : null
  );
  const [destaques, setDestaques] = useState(() =>
    usuarioId ? JSON.parse(localStorage.getItem(k("conquistasDestaque")) || "[]") : []
  );
  const [minutosTotal, setMinutosTotal] = useState(0);
  const [statTotal, setStatTotal] = useState("—");
  const [statSessoes, setStatSessoes] = useState("—");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API}/sessoes/tempo_total`, { headers: authHeaders(token) });
        const data = await res.json();
        if (data.ok) {
          const h = Math.floor(data.total_seg / 3600);
          const m = Math.floor((data.total_seg % 3600) / 60);
          setMinutosTotal(Math.floor(data.total_seg / 60));
          setStatTotal(`${h}h ${m}m`);
          setStatSessoes(String(data.sessoes));
        }
      } catch {
        /* offline */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function trocarAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      localStorage.setItem(k("avatarURL"), url);
      setAvatarUrl(url);
    };
    reader.readAsDataURL(file);
  }

  function toggleDestaque(id) {
    setDestaques((atual) => {
      let novo;
      const idx = atual.indexOf(id);
      if (idx === -1) {
        novo = atual.length >= 3 ? [...atual.slice(1), id] : [...atual, id];
      } else {
        novo = atual.filter((x) => x !== id);
      }
      localStorage.setItem(k("conquistasDestaque"), JSON.stringify(novo));
      return novo;
    });
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  if (!token) return null;

  const streak = calcularStreak(k);

  return (
    <>
      <Navbar />
      <main className="conta-main">
        <div className="perfil-card">
          <div className="avatar-wrap">
            <label className="avatar" htmlFor="inputAvatar">
              {avatarUrl ? <img src={avatarUrl} alt="avatar" /> : "🍅"}
            </label>
            <label className="avatar-edit-btn" htmlFor="inputAvatar" title="Alterar foto">✏️</label>
            <input
              type="file"
              id="inputAvatar"
              accept="image/*"
              style={{ display: "none" }}
              onChange={trocarAvatar}
            />
          </div>
          <div className="perfil-info">
            <h2>{usuario.nome}</h2>
            <p>{usuarioId ? `ID #${usuarioId}` : "Visitante"}</p>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Sair</button>
        </div>

        <p className="secao-titulo">📊 Estatísticas</p>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-valor">{statTotal}</div>
            <div className="stat-label">Total estudado</div>
          </div>
          <div className="stat-card">
            <div className="stat-valor">{statSessoes}</div>
            <div className="stat-label">Sessões</div>
          </div>
          <div className="stat-card">
            <div className="stat-valor">{streak} dias</div>
            <div className="stat-label">Streak atual 🔥</div>
          </div>
        </div>

        <p className="secao-titulo">🏆 Conquistas</p>
        <div className="conquistas-grid">
          <p className="conquistas-subtitulo">⏱️ Tempo de estudo</p>
          <div className="conquistas-subgrid">
            {CONQUISTAS_TEMPO.map((c) => (
              <ConquistaCard
                key={c.id}
                c={c}
                desbloqueada={minutosTotal >= c.req}
                emDestaque={destaques.includes(c.id)}
                onToggleDestaque={toggleDestaque}
              />
            ))}
          </div>

          <p className="conquistas-subtitulo">🔥 Dias seguidos de estudo</p>
          <div className="conquistas-subgrid">
            {CONQUISTAS_STREAK.map((c) => (
              <ConquistaCard
                key={c.id}
                c={c}
                desbloqueada={streak >= c.req}
                emDestaque={destaques.includes(c.id)}
                onToggleDestaque={toggleDestaque}
              />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
