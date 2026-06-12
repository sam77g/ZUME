/* pomodoro.js — timer + alarme + pausa auto + modos + metas + calendário */

const API = "http://localhost:8080";

/* ── storage por usuário ─────────────────────────────────────
   Cada usuário tem seu próprio espaço de chaves no localStorage,
   prefixado pelo usuario_id. Assim, dados de uma conta (ex: pomodorosDia,
   minutosDia, diasEstudados, conquistasDestaque, avatarURL) não vazam
   para outra conta criada no mesmo navegador. */
const usuarioId = sessionStorage.getItem("usuario_id") || "anon";
function chave(nome) {
    return `u${usuarioId}_${nome}`;
}

/* ── configurações de modo ────────────────────────────────── */
const MODOS = {
    padrao:     { estudo: 25, pausa: 5,  label: "25 minutos de estudo" },
    pausaCurta: { estudo: 30, pausa: 5,  label: "30 minutos de estudo" },
    pausaLonga: { estudo: 30, pausa: 10, label: "30 minutos de estudo" },
    foco:       { estudo: 50, pausa: 15, label: "50 minutos de foco" },
    focoTotal:  { estudo: 60, pausa: 15, label: "Foco total — 60 min" },
};

let modoAtual       = "padrao";
let emPausa         = false;     /* false = fase de estudo, true = fase de pausa */
let time            = 25 * 60;
let tempoTotal_fase = 25 * 60;
let interval        = null;
let rodando         = false;
let segundosEstudados = 0;
let pomodorosDia    = parseInt(localStorage.getItem(chave("pomodorosDia")) || "0");
let minutosDia      = parseInt(localStorage.getItem(chave("minutosDia")) || "0");
let ultimoDia       = localStorage.getItem(chave("ultimoDia")) || "";
let calMesOffset    = 0;  /* 0 = mês atual, -1 = mês anterior... */

/* ── verifica reset de dia ─────────────────────────────────── */
const hoje = new Date().toISOString().slice(0, 10);
if (ultimoDia !== hoje) {
    pomodorosDia = 0;
    minutosDia = 0;
    localStorage.setItem(chave("pomodorosDia"), "0");
    localStorage.setItem(chave("minutosDia"), "0");
    localStorage.setItem(chave("ultimoDia"), hoje);
}

/* ── funções de display ─────────────────────────────────────── */
function updateDisplay() {
    const m  = Math.floor(time / 60);
    const s  = time % 60;
    document.getElementById("timer").textContent =
        `${m}:${s < 10 ? "0" + s : s}`;

    /* barra de progresso */
    const pct = ((tempoTotal_fase - time) / tempoTotal_fase) * 100;
    document.getElementById("progressBar").style.width = pct + "%";
}

function updateMetas() {
    /* pomodoros */
    const metaPom = 4;
    document.getElementById("metaPomodorosValor").textContent =
        `${pomodorosDia} / ${metaPom}`;
    document.getElementById("metaPomodorosBar").style.width =
        Math.min((pomodorosDia / metaPom) * 100, 100) + "%";

    /* minutos */
    const metaMin = 100;
    document.getElementById("metaMinutosValor").textContent =
        `${minutosDia} / ${metaMin}`;
    document.getElementById("metaMinutosBar").style.width =
        Math.min((minutosDia / metaMin) * 100, 100) + "%";

    /* sessão atual */
    const minAtual = Math.floor(segundosEstudados / 60);
    const metaSessao = MODOS[modoAtual].estudo;
    document.getElementById("metaSessaoAtual").textContent = `${minAtual} min`;
    document.getElementById("metaSessaoBar").style.width =
        Math.min((minAtual / metaSessao) * 100, 100) + "%";

    /* streak */
    const streak = calcularStreak();
    document.getElementById("metaStreak").textContent = streak + " 🔥";
    document.getElementById("metaStreakBar").style.width =
        Math.min((streak / 7) * 100, 100) + "%";
}

/* ── alarme (Web Audio API) ─────────────────────────────────── */
function tocarAlarme() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const toques = [
            { freq: 880, inicio: 0,   dur: 0.25 },
            { freq: 880, inicio: 0.3, dur: 0.25 },
            { freq: 1100,inicio: 0.6, dur: 0.4  },
        ];
        toques.forEach(({ freq, inicio, dur }) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, ctx.currentTime + inicio);
            gain.gain.setValueAtTime(0.3, ctx.currentTime + inicio);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + dur);
            osc.start(ctx.currentTime + inicio);
            osc.stop(ctx.currentTime  + inicio + dur);
        });
    } catch (e) {
        console.warn("Alarme não pôde ser tocado:", e);
    }
}

/* ── controle de fase (estudo ↔ pausa) ──────────────────────── */
function entrarEmPausa() {
    emPausa = true;
    document.body.classList.add("modo-pausa");
    document.getElementById("badgeModo").textContent = "☕ PAUSA";

    const conf = MODOS[modoAtual];
    time = conf.pausa * 60;
    tempoTotal_fase = time;
    document.getElementById("subtituloTimer").textContent =
        `${conf.pausa} minutos de pausa`;
    updateDisplay();

    pomodorosDia++;
    localStorage.setItem(chave("pomodorosDia"), pomodorosDia);
    updateMetas();
    marcarDiaEstudado();
    renderCalendario();

    iniciarInterval();
}

