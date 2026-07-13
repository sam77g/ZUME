import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

export default function Navbar({ variant = "solid" }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`navbar${variant === "light" ? " navbar--light" : ""}`}>
      <Link to="/pomodoro" className="nav-logo">
        <img src="/assets/path58.png" alt="ZUME" />
        ZUME
      </Link>
      <div className="nav-links">
        <Link to="/pomodoro" title="Início" className={isActive("/pomodoro") ? "active" : ""}>
          <img src="/icons/home_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg" alt="Início" />
        </Link>
        <Link to="/estudo-ia" title="Materiais com IA" className={isActive("/estudo-ia") ? "active" : ""}>
          <img src="/icons/book_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg" alt="Materiais" />
        </Link>
        <Link to="/sala" title="Salas de Foco" className={`nav-emoji${isActive("/sala") ? " active" : ""}`}>
          <span>👥</span>
        </Link>
        <Link to="/conta" title="Conta" className={isActive("/conta") ? "active" : ""}>
          <img src="/icons/person_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg" alt="Conta" />
        </Link>
      </div>
    </nav>
  );
}
