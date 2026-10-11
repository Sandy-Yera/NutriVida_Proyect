import { guardar, leer } from "./almacen.js";
import { serviciosSemilla } from "./semillas/servicios.js";
import { filtrarServicios } from "../utils/clinica.js";

const CLAVE = "nv_servicios";

export const TIPOS_SERVICIO = ["CONSULTA", "PLAN", "EVALUACION", "TALLER"];

const FORMATO_CODIGO = /^[A-Z]{2}\d{3}$/;

function errorDeCampo(campo, mensaje) {
  const error = new Error(mensaje);
  error.campo = campo;
  return error;
}

function ajustarPorTipo(servicio) {
  const ajustado = { ...servicio };
  if (ajustado.tipo === "PLAN") ajustado.duracionMin = null;
  if (ajustado.tipo === "TALLER") {
    ajustado.cupoMax = Number(ajustado.cupoMax) || null;
  } else {
    delete ajustado.cupoMax;
  }
  return ajustado;
}

export function listar({ tipo, texto, soloActivos = true } = {}) {
  const servicios = leer(CLAVE, serviciosSemilla).filter((s) => !soloActivos || s.activo);
  return filtrarServicios(servicios, { tipo, texto });
}

export function obtener(codigo) {
  return leer(CLAVE, serviciosSemilla).find((s) => s.codigo === codigo) ?? null;
}

export function crear(datos) {
  const servicios = leer(CLAVE, serviciosSemilla);
  const codigo = String(datos.codigo ?? "")
    .trim()
    .toUpperCase();
  if (!FORMATO_CODIGO.test(codigo)) {
    throw errorDeCampo("codigo", "El código debe tener 2 letras y 3 números, por ejemplo CN006.");
  }
  if (servicios.some((s) => s.codigo === codigo)) {
    throw errorDeCampo("codigo", "Ya existe un servicio con ese código.");
  }
  if (!TIPOS_SERVICIO.includes(datos.tipo)) {
    throw errorDeCampo("tipo", "El tipo de servicio no es válido.");
  }
  const nuevo = ajustarPorTipo({
    codigo,
    tipo: datos.tipo,
    nombre: String(datos.nombre ?? "").trim(),
    duracionMin: datos.duracionMin === "" ? null : Number(datos.duracionMin) || null,
    modalidad: String(datos.modalidad ?? "").trim(),
    precio: Number(datos.precio),
    descripcion: String(datos.descripcion ?? "").trim(),
    destacado: Boolean(datos.destacado),
    cupoMax: datos.cupoMax,
    activo: datos.activo ?? true,
  });
  guardar(CLAVE, [...servicios, nuevo]);
  return nuevo;
}

export function actualizar(codigo, cambios) {
  const servicios = leer(CLAVE, serviciosSemilla);
  const indice = servicios.findIndex((s) => s.codigo === codigo);
  if (indice === -1) throw new Error("El servicio no existe.");
  if (cambios.tipo !== undefined && !TIPOS_SERVICIO.includes(cambios.tipo)) {
    throw errorDeCampo("tipo", "El tipo de servicio no es válido.");
  }
  const permitidos = { ...cambios };
  delete permitidos.codigo;
  const actualizado = ajustarPorTipo({ ...servicios[indice], ...permitidos });
  servicios[indice] = actualizado;
  guardar(CLAVE, servicios);
  return actualizado;
}

export function cambiarEstado(codigo, activo) {
  return actualizar(codigo, { activo: Boolean(activo) });
}
