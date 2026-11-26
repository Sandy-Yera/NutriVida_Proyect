import { cerrarSesion } from "../auth/auth.js";
import { desdeRespuesta, errorSinConexion } from "../utils/errores.js";

// Cliente HTTP común de los services (EP3). Equivale a src/api.js de DoggySpa, más el JWT y el
// formato de error común. Cada service decide con usarApi() si llama a la API o a data/ (modo dual).

// VITE_API_MODE=api → los services usan los microservicios; cualquier otro valor (o vacío) →
// datos locales de EP2. Las pruebas de Vitest no definen la variable, así que corren en modo local.
export function usarApi() {
  return import.meta.env.VITE_API_MODE === "api";
}

// Vacío = mismo origen: en desarrollo el proxy de Vite (vite.config.js) reparte /api/... a los
// 3 microservicios, así el navegador no necesita CORS.
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

// El token lo guarda el login (ms-usuarios). Clave propia para no mezclarlo con la sesión visible.
export const CLAVE_TOKEN = "tokenSesion";

export function guardarToken(token) {
  localStorage.setItem(CLAVE_TOKEN, token);
}

export function leerToken() {
  return localStorage.getItem(CLAVE_TOKEN);
}

export function borrarToken() {
  localStorage.removeItem(CLAVE_TOKEN);
}

// Evento que escucha la app para llevar a /login con el aviso "Tu sesión expiró".
export const EVENTO_SESION_EXPIRADA = "nutrivida:sesion-expirada";

// apiFetch("/api/citas/mias") · apiFetch("/api/citas", { method: "POST", body: { ... } })
// - Agrega Authorization: Bearer <token> si hay sesión.
// - El body se envía como JSON (salvo FormData, para la foto).
// - 204 → null. Error → lanza ErrorApi con status, mensaje y errores del backend.
// - 401 con token → la sesión venció o no es válida: se cierra y se avisa a la app.
export async function apiFetch(ruta, { method = "GET", body, headers = {}, signal } = {}) {
  const token = leerToken();
  const esFormData = typeof FormData !== "undefined" && body instanceof FormData;
  let respuesta;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !esFormData ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : esFormData ? body : JSON.stringify(body),
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw errorSinConexion();
  }

  if (respuesta.status === 204) return null;
  const esJson = (respuesta.headers.get("content-type") ?? "").includes("application/json");
  const cuerpo = esJson ? await respuesta.json().catch(() => null) : null;

  if (!respuesta.ok) {
    if (respuesta.status === 401 && token) {
      borrarToken();
      cerrarSesion();
      window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA, { detail: cuerpo?.mensaje }));
    }
    throw desdeRespuesta(cuerpo, respuesta.status);
  }
  return cuerpo;
}

// Convención de los services: obtener… devuelve null si no existe (404), como en modo local.
export async function apiFetchONull(ruta, opciones) {
  try {
    return await apiFetch(ruta, opciones);
  } catch (error) {
    if (error.estado === 404) return null;
    throw error;
  }
}

// Arma "?a=1&b=2" omitiendo los valores vacíos.
export function query(parametros = {}) {
  const busqueda = new URLSearchParams();
  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== "")
      busqueda.append(clave, String(valor));
  });
  const texto = busqueda.toString();
  return texto ? `?${texto}` : "";
}
