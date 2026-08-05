import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getUsuario } from "../lib/auth";
import { getSocket } from "../lib/socket";
import "./SalaFoco.css";

const DURACOES = [
  { label: "25 min", segundos: 25 * 60 },
  { label: "50 min", segundos: 50 * 60 },
];

function gerarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem chars ambíguos
  let cod = "";
  for (let i = 0; i < 5; i++) cod += chars[Math.floor(Math.random() * chars.length)];
  return cod;
}

function formatarTempo(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}

export default function SalaFoco() {
  const navigate = useNavigate();
  const usuario = getUsuario();
  const token = usuario?.token;

  const [codigoInput, setCodigoInput] = useState("");
  const [sala, setSala] = useState(null); // { codigo, usuarios, fase, duracaoSeg, iniciadoEm, rodando }
  const [restante, setRestante] = useState(0);
  const [erro, setErro] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  // ── conexão e eventos do socket ─────────────────────────────
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    socketRef.current = socket;

    const aoAtualizar = (estado) => {
      setSala(estado);
      setErro(null);
    };
    const aoFalharConexao = () => setErro("Não foi possível conectar à sala. Verifique o servidor.");

    socket.on("sala:atualizada", aoAtualizar);
    socket.on("connect_error", aoFalharConexao);

    return () => {
      socket.off("sala:atualizada", aoAtualizar);
      socket.off("connect_error", aoFalharConexao);
      socket.emit("sala:sair");
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── countdown local sincronizado pelo timestamp do servidor ──
  useEffect(() => {
    if (!sala) return;
    if (!sala.rodando) {
      setRestante(sala.duracaoSeg);
      return;
    }
    const tick = () => {
      const passado = (Date.now() - sala.iniciadoEm) / 1000;
      setRestante(Math.max(0, sala.duracaoSeg - passado));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sala]);

  function entrar(codigo) {
    const cod = codigo.trim().toUpperCase();
    if (!cod) return;
    const socket = getSocket(token);
    if (!socket.connected) socket.connect();
    socket.emit("sala:entrar", cod);
  }

  function criarSala() {
    entrar(gerarCodigo());
  }

  function sair() {
    const socket = getSocket(token);
    socket.emit("sala:sair");
    setSala(null);
    setCodigoInput("");
  }

  function iniciar(duracaoSeg) {
    if (!sala) return;
    getSocket(token).emit("sala:iniciar", { codigo: sala.codigo, duracaoSeg, fase: "foco" });
  }

  function pausar() {
    if (!sala) return;
    getSocket(token).emit("sala:pausar", sala.codigo);
  }

  if (!token) return null;

  return (
    <div className="sala-page">
      <Navbar />
      <div className="sala-container">
        {!sala ? (
          <div className="sala-entrar">
            <h1>Salas de Foco</h1>
            <p>Estude junto com outras pessoas em tempo real. Timer sincronizado pra todo mundo.</p>

            <button className="btn-criar" onClick={criarSala}>Criar sala nova</button>

            <div className="sala-divisor"><span>ou</span></div>

            <div className="sala-entrar-codigo">
              <input
                type="text"
                placeholder="Código da sala"
                value={codigoInput}
                maxLength={8}
                onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && entrar(codigoInput)}
              />
              <button onClick={() => entrar(codigoInput)}>Entrar</button>
            </div>

            {erro && <p className="sala-erro">{erro}</p>}
          </div>
        ) : (
          <div className="sala-ativa">
            <div className="sala-header">
              <div>
                <span className="sala-label">Código da sala</span>
                <h2 className="sala-codigo">{sala.codigo}</h2>
              </div>
              <button className="btn-sair" onClick={sair}>Sair</button>
            </div>

            <div className="sala-timer">
              <span className="sala-fase">{sala.fase === "pausa" ? "☕ Pausa" : "🍅 Foco"}</span>
              <div className="sala-tempo">{formatarTempo(restante)}</div>

              {sala.rodando ? (
                <button className="btn-pausar" onClick={pausar}>Pausar pra todos</button>
              ) : (
                <div className="sala-duracoes">
                  {DURACOES.map((d) => (
                    <button key={d.segundos} onClick={() => iniciar(d.segundos)}>
                      Iniciar {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="sala-participantes">
              <span className="sala-label">Na sala ({sala.usuarios.length})</span>
              <ul>
                {sala.usuarios.map((nome, i) => (
                  <li key={i}>{nome}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
