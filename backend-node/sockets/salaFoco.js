/*
 * sockets/salaFoco.js — Salas de foco colaborativas em tempo real.
 * Vários usuários entram numa sala pelo código, veem uns aos outros
 * e têm o timer sincronizado (mesmo início, mesma duração para todos).
 * Estado das salas fica em memória (não precisa de tabela no banco).
 */
const jwt = require("jsonwebtoken");

// codigo -> { usuarios: Map(socketId -> nome), fase, duracaoSeg, iniciadoEm, rodando }
const salas = new Map();

/*
 * Rate limit em memória por socket.
 * Cada evento tem sua própria janela (windowMs) e máximo de chamadas (max).
 * socketLimits: Map(socketId -> Map(evento -> { count, resetAt }))
 */
const socketLimits = new Map();

const LIMITES = {
  "sala:entrar":  { windowMs: 10_000, max: 5 }, // 5x / 10s — evita flood de troca de sala
  "sala:iniciar": { windowMs:  5_000, max: 3 }, // 3x / 5s  — evita spam de início
  "sala:pausar":  { windowMs:  5_000, max: 3 }, // 3x / 5s  — evita spam de pausa
};

function dentroDoLimite(socketId, evento) {
  const { windowMs, max } = LIMITES[evento];
  const agora = Date.now();

  if (!socketLimits.has(socketId)) socketLimits.set(socketId, new Map());
  const porEvento = socketLimits.get(socketId);

  if (!porEvento.has(evento) || agora >= porEvento.get(evento).resetAt) {
    porEvento.set(evento, { count: 1, resetAt: agora + windowMs });
    return true;
  }

  const entrada = porEvento.get(evento);
  if (entrada.count >= max) return false;
  entrada.count++;
  return true;
}

function limparLimitesSocket(socketId) {
  socketLimits.delete(socketId);
}

function serializarSala(codigo) {
  const sala = salas.get(codigo);
  if (!sala) return null;
  return {
    codigo,
    usuarios:   Array.from(sala.usuarios.values()),
    fase:       sala.fase,
    duracaoSeg: sala.duracaoSeg,
    iniciadoEm: sala.iniciadoEm,
    rodando:    sala.rodando,
  };
}

function sairDeTodasAsSalas(io, socket) {
  for (const [codigo, sala] of salas.entries()) {
    if (sala.usuarios.has(socket.id)) {
      sala.usuarios.delete(socket.id);
      if (sala.usuarios.size === 0) {
        salas.delete(codigo);
      } else {
        io.to(codigo).emit("sala:atualizada", serializarSala(codigo));
      }
    }
  }
}

module.exports = function registrarSalaFoco(io) {
  // Autentica cada conexão de socket usando o mesmo JWT do REST.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.usuario = payload; // { id, nome }
      next();
    } catch {
      next(new Error("Não autorizado"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("sala:entrar", (codigo) => {
      if (!dentroDoLimite(socket.id, "sala:entrar")) {
        socket.emit("sala:erro", { msg: "muitas_requisicoes" });
        return;
      }
      if (!codigo || typeof codigo !== "string") return;
      const cod = codigo.trim().toUpperCase().slice(0, 8);
      if (!cod) return;

      sairDeTodasAsSalas(io, socket);
      socket.join(cod);

      if (!salas.has(cod)) {
        salas.set(cod, {
          usuarios:   new Map(),
          fase:       "foco",
          duracaoSeg: 25 * 60,
          iniciadoEm: null,
          rodando:    false,
        });
      }
      salas.get(cod).usuarios.set(socket.id, socket.usuario.nome || "Estudante");
      io.to(cod).emit("sala:atualizada", serializarSala(cod));
    });

    socket.on("sala:iniciar", ({ codigo, duracaoSeg, fase }) => {
      if (!dentroDoLimite(socket.id, "sala:iniciar")) {
        socket.emit("sala:erro", { msg: "muitas_requisicoes" });
        return;
      }
      const sala = salas.get(codigo);
      if (!sala || !sala.usuarios.has(socket.id)) return;
      sala.duracaoSeg = Math.min(Math.max(parseInt(duracaoSeg, 10) || 1500, 60), 4 * 3600);
      sala.fase       = fase === "pausa" ? "pausa" : "foco";
      sala.iniciadoEm = Date.now();
      sala.rodando    = true;
      io.to(codigo).emit("sala:atualizada", serializarSala(codigo));
    });

    socket.on("sala:pausar", (codigo) => {
      if (!dentroDoLimite(socket.id, "sala:pausar")) {
        socket.emit("sala:erro", { msg: "muitas_requisicoes" });
        return;
      }
      const sala = salas.get(codigo);
      if (!sala || !sala.usuarios.has(socket.id)) return;
      sala.rodando = false;
      io.to(codigo).emit("sala:atualizada", serializarSala(codigo));
    });

    socket.on("sala:sair", () => {
      sairDeTodasAsSalas(io, socket);
      limparLimitesSocket(socket.id);
    });

    socket.on("disconnect", () => {
      sairDeTodasAsSalas(io, socket);
      limparLimitesSocket(socket.id);
    });
  });
};
