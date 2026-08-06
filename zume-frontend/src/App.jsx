import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Pomodoro from "./pages/Pomodoro";
import Conta from "./pages/Conta";
import EstudoIA from "./pages/EstudoIA";
import SalaFoco from "./pages/SalaFoco";
import { getToken } from "./lib/auth";
import FlashCards from "./pages/FlashCards";
import Teste from "./pages/Teste";
import Analytics from "./pages/Analytics";
import PlanoEstudos from "./pages/PlanoEstudos";

export default function App() {
  const location = useLocation();
  const logado = !!getToken();
  const naPomodoro = location.pathname === "/pomodoro";

  return (
    <>
      {/* Pomodoro fica sempre montado (uma vez logado) para o timer nunca
          reiniciar ao trocar de página — só escondemos com CSS. */}
      {logado && (
        <div style={{ display: naPomodoro ? "contents" : "none" }}>
          <Pomodoro />
        </div>
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/pomodoro"
          element={<ProtectedRoute>{null}</ProtectedRoute>}
        />
        <Route
          path="/conta"
          element={
            <ProtectedRoute>
              <Conta />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudo-ia"
          element={
            <ProtectedRoute>
              <EstudoIA />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sala"
          element={
            <ProtectedRoute>
              <SalaFoco />
            </ProtectedRoute>
          }
        />
        <Route
  path="/flashcards"
  element={
    <ProtectedRoute>
      <FlashCards />
    </ProtectedRoute>
  }
/>
        <Route
          path="/plano"
          element={
            <ProtectedRoute>
              <PlanoEstudos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teste"
          element={
            <ProtectedRoute>
              <Teste />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
