import { Navigate, useLocation } from "react-router-dom";
import { obtenerSesion } from "../../auth/auth.js";

export default function RutaProtegida({ roles = [], children }) {
  const location = useLocation();
  const sesion = obtenerSesion();

  if (!sesion) {
    return <Navigate to="/login" state={{ desde: location.pathname + location.search }} replace />;
  }

  if (roles.length > 0 && !roles.includes(sesion.rol)) {
    return <Navigate to="/" state={{ mensaje: "No tienes acceso a esa sección." }} replace />;
  }

  return children;
}
