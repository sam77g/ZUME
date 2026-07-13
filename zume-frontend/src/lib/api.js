// Base URL do backend.
// Em dev, cai em localhost:3000 (igual ao projeto antigo).
// Em produção, defina VITE_API_URL no .env (ex: VITE_API_URL=https://sua-api.onrender.com)
export const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
