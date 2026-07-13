import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { API } from "../lib/api";
import { getUsuario, chave, authHeaders } from "../lib/auth";
import "./Pomodoro.css";

const MODOS = {
  padrao: { estudo: 25, pausa: 5, label: "25 minutos de estudo" },
  pausaCurta: { estudo: 30, pausa: 5, label: "30 minutos de estudo" },
  pausaLonga: { estudo: 30, pausa: 10, label: "30 minutos de estudo" },
  foco: { estudo: 50, pausa: 15, label: "50 minutos de foco" },
  focoTotal: { estudo: 60, pausa: 15, label: "Foco total — 60 min" },
};

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function tocarAlarme() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const toques = [
      { freq: 880, inicio: 0, dur: 0.25 },
      { freq: 880, inicio: 0.3, dur: 0.25 },
      { freq: 1100, inicio: 0.6, dur: 0.4 },
    ];
    toques.forEach(({ freq, inicio, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + inicio);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + dur);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + dur);
    });
  } catch (e) {
    console.warn("Alarme não pôde ser tocado:", e);
  }
}

export default function Pomodoro() {
  const navigate = useNavigate();
  const usuario = getUsuario();
  const usuarioId = usuario?.id;
  const token = usuario?.token;
  const k = (nome) => chave(usuarioId, nome);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  const [modoAtual, setModoAtual] = useState(
    () => localStorage.getItem(k("timerState")) ? JSON.parse(localStorage.getItem(k("timerState"))).modoAtual : "padrao"
  );
  const [emPausa, setEmPausa] = useState(false);
  const [time, setTime] = useState(MODOS.padrao.estudo * 60);
  const [tempoTotalFase, setTempoTotalFase] = useState(MODOS.padrao.estudo * 60);
  const [rodando, setRodando] = useState(false);
  const [segundosEstudados, setSegundosEstudados] = useState(0);
  const [tempoTotalTexto, setTempoTotalTexto] = useState("");
  const [calMesOffset, setCalMesOffset] = useState(0);
  const [, forceRender] = useState(0);

  const intervalRef = useRef(null);
  const restauradoRef = useRef(false);

  const [pomodorosDia, setPomodorosDia] = useState(() =>
    parseInt(localStorage.getItem(k("pomodorosDia")) || "0", 10)
  );
  const [minutosDia, setMinutosDia] = useState(() =>
    parseInt(localStorage.getItem(k("minutosDia")) || "0", 10)
  );

  // ── reset diário ────────────────────────────────────────────
  useEffect(() => {
    if (!usuarioId) return;
    const ultimoDia = localStorage.getItem(k("ultimoDia")) || "";
    const hoje = hojeISO();
    if (ultimoDia !== hoje) {
      setPomodorosDia(0);
      setMinutosDia(0);
      localStorage.setItem(k("pomodorosDia"), "0");
      localStorage.setItem(k("minutosDia"), "0");
      localStorage.setItem(k("ultimoDia"), hoje);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId]);

  // ── persistência ─────────────────────────────────────────────
  function salvarEstadoTimer(estadoParcial = {}) {
    if (!usuarioId) return;
    localStorage.setItem(
      k("timerState"),
      JSON.stringify({
        time,
        emPausa,
        modoAtual,
        rodando,
        tempoTotalFase,
        segundosEstudados,
        savedAt: Date.now(),
        ...estadoParcial,
      })
    );
  }

  function limparEstadoTimer() {
    localStorage.removeItem(k("timerState"));
  }

  async function salvarSessao(duracaoSeg) {
    if (duracaoSeg <= 0 || !token) return;
    try {
      await fetch(`${API}/sessoes/salvar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ duracao_seg: duracaoSeg }),
      });
    } catch (e) {
      console.warn("Não foi possível salvar a sessão:", e);
    }
  }

  async function carregarTempoTotal() {
    if (!token) return;
    try {
      const res = await fetch(`${API}/sessoes/tempo_total`, { headers: authHeaders(token) });
      const data = await res.json();
      if (data.ok) {
        const h = Math.floor(data.total_seg / 3600);
        const m = Math.floor((data.total_seg % 3600) / 60);
        setTempoTotalTexto(`Total: ${h}h ${m}min (${data.sessoes} sessões)`);
      }
    } catch {
      /* silencioso */
    }
  }

  function marcarDiaEstudado() {
    const dias = JSON.parse(localStorage.getItem(k("diasEstudados")) || "[]");
    const hoje = hojeISO();
    if (!dias.includes(hoje)) {
      dias.push(hoje);
      localStorage.setItem(k("diasEstudados"), JSON.stringify(dias));
    }
  }

  function calcularStreak() {
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

  // ── controle de fase ─────────────────────────────────────────
  function pararInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function entrarEmPausa() {
    const conf = MODOS[modoAtual];
    setEmPausa(true);
    setTime(conf.pausa * 60);
    setTempoTotalFase(conf.pausa * 60);

    setPomodorosDia((atual) => {
      const novo = atual + 1;
      localStorage.setItem(k("pomodorosDia"), String(novo));
      return novo;
    });
    marcarDiaEstudado();

    iniciarInterval();
  }

  function entrarEmEstudoSemAutoplay() {
    const conf = MODOS[modoAtual];
    setEmPausa(false);
    setTime(conf.estudo * 60);
    setTempoTotalFase(conf.estudo * 60);
  }

  function faseTerminou() {
    pararInterval();
    setRodando(false);
    tocarAlarme();

    setEmPausa((emPausaAtual) => {
      if (!emPausaAtual) {
        setSegundosEstudados((segAtual) => {
          salvarSessao(segAtual);
          setMinutosDia((atual) => {
            const novo = atual + Math.round(segAtual / 60);
            localStorage.setItem(k("minutosDia"), String(novo));
            return novo;
          });
          return 0;
        });
        entrarEmPausa();
        setRodando(true);
        return true;
      } else {
        entrarEmEstudoSemAutoplay();
        return false;
      }
    });
  }

  function iniciarInterval() {
    if (intervalRef.current) return;
    setRodando(true);
    intervalRef.current = setInterval(() => {
      setTime((tAtual) => {
        if (tAtual > 0) {
          const novo = tAtual - 1;
          setEmPausa((ep) => {
            if (!ep) setSegundosEstudados((s) => s + 1);
            return ep;
          });
          return novo;
        } else {
          faseTerminou();
          return tAtual;
        }
      });
    }, 1000);
  }

  function toggleTimer() {
    if (rodando) {
      pararInterval();
      setRodando(false);
      salvarEstadoTimer({ rodando: false });
    } else {
      iniciarInterval();
    }
  }

  function resetTimer(modoParaUsar = modoAtual) {
    pararInterval();
    setRodando(false);

    setSegundosEstudados((segAtual) => {
      if (segAtual > 0) {
        salvarSessao(segAtual);
        const novoMinutosDia = minutosDia + Math.round(segAtual / 60);
        setMinutosDia(novoMinutosDia);
        localStorage.setItem(k("minutosDia"), String(novoMinutosDia));
      }
      return 0;
    });

    setEmPausa(false);
    const conf = MODOS[modoParaUsar];
    setTime(conf.estudo * 60);
    setTempoTotalFase(conf.estudo * 60);
    limparEstadoTimer();
  }

  function mudarModo(valor) {
    setModoAtual(valor);
    resetTimer(valor); // usa o novo modo diretamente, sem depender do próximo render
  }

  // ── restaurar estado ao montar (equivalente a recarregar a página antiga) ──
  useEffect(() => {
    if (!usuarioId) return;
    const raw = localStorage.getItem(k("timerState"));
    let restaurado = false;

    if (raw) {
      try {
        const estado = JSON.parse(raw);
        const elapsed = Math.floor((Date.now() - estado.savedAt) / 1000);
        const modo = estado.modoAtual || "padrao";
        const conf = MODOS[modo];

        setModoAtual(modo);
        setEmPausa(estado.emPausa || false);
        setTempoTotalFase(estado.tempoTotalFase);
        setSegundosEstudados(estado.segundosEstudados || 0);

        if (estado.rodando) {
          const restante = estado.time - elapsed;
          if (restante <= 0) {
            // fase terminou enquanto o app estava fechado
            if (!estado.emPausa) {
              const novoMinutosDia =
                minutosDia + Math.round(((estado.segundosEstudados || 0) + estado.time) / 60);
              setMinutosDia(novoMinutosDia);
              localStorage.setItem(k("minutosDia"), String(novoMinutosDia));
              const novoPomodorosDia = pomodorosDia + 1;
              setPomodorosDia(novoPomodorosDia);
              localStorage.setItem(k("pomodorosDia"), String(novoPomodorosDia));
              marcarDiaEstudado();
              setSegundosEstudados(0);
            }
            setEmPausa(false);
            setTime(conf.estudo * 60);
            setTempoTotalFase(conf.estudo * 60);
            limparEstadoTimer();
          } else {
            setTime(restante);
            iniciarInterval();
          }
        } else {
          setTime(estado.time);
        }
        restaurado = true;
      } catch {
        limparEstadoTimer();
      }
    }

    if (!restaurado) {
      setTime(MODOS.padrao.estudo * 60);
      setTempoTotalFase(MODOS.padrao.estudo * 60);
    }

    restauradoRef.current = true;
    carregarTempoTotal();
    forceRender((x) => x + 1);

    return () => pararInterval();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId]);

  // salva o estado a cada tick (para sobreviver à troca de página no SPA)
  useEffect(() => {
    if (!restauradoRef.current || !usuarioId) return;
    salvarEstadoTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, emPausa, modoAtual, rodando, tempoTotalFase, segundosEstudados]);

  if (!token) return null;

  // ── render helpers ───────────────────────────────────────────
  const m = Math.floor(time / 60);
  const s = time % 60;
  const timerTexto = `${m}:${s < 10 ? "0" + s : s}`;
  const progressoPct = tempoTotalFase > 0 ? ((tempoTotalFase - time) / tempoTotalFase) * 100 : 0;
  const subtitulo = emPausa ? `${MODOS[modoAtual].pausa} minutos de pausa` : MODOS[modoAtual].label;

  const metaPom = 4;
  const metaMin = 100;
  const minAtual = Math.floor(segundosEstudados / 60);
  const metaSessao = MODOS[modoAtual].estudo;
  const streak = calcularStreak();

  // ── calendário ───────────────────────────────────────────────
  const dias = JSON.parse(localStorage.getItem(k("diasEstudados")) || "[]");
  const agora = new Date();
  const alvo = new Date(agora.getFullYear(), agora.getMonth() + calMesOffset, 1);
  const ano = alvo.getFullYear();
  const mes = alvo.getMonth();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const hojeKey = agora.toISOString().slice(0, 10);

  const celulas = [];
  for (let i = 0; i < primeiroDia; i++) celulas.push({ vazio: true, key: `v${i}` });
  for (let d = 1; d <= totalDias; d++) {
    const key = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    celulas.push({ dia: d, key, streak: dias.includes(key), hoje: key === hojeKey });
  }

  return (
    <div className={`pomodoro-page${emPausa ? " modo-pausa" : ""}`}>
      <Navbar variant="light" />
      <div className="pomodoro-container">
        <span className="badge-modo">{emPausa ? "☕ PAUSA" : "🍅 FOCO"}</span>

        <div className="modo-wrap">
          <label htmlFor="modoSelect">Modo de estudo</label>
          <select id="modoSelect" value={modoAtual} onChange={(e) => mudarModo(e.target.value)}>
            <option value="padrao">Padrão — 25min estudo / 5min pausa</option>
            <option value="pausaCurta">Pausa curta — 30min / 5min</option>
            <option value="pausaLonga">Pausa longa — 30min / 10min</option>
            <option value="foco">Mais foco — 50min / 15min</option>
            <option value="focoTotal">Foco total — 60min / 15min</option>
          </select>
        </div>

        <div id="timer">{timerTexto}</div>
        <p className="subtitulo-timer">{subtitulo}</p>

        <div className="progress-wrap">
          <div className="progress-bar" style={{ width: `${progressoPct}%` }} />
        </div>

        <div className="btns">
          <button className="start" onClick={toggleTimer} title="Play/Pause">
            <img
              src={`/icons/${rodando ? "pause" : "play_arrow"}_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg`}
              alt={rodando ? "pausar" : "play"}
            />
          </button>
        </div>

        <p id="tempo-total">{tempoTotalTexto}</p>
      </div>

      <section className="metas-section">
        <h3>⚡ Metas do dia</h3>
        <div className="metas-grid">
          <div className="meta-card">
            <span className="meta-label">Pomodoros</span>
            <span className="meta-valor">{pomodorosDia} / {metaPom}</span>
            <div className="meta-bar-wrap">
              <div className="meta-bar" style={{ width: `${Math.min((pomodorosDia / metaPom) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="meta-card">
            <span className="meta-label">Minutos hoje</span>
            <span className="meta-valor">{minutosDia} / {metaMin}</span>
            <div className="meta-bar-wrap">
              <div className="meta-bar" style={{ width: `${Math.min((minutosDia / metaMin) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="meta-card">
            <span className="meta-label">Streak atual</span>
            <span className="meta-valor">{streak} 🔥</span>
            <div className="meta-bar-wrap">
              <div className="meta-bar" style={{ width: `${Math.min((streak / 7) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="meta-card">
            <span className="meta-label">Sessão atual</span>
            <span className="meta-valor">{minAtual} min</span>
            <div className="meta-bar-wrap">
              <div className="meta-bar" style={{ width: `${Math.min((minAtual / metaSessao) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="calendario-section">
        <h3>📅 Streaks do mês</h3>
        <div className="calendario-wrap">
          <div className="cal-header">
            <button className="cal-nav-btn" onClick={() => setCalMesOffset((o) => o - 1)}>‹</button>
            <span>{NOMES_MES[mes]} {ano}</span>
            <button className="cal-nav-btn" onClick={() => setCalMesOffset((o) => o + 1)}>›</button>
          </div>
          <div className="cal-dias-semana">
            <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
          </div>
          <div className="cal-grid">
            {celulas.map((c) =>
              c.vazio ? (
                <div className="cal-dia vazio" key={c.key} />
              ) : (
                <div
                  className={`cal-dia${c.streak ? " streak" : ""}${c.hoje ? " hoje" : ""}`}
                  key={c.key}
                >
                  {c.dia}
                </div>
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
}