import { Link, NavLink, useNavigate } from "react-router-dom";
import { cerrarSesion, obtenerSesion } from "../../auth/auth.js";
import { menuPublico } from "../../config/menu.js";

export default function Navbar() {
  const navigate = useNavigate();
  const sesion = obtenerSesion();

  function salir() {
    cerrarSesion();
    navigate("/", { replace: true });
  }

  return (
    <nav className="navbar navbar-dark bg-primary">
      <div className="container flex-wrap gap-2">
        <Link className="navbar-brand fw-bold" to="/">
          NutriVida
        </Link>
        <ul className="navbar-nav flex-row flex-wrap gap-3 me-auto">
          {menuPublico.map((item) => (
            <li className="nav-item" key={item.ruta}>
              <NavLink className="nav-link" to={item.ruta} end>
                {item.texto}
              </NavLink>
            </li>
          ))}
        </ul>
        {sesion ? (
          <div className="d-flex align-items-center gap-2 text-white">
            <span>{sesion.nombre}</span>
            <button type="button" className="btn btn-outline-light btn-sm" onClick={salir}>
              Cerrar sesión
            </button>
          </div>
        ) : (
          <Link className="btn btn-outline-light btn-sm" to="/login">
            Ingresar
          </Link>
        )}
      </div>
    </nav>
  );
}
