import { Navigate, useLocation } from "react-router-dom";
import { obtenerSesion } from "../../auth/auth.js";
import { sesionVencida } from "../../auth/token.js";

export default function RutaProtegida({ roles = [], children }) {
  const location = useLocation();
  // Se revisa antes de obtenerSesion, que borra el token vencido.
  const vencida = sesionVencida();
  const sesion = obtenerSesion();

  if (!sesion) {
    const aviso = vencida ? "Tu sesión expiró. Inicia sesión nuevamente." : null;
    return (
      <Navigate to="/login" state={{ desde: location.pathname + location.search, aviso }} replace />
    );
  }

  if (roles.length > 0 && !roles.includes(sesion.rol)) {
    return <Navigate to="/" state={{ mensaje: "No tienes acceso a esa sección." }} replace />;
  }

  return children;
}
