import { listar, normalizarCorreo, obtener } from "../data/usuariosData.js";

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

export function iniciarSesion(correo, clave) {
  const correoBuscado = normalizarCorreo(correo);
  const usuario = listar().find((u) => normalizarCorreo(u.correo) === correoBuscado);
  if (!usuario || usuario.clave !== clave) {
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }
  if (!usuario.activo) {
    return { ok: false, error: "Tu cuenta está desactivada. Contacta a la clínica." };
  }
  const sesion = aSesion(usuario);
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  return { ok: true, usuario: sesion };
}

export function obtenerSesion() {
  const guardada = leerSesionGuardada();
  const usuario = guardada?.id ? obtener(guardada.id) : null;
  if (!usuario || !usuario.activo) {
    cerrarSesion();
    return null;
  }
  return aSesion(usuario);
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION);
}

export function tieneRol(...roles) {
  const sesion = obtenerSesion();
  return sesion !== null && roles.includes(sesion.rol);
}

export function rutaInicioPorRol(rol) {
  return RUTA_INICIO[rol] ?? "/";
}
