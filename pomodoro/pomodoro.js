/* pomodoro.js — timer + salva sessão no backend C */

const API = "http://localhost:8080";

let time        = 25 * 60;   /* segundos */
let interval    = null;
let segundosEstudados = 0;   /* acumula tempo real desta sessão */

function updateDisplay() {
    const minutes = Math.floor(time / 60);
    let   seconds = time % 60;
    seconds = seconds < 10 ? "0" + seconds : seconds;
    document.getElementById("timer").textContent = `${minutes}:${seconds}`;
}

function startTimer() {
    if (interval) return;
    interval = setInterval(() => {
        if (time > 0) {
            time--;
            segundosEstudados++;
            updateDisplay();
        } else {
            clearInterval(interval);
            interval = null;
            salvarSessao(segundosEstudados);
            segundosEstudados = 0;
            alert("Pomodoro finalizado! 🍅");
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(interval);
    interval = null;
}

function resetTimer() {
    clearInterval(interval);
    interval = null;

    /* se estava rodando, salva o que foi estudado até aqui */
    if (segundosEstudados > 0) {
        salvarSessao(segundosEstudados);
        segundosEstudados = 0;
    }

    time = 25 * 60;
    updateDisplay();
}

/* ─── salva sessão no backend ──────────────────────────────── */

async function salvarSessao(duracao_seg) {
    if (duracao_seg <= 0) return;

    const usuario_id = parseInt(sessionStorage.getItem("usuario_id"));
    if (!usuario_id) return; /* usuário não logado, ignora */

    try {
        await fetch(`${API}/salvar_sessao`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario_id, duracao_seg })
        });
        console.log(`Sessão salva: ${duracao_seg}s`);
    } catch (e) {
        console.warn("Não foi possível salvar a sessão:", e);
    }
}

/* ─── busca tempo total do usuário ─────────────────────────── */

async function carregarTempoTotal() {
    const usuario_id = sessionStorage.getItem("usuario_id");
    if (!usuario_id) return;

    try {
        const res  = await fetch(`${API}/tempo_total?usuario_id=${usuario_id}`);
        const data = await res.json();

        if (data.ok) {
            const horas   = Math.floor(data.total_seg / 3600);
            const minutos = Math.floor((data.total_seg % 3600) / 60);
            const el = document.getElementById("tempo-total");
            if (el) el.textContent = `Total estudado: ${horas}h ${minutos}min (${data.sessoes} sessões)`;
        }
    } catch { /* silencioso */ }
}

updateDisplay();
carregarTempoTotal();