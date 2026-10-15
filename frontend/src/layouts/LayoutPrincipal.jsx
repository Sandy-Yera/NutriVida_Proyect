import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/comunes/Navbar.jsx";
import Footer from "../components/comunes/Footer.jsx";

export default function LayoutPrincipal() {
  const location = useLocation();
  const mensaje = location.state?.mensaje;
  const esExito = location.state?.tipo === "exito";

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <main className="flex-grow-1">
        {mensaje && (
          <div className="container pt-3">
            <div
              className={`alert mb-0 ${esExito ? "alert-success" : "alert-warning"}`}
              role={esExito ? "status" : "alert"}
            >
              {mensaje}
            </div>
          </div>
        )}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
