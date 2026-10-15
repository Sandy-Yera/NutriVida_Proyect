import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cerrarSesion, obtenerSesion } from "../auth/auth.js";
import { menuAdmin } from "../config/menu.js";

function claseEnlace({ isActive }) {
  return `nav-link text-white rounded${isActive ? " bg-white bg-opacity-25 fw-bold" : ""}`;
}

export default function LayoutAdmin() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuAbiertoEn, setMenuAbiertoEn] = useState(null);
  const sesion = obtenerSesion();
  const menuAbierto = menuAbiertoEn === pathname;

  function salir() {
    cerrarSesion();
    navigate("/", { replace: true });
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <aside className="col-12 col-lg-3 col-xl-2 bg-primary text-white p-0 layout-admin-lateral">
          <div className="d-flex align-items-center justify-content-between px-3 py-2 py-lg-3">
            <Link className="text-white fw-bold text-decoration-none" to="/admin">
              NutriVida Admin
            </Link>
            <button
              type="button"
              className="btn btn-outline-light btn-sm d-lg-none"
              aria-controls="menu-admin"
              aria-expanded={menuAbierto}
              onClick={() => setMenuAbiertoEn(menuAbierto ? null : pathname)}
            >
              <i className="bi bi-list" aria-hidden="true" /> Menú
            </button>
          </div>
          <nav
            id="menu-admin"
            className={`${menuAbierto ? "d-block" : "d-none"} d-lg-block px-2 pb-3`}
            aria-label="Menú de administración"
          >
            <ul className="nav flex-column gap-1">
              {menuAdmin.map((item) => (
                <li className="nav-item" key={item.ruta}>
                  <NavLink className={claseEnlace} to={item.ruta} end={item.exacta}>
                    <i className={`bi ${item.icono} me-2`} aria-hidden="true" />
                    {item.texto}
                  </NavLink>
                </li>
              ))}
              <li className="nav-item border-top border-light border-opacity-25 mt-2 pt-2">
                <Link className="nav-link text-white" to="/">
                  <i className="bi bi-box-arrow-up-right me-2" aria-hidden="true" />
                  Ver sitio
                </Link>
              </li>
              <li className="nav-item">
                <button type="button" className="nav-link text-white" onClick={salir}>
                  <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />
                  Cerrar sesión
                </button>
              </li>
            </ul>
            {sesion && (
              <p className="small text-white opacity-75 px-3 mt-3 mb-0">Sesión: {sesion.nombre}</p>
            )}
          </nav>
        </aside>
        <main className="col-12 col-lg-9 col-xl-10 py-4 px-3 px-lg-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
