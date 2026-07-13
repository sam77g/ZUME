import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Pomodoro from "./pages/Pomodoro";
import Conta from "./pages/Conta";
import EstudoIA from "./pages/EstudoIA";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/pomodoro"
        element={
          <ProtectedRoute>
            <Pomodoro />
          </ProtectedRoute>
        }
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
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
