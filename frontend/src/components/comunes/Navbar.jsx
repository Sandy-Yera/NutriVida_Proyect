import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { cerrarSesion, obtenerSesion } from "../../auth/auth.js";
import { enlacesParaRol } from "../../config/menu.js";

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuAbiertoEn, setMenuAbiertoEn] = useState(null);
  const [usuarioAbiertoEn, setUsuarioAbiertoEn] = useState(null);
  const sesion = obtenerSesion();
  const enlaces = enlacesParaRol(sesion?.rol);
  const menuAbierto = menuAbiertoEn === pathname;
  const usuarioAbierto = usuarioAbiertoEn === pathname;

  function alternarMenu() {
    setMenuAbiertoEn(menuAbierto ? null : pathname);
  }

  function alternarUsuario() {
    setUsuarioAbiertoEn(usuarioAbierto ? null : pathname);
  }

  function salir() {
    cerrarSesion();
    setMenuAbiertoEn(null);
    setUsuarioAbiertoEn(null);
    navigate("/", { replace: true });
  }

  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark bg-primary"
      aria-label="Navegación principal"
    >
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">
          NutriVida
        </Link>
        <div className="d-flex align-items-center gap-2 ms-auto order-lg-last ms-lg-3">
          <Link className="btn btn-light btn-sm fw-semibold text-primary" to="/citas/solicitar">
            Solicitar cita
          </Link>
          <button
            type="button"
            className="navbar-toggler"
            aria-controls="menu-principal"
            aria-expanded={menuAbierto}
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            onClick={alternarMenu}
          >
            <span className="navbar-toggler-icon" />
          </button>
        </div>
        <div
          id="menu-principal"
          className={`collapse navbar-collapse${menuAbierto ? " show" : ""}`}
        >
          <ul className="navbar-nav me-auto">
            {enlaces.map((enlace) => (
              <li className="nav-item" key={enlace.ruta}>
                <NavLink className="nav-link" to={enlace.ruta} end={enlace.ruta === "/admin"}>
                  {enlace.texto}
                </NavLink>
              </li>
            ))}
          </ul>
          <ul className="navbar-nav">
            {sesion ? (
              <li className="nav-item dropdown">
                <button
                  type="button"
                  className="nav-link dropdown-toggle"
                  aria-expanded={usuarioAbierto}
                  onClick={alternarUsuario}
                >
                  <i className="bi bi-person-circle me-1" aria-hidden="true" />
                  {sesion.nombre}
                </button>
                <ul className={`dropdown-menu${usuarioAbierto ? " show" : ""}`}>
                  <li>
                    <Link className="dropdown-item" to="/perfil">
                      Mi perfil
                    </Link>
                  </li>
                  <li>
                    <button type="button" className="dropdown-item" onClick={salir}>
                      Cerrar sesión
                    </button>
                  </li>
                </ul>
              </li>
            ) : (
              <li className="nav-item py-2 py-lg-0">
                <Link className="btn btn-outline-light btn-sm" to="/login">
                  Ingresar
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
