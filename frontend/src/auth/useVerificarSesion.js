import { useEffect, useState } from "react";
import { verificarSesion } from "./auth.js";

// G-35: al montar el layout (primera carga o F5) confirma la sesión con /api/auth/me.
// El cambio de estado vuelve a dibujar la barra con el nombre y el rol que dio el backend.
export function useVerificarSesion() {
  const [, setVerificada] = useState(0);
  useEffect(() => {
    let vigente = true;
    verificarSesion().then(() => {
      if (vigente) setVerificada((n) => n + 1);
    });
    return () => {
      vigente = false;
    };
  }, []);
}
