import { guardar, leer } from "./almacen.js";
import { usuariosSemilla } from "./semillas/usuarios.js";
import { ROLES } from "../config/roles.js";

const CLAVE = "nv_usuarios";

function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizarCorreo(correo) {
  return String(correo ?? "")
    .trim()
    .toLowerCase();
}

export function normalizarRut(rut) {
  return String(rut ?? "")
    .replace(/[.\-\s]/g, "")
    .toUpperCase();
}

function fechaHoy() {
  return new Date().toLocaleDateString("sv-SE");
}

function siguienteId(usuarios) {
  const mayor = usuarios.reduce((max, u) => Math.max(max, Number(u.id.slice(1)) || 0), 0);
  return `U${String(mayor + 1).padStart(3, "0")}`;
}

function coincideTexto(usuario, texto) {
  const buscado = normalizarTexto(texto);
  if (!buscado) return true;
  const nombreCompleto = normalizarTexto(`${usuario.nombre} ${usuario.apellido}`);
  const rutBuscado = normalizarRut(texto);
  return (
    nombreCompleto.includes(buscado) ||
    normalizarCorreo(usuario.correo).includes(buscado) ||
    (rutBuscado !== "" && normalizarRut(usuario.rut).includes(rutBuscado))
  );
}

export function errorDeCampo(campo, mensaje) {
  const error = new Error(mensaje);
  error.campo = campo;
  return error;
}

function validarUnicos(usuarios, datos, idExcluido = null) {
  const otros = usuarios.filter((u) => u.id !== idExcluido);
  if (
    datos.correo !== undefined &&
    otros.some((u) => normalizarCorreo(u.correo) === normalizarCorreo(datos.correo))
  ) {
    throw errorDeCampo("correo", "Ya existe un usuario con ese correo.");
  }
  if (
    datos.rut !== undefined &&
    otros.some((u) => normalizarRut(u.rut) === normalizarRut(datos.rut))
  ) {
    throw errorDeCampo("rut", "Ya existe un usuario con ese RUT.");
  }
  if (datos.nutricionistaId && otros.some((u) => u.nutricionistaId === datos.nutricionistaId)) {
    throw errorDeCampo("nutricionistaId", "Ese nutricionista ya está vinculado a otro usuario.");
  }
}

function validarRol(rol) {
  if (!ROLES.includes(rol)) throw errorDeCampo("rol", "El rol no es válido.");
}

function buscarIndice(usuarios, id) {
  const indice = usuarios.findIndex((u) => u.id === id);
  if (indice === -1) throw new Error("El usuario no existe.");
  return indice;
}

export function listar({ rol, activo, texto } = {}) {
  return leer(CLAVE, usuariosSemilla).filter(
    (u) =>
      (!rol || u.rol === rol) &&
      (typeof activo !== "boolean" || u.activo === activo) &&
      coincideTexto(u, texto),
  );
}

export function obtener(id) {
  return leer(CLAVE, usuariosSemilla).find((u) => u.id === id) ?? null;
}

export function crear(datos) {
  const usuarios = leer(CLAVE, usuariosSemilla);
  const rol = datos.rol ?? "PACIENTE";
  validarRol(rol);
  const nutricionistaId = rol === "NUTRICIONISTA" ? (datos.nutricionistaId ?? null) : null;
  validarUnicos(usuarios, { ...datos, nutricionistaId });
  const nuevo = {
    id: siguienteId(usuarios),
    nombre: String(datos.nombre ?? "").trim(),
    apellido: String(datos.apellido ?? "").trim(),
    rut: String(datos.rut ?? "").trim(),
    correo: normalizarCorreo(datos.correo),
    telefono: String(datos.telefono ?? "").trim(),
    fechaNacimiento: datos.fechaNacimiento ?? null,
    clave: datos.clave,
    rol,
    nutricionistaId,
    activo: datos.activo ?? true,
    creadoEn: fechaHoy(),
  };
  guardar(CLAVE, [...usuarios, nuevo]);
  return nuevo;
}

export function actualizar(id, cambios) {
  const usuarios = leer(CLAVE, usuariosSemilla);
  const indice = buscarIndice(usuarios, id);
  const permitidos = { ...cambios };
  delete permitidos.id;
  delete permitidos.creadoEn;
  if (permitidos.rol !== undefined) validarRol(permitidos.rol);
  const actualizado = { ...usuarios[indice], ...permitidos };
  if (permitidos.correo !== undefined) actualizado.correo = normalizarCorreo(permitidos.correo);
  if (actualizado.rol !== "NUTRICIONISTA") actualizado.nutricionistaId = null;
  validarUnicos(
    usuarios,
    {
      correo: permitidos.correo,
      rut: permitidos.rut,
      nutricionistaId:
        permitidos.nutricionistaId !== undefined ? actualizado.nutricionistaId : null,
    },
    id,
  );
  usuarios[indice] = actualizado;
  guardar(CLAVE, usuarios);
  return actualizado;
}

export function cambiarEstado(id, activo) {
  return actualizar(id, { activo: Boolean(activo) });
}

export function cambiarRol(id, rol) {
  return actualizar(id, { rol });
}

export function registrarPaciente(datos) {
  return crear({ ...datos, rol: "PACIENTE", nutricionistaId: null, activo: true });
}