function entrarEmEstudo() {
    emPausa = false;
    document.body.classList.remove("modo-pausa");
    document.getElementById("badgeModo").textContent = "🍅 FOCO";

    const conf = MODOS[modoAtual];
    time = conf.estudo * 60;
    tempoTotal_fase = time;
    document.getElementById("subtituloTimer").textContent = conf.label;
    updateDisplay();
    iniciarInterval();
}

function faseTerminou() {
    clearInterval(interval);
    interval = null;
    rodando = false;
    atualizarBotaoPlay();
    tocarAlarme();

    if (!emPausa) {
        /* fase de estudo acabou → salvar e entrar em pausa */
        salvarSessao(segundosEstudados);
        minutosDia += Math.round(segundosEstudados / 60);
        localStorage.setItem(chave("minutosDia"), minutosDia);
        segundosEstudados = 0;
        entrarEmPausa();
        rodando = true;
        atualizarBotaoPlay();
    } else {
        /* pausa acabou → notificar */
        entrarEmEstudo_semAutoplay();
    }
}

function entrarEmEstudo_semAutoplay() {
    emPausa = false;
    document.body.classList.remove("modo-pausa");
    document.getElementById("badgeModo").textContent = "🍅 FOCO";

    const conf = MODOS[modoAtual];
    time = conf.estudo * 60;
    tempoTotal_fase = time;
    document.getElementById("subtituloTimer").textContent = conf.label;
    updateDisplay();
}

/* ── pular fase manualmente ─────────────────────────────────── */
function pularFase() {
    clearInterval(interval);
    interval = null;
    rodando = false;

    if (!emPausa) {
        salvarSessao(segundosEstudados);
        minutosDia += Math.round(segundosEstudados / 60);
        localStorage.setItem(chave("minutosDia"), minutosDia);
        segundosEstudados = 0;
        entrarEmPausa();
        rodando = true;
    } else {
        entrarEmEstudo_semAutoplay();
    }
    atualizarBotaoPlay();
    updateMetas();
}

/* ── play/pause único ────────────────────────────────────────── */
function toggleTimer() {
    if (rodando) {
        clearInterval(interval);
        interval = null;
        rodando = false;
        salvarEstadoTimer();
    } else {
        iniciarInterval();
        rodando = true;
    }
    atualizarBotaoPlay();
}

function iniciarInterval() {
    if (interval) return;
    rodando = true;
    atualizarBotaoPlay();
    interval = setInterval(() => {
        if (time > 0) {
            time--;
            if (!emPausa) {
                segundosEstudados++;
                updateMetas();
            }
            updateDisplay();
            salvarEstadoTimer();
        } else {
            faseTerminou();
        }
    }, 1000);
}

function atualizarBotaoPlay() {
    const icon = document.getElementById("iconPlay");
    if (rodando) {
        icon.src = "/logos_google/pause_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg";
        icon.alt = "pausar";
    } else {
        icon.src = "/logos_google/play_arrow_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg";
        icon.alt = "play";
    }
}

/* ── reset ───────────────────────────────────────────────────── */
function resetTimer() {
    clearInterval(interval);
    interval = null;
    rodando = false;

    if (segundosEstudados > 0) {
        salvarSessao(segundosEstudados);
        minutosDia += Math.round(segundosEstudados / 60);
        localStorage.setItem(chave("minutosDia"), minutosDia);
        segundosEstudados = 0;
    }

    emPausa = false;
    document.body.classList.remove("modo-pausa");
    document.getElementById("badgeModo").textContent = "🍅 FOCO";

    const conf = MODOS[modoAtual];
    time = conf.estudo * 60;
    tempoTotal_fase = time;
    document.getElementById("subtituloTimer").textContent = conf.label;

    limparEstadoTimer();
    atualizarBotaoPlay();
    updateDisplay();
    updateMetas();
}

/* ── mudar modo ─────────────────────────────────────────────── */
function mudarModo(valor) {
    modoAtual = valor;
    resetTimer();
}

/* ── backend ─────────────────────────────────────────────────── */
async function salvarSessao(duracao_seg) {
    if (duracao_seg <= 0) return;
    const usuario_id = parseInt(sessionStorage.getItem("usuario_id"));
    if (!usuario_id) return;
    try {
        await fetch(`${API}/salvar_sessao`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario_id, duracao_seg }),
        });
    } catch (e) {
        console.warn("Não foi possível salvar a sessão:", e);
    }
}

async function carregarTempoTotal() {
    const usuario_id = sessionStorage.getItem("usuario_id");
    if (!usuario_id) return;
    try {
        const res  = await fetch(`${API}/tempo_total?usuario_id=${usuario_id}`);
        const data = await res.json();
        if (data.ok) {
            const h = Math.floor(data.total_seg / 3600);
            const m = Math.floor((data.total_seg % 3600) / 60);
            const el = document.getElementById("tempo-total");
            if (el) el.textContent = `Total: ${h}h ${m}min (${data.sessoes} sessões)`;
        }
    } catch { /* silencioso */ }
}

