import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EVENTO_SESION_EXPIRADA } from "../../services/http.js";

// R9 (modo API): cuando un microservicio responde 401 a una petición con token (sesión vencida
// o cuenta desactivada), apiFetch cierra la sesión y emite EVENTO_SESION_EXPIRADA. Aquí se
// lleva al usuario a /login; al volver a entrar, Login lo devuelve a donde estaba (state.desde).
// "aviso" lleva el mensaje del backend por si la página de login quiere mostrarlo.
export default function SesionExpirada() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function alExpirar(evento) {
      if (location.pathname === "/login") return;
      navigate("/login", {
        replace: true,
        state: { desde: location.pathname + location.search, aviso: evento.detail ?? null },
      });
    }
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
  }, [navigate, location.pathname, location.search]);

  return null;
}
