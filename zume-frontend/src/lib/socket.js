import { io } from "socket.io-client";
import { API } from "./api";

let socket = null;

// Reaproveita a mesma conexão em todo o app; conecta só quando alguém
// entra numa sala (autoConnect: false evita gastar conexão à toa).
export function getSocket(token) {
  if (!socket) {
    socket = io(API, {
      auth: { token },
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  } else {
    socket.auth = { token };
  }
  return socket;
}
