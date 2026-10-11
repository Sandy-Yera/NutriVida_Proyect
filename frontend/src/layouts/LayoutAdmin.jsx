import { NavLink, Outlet } from "react-router-dom";
import { menuAdmin } from "../config/menu.js";

export default function LayoutAdmin() {
  return (
    <div className="container-fluid">
      <div className="row min-vh-100">
        <nav className="col-12 col-lg-2 bg-primary py-3">
          <p className="text-white fw-bold mb-3">NutriVida Admin</p>
          <ul className="nav flex-row flex-lg-column gap-1">
            {menuAdmin.map((item) => (
              <li className="nav-item" key={item.ruta}>
                <NavLink className="nav-link text-white" to={item.ruta} end={item.exacta}>
                  {item.texto}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="col-12 col-lg-10 py-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
