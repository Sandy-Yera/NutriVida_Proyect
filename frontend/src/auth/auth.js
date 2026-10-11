import { usuariosSemilla } from "../data/semillas/usuarios.js";

const CLAVE_SESION = "usuarioActual";

const RUTA_INICIO = {
  ADMIN: "/admin",
  SECRETARIA: "/secretaria/agenda",
  NUTRICIONISTA: "/nutricionista/agenda",
  PACIENTE: "/mis-citas",
};

export function iniciarSesion(correo, clave) {
  const correoNormalizado = String(correo ?? "")
    .trim()
    .toLowerCase();
  const usuario = usuariosSemilla.find(
    (u) => u.correo.toLowerCase() === correoNormalizado && u.clave === clave,
  );
  if (!usuario) return { ok: false, error: "Correo o contraseña incorrectos." };
  const sesion = {
    id: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol,
    nutricionistaId: usuario.nutricionistaId,
  };
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  return { ok: true, usuario: sesion };
}

export function obtenerSesion() {
  const guardada = localStorage.getItem(CLAVE_SESION);
  if (!guardada) return null;
  try {
    return JSON.parse(guardada);
  } catch {
    localStorage.removeItem(CLAVE_SESION);
    return null;
  }
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION);
}

export function tieneRol(...roles) {
  const sesion = obtenerSesion();
  return Boolean(sesion) && roles.includes(sesion.rol);
}

export function rutaInicioPorRol(rol) {
  return RUTA_INICIO[rol] ?? "/";
}
