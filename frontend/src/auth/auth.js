import { listar, normalizarCorreo, obtener } from "../data/usuariosData.js";
import { apiFetch, borrarToken, guardarToken, leerToken, usarApi } from "../services/http.js";
import { recordarVencida, tokenVencido } from "./token.js";

const CLAVE_SESION = "usuarioActual";

const RUTA_INICIO = {
  ADMIN: "/admin",
  SECRETARIA: "/secretaria/agenda",
  NUTRICIONISTA: "/nutricionista/agenda",
  PACIENTE: "/mis-citas",
};

function aSesion(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol,
    nutricionistaId: usuario.nutricionistaId ?? null,
  };
}

function leerSesionGuardada() {
  const guardada = localStorage.getItem(CLAVE_SESION);
  if (!guardada) return null;
  try {
    return JSON.parse(guardada);
  } catch {
    return null;
  }
}

function guardarSesion(usuario) {
  const sesion = aSesion(usuario);
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  return sesion;
}

// Login de EP2 (modo local): compara la clave en el navegador. Se mantiene síncrono porque lo
// usan las pruebas de los tres módulos.
export function iniciarSesion(correo, clave) {
  const correoBuscado = normalizarCorreo(correo);
  const usuario = listar().find((u) => normalizarCorreo(u.correo) === correoBuscado);
  if (!usuario || usuario.clave !== clave) {
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }
  if (!usuario.activo) {
    return { ok: false, error: "Tu cuenta está desactivada. Contacta a la clínica." };
  }
  return { ok: true, usuario: guardarSesion(usuario) };
}

// G-35: login de Login y Registro. En modo API pide el JWT a ms-usuarios y lo guarda;
// en modo local usa iniciarSesion. Misma respuesta en los dos: { ok, usuario } o { ok, error }.
export async function ingresar(correo, clave) {
  if (!usarApi()) return iniciarSesion(correo, clave);
  borrarToken(); // un token viejo haría que un 401 se lea como "sesión expirada"
  try {
    const { token, usuario } = await apiFetch("/api/auth/login", {
      method: "POST",
      body: { correo, clave },
    });
    guardarToken(token);
    recordarVencida(false);
    return { ok: true, usuario: guardarSesion(usuario) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// Síncrono para RutaProtegida, Navbar y las páginas. En modo API con token: la sesión guardada
// en el login, mientras el token no venza. Sin token (modo local, o el puente de citas antes
// de G-32): la cuenta se relee de data/ como en EP2.
export function obtenerSesion() {
  const guardada = leerSesionGuardada();
  if (usarApi() && leerToken()) {
    if (!guardada?.id || tokenVencido()) {
      if (tokenVencido()) recordarVencida(true);
      cerrarSesion();
      return null;
    }
    return guardada;
  }
  const usuario = guardada?.id ? obtener(guardada.id) : null;
  if (!usuario || !usuario.activo) {
    cerrarSesion();
    return null;
  }
  return aSesion(usuario);
}

// Tras F5: confirma con GET /api/auth/me que la cuenta sigue activa y refresca nombre y rol.
// Un 401 lo resuelve apiFetch (cierra la sesión y avisa a SesionExpirada → /login).
// Sin conexión se mantiene la sesión guardada.
export async function verificarSesion() {
  const actual = obtenerSesion();
  if (!usarApi() || !actual || !leerToken()) return actual;
  try {
    return guardarSesion(await apiFetch("/api/auth/me"));
  } catch (error) {
    return error.estado === 401 ? null : actual;
  }
}

// Mi perfil y Editar usuario: la barra superior muestra el nombre nuevo sin recargar.
export function refrescarSesion(usuario) {
  const actual = leerSesionGuardada();
  if (usuario && actual?.id === usuario.id) guardarSesion(usuario);
}

// Cierra la sesión en los dos modos: borra la sesión visible y el JWT.
export function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION);
  borrarToken();
}

export function tieneRol(...roles) {
  const sesion = obtenerSesion();
  return sesion !== null && roles.includes(sesion.rol);
}

export function rutaInicioPorRol(rol) {
  return RUTA_INICIO[rol] ?? "/";
}
