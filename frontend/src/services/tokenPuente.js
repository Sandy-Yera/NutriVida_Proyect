import { obtenerSesion } from "../auth/auth.js";
import { guardarToken, leerToken } from "./http.js";

// Plan B de G-32 (roadmap de Simon, R8): mientras ms-usuarios no tenga POST /api/auth/login, el
// login sigue siendo el de EP2 (auth.js) y no deja token. En modo API, antes de llamar a
// ms-citas, este puente cambia la sesión local por un token del perfil dev de ms-citas
// (POST /api/dev/token). El token está firmado con el JWT_SECRET real, así ms-citas aplica sus
// roles y reglas de dueño de verdad.
//
// Cuando exista el login real, el login guardará su propio token y este puente no hará nada:
// solo actúa si falta el token o si es de otro usuario. Sin el perfil dev (video y entrega),
// /api/dev/token responde 404 y el puente tampoco hace nada.

// sub del JWT (id del usuario), sin validar la firma: eso lo hace el backend.
export function usuarioDelToken(token) {
  try {
    const carga = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(carga)).sub ?? null;
  } catch {
    return null;
  }
}

let enCurso = null;

export async function asegurarToken() {
  const sesion = obtenerSesion();
  if (!sesion) return null;
  const actual = leerToken();
  if (actual && usuarioDelToken(actual) === sesion.id) return actual;
  if (!enCurso) {
    enCurso = pedirTokenDev(sesion).finally(() => {
      enCurso = null;
    });
  }
  return enCurso;
}

async function pedirTokenDev(sesion) {
  const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
  try {
    const respuesta = await fetch(`${base}/api/dev/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        id: sesion.id,
        rol: sesion.rol,
        nombre: sesion.nombre,
        nutricionistaId: sesion.nutricionistaId ?? undefined,
      }),
    });
    if (!respuesta.ok) return null;
    const { token } = await respuesta.json();
    if (token) guardarToken(token);
    return token ?? null;
  } catch {
    return null; // sin backend: la llamada real dará el error "sin conexión"
  }
}