/* ── streaks ─────────────────────────────────────────────────── */
function marcarDiaEstudado() {
    const dias = JSON.parse(localStorage.getItem(chave("diasEstudados")) || "[]");
    if (!dias.includes(hoje)) {
        dias.push(hoje);
        localStorage.setItem(chave("diasEstudados"), JSON.stringify(dias));
    }
}

function calcularStreak() {
    const dias = JSON.parse(localStorage.getItem(chave("diasEstudados")) || "[]");
    let streak = 0;
    const d = new Date();
    while (true) {
        const key = d.toISOString().slice(0, 10);
        if (dias.includes(key)) {
            streak++;
            d.setDate(d.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

/* ── calendário ─────────────────────────────────────────────── */
function navegarMes(dir) {
    calMesOffset += dir;
    renderCalendario();
}

function renderCalendario() {
    const dias = JSON.parse(localStorage.getItem(chave("diasEstudados")) || "[]");
    const agora = new Date();
    const alvo  = new Date(agora.getFullYear(), agora.getMonth() + calMesOffset, 1);
    const ano   = alvo.getFullYear();
    const mes   = alvo.getMonth();

    const nomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                   "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    document.getElementById("calTitulo").textContent =
        `${nomes[mes]} ${ano}`;

    const primeiroDia = new Date(ano, mes, 1).getDay(); /* 0=dom */
    const totalDias   = new Date(ano, mes + 1, 0).getDate();
    const grid = document.getElementById("calGrid");
    grid.innerHTML = "";

    /* células vazias antes do dia 1 */
    for (let i = 0; i < primeiroDia; i++) {
        const vazio = document.createElement("div");
        vazio.className = "cal-dia vazio";
        grid.appendChild(vazio);
    }

    const hojeKey = agora.toISOString().slice(0, 10);

    for (let d = 1; d <= totalDias; d++) {
        const key  = `${ano}-${String(mes+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const cell = document.createElement("div");
        cell.className = "cal-dia";
        cell.textContent = d;
        if (dias.includes(key)) cell.classList.add("streak");
        if (key === hojeKey)     cell.classList.add("hoje");
        grid.appendChild(cell);
    }
}

/* ── persistência do timer entre páginas ─────────────────────── */

function salvarEstadoTimer() {
    localStorage.setItem(chave("timerState"), JSON.stringify({
        time,
        emPausa,
        modoAtual,
        rodando,
        tempoTotal_fase,
        segundosEstudados,
        savedAt: Date.now(),
    }));
}

function limparEstadoTimer() {
    localStorage.removeItem(chave("timerState"));
}

function restaurarEstadoTimer() {
    const raw = localStorage.getItem(chave("timerState"));
    if (!raw) return false;
    try {
        const estado = JSON.parse(raw);
        const elapsed = Math.floor((Date.now() - estado.savedAt) / 1000);

        modoAtual         = estado.modoAtual   || "padrao";
        emPausa           = estado.emPausa     || false;
        tempoTotal_fase   = estado.tempoTotal_fase;
        segundosEstudados = estado.segundosEstudados || 0;

        /* sincroniza o <select> com o modo salvo */
        const sel = document.getElementById("modoSelect");
        if (sel) sel.value = modoAtual;

        const conf = MODOS[modoAtual];
        if (emPausa) {
            document.body.classList.add("modo-pausa");
            document.getElementById("badgeModo").textContent = "☕ PAUSA";
            document.getElementById("subtituloTimer").textContent =
                `${conf.pausa} minutos de pausa`;
        } else {
            document.getElementById("badgeModo").textContent = "🍅 FOCO";
            document.getElementById("subtituloTimer").textContent = conf.label;
        }

        if (estado.rodando) {
            const tempoRestante = estado.time - elapsed;

            if (tempoRestante <= 0) {
                /* fase terminou enquanto a página estava fechada */
                if (!emPausa) {
                    minutosDia += Math.round((segundosEstudados + estado.time) / 60);
                    localStorage.setItem(chave("minutosDia"), minutosDia);
                    pomodorosDia++;
                    localStorage.setItem(chave("pomodorosDia"), pomodorosDia);
                    marcarDiaEstudado();
                    segundosEstudados = 0;
                }
                emPausa = false;
                entrarEmEstudo_semAutoplay();
                limparEstadoTimer();
            } else {
                time = tempoRestante;
                if (!emPausa) segundosEstudados += elapsed;
                iniciarInterval();
            }
        } else {
            time = estado.time;
        }

        return true;
    } catch (e) {
        limparEstadoTimer();
        return false;
    }
}

/* ── inicialização ───────────────────────────────────────────── */
if (!restaurarEstadoTimer()) {
    updateDisplay();
}
updateMetas();
renderCalendario();
carregarTempoTotal();