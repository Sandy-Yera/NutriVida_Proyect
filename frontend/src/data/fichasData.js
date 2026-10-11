import { guardar, leer } from "./almacen.js";
import { fichasSemilla, medicionesSemilla, planesSemilla } from "./semillas/fichas.js";
import { pacientesDeNutricionista, validarMedicion } from "../utils/clinica.js";

const CLAVE = "nv_fichas";

const SEMILLA = { fichas: fichasSemilla, mediciones: medicionesSemilla, planes: planesSemilla };

function leerTodo() {
  return leer(CLAVE, SEMILLA);
}

function hoy() {
  return new Date().toLocaleDateString("sv-SE");
}

function siguienteId(lista, prefijo, digitos) {
  const mayor = lista.reduce(
    (max, item) => Math.max(max, Number(item.id.slice(prefijo.length)) || 0),
    0,
  );
  return `${prefijo}${String(mayor + 1).padStart(digitos, "0")}`;
}

function numeroOpcional(valor) {
  return valor === undefined || valor === null || valor === "" ? null : Number(valor);
}

function fichaExistente(fichas, pacienteId) {
  const ficha = fichas.find((f) => f.id === pacienteId);
  if (!ficha) throw new Error("El paciente no tiene ficha: créala antes de continuar.");
  return ficha;
}

export function listarFichas(nutricionistaId) {
  const { fichas } = leerTodo();
  return nutricionistaId ? pacientesDeNutricionista(fichas, nutricionistaId) : fichas;
}

export function obtenerFicha(pacienteId) {
  return leerTodo().fichas.find((f) => f.id === pacienteId) ?? null;
}

export function crearFicha(datos) {
  const todo = leerTodo();
  if (!datos.id || !datos.nutricionistaId) {
    throw new Error("La ficha necesita el paciente y el nutricionista a cargo.");
  }
  if (todo.fichas.some((f) => f.id === datos.id)) {
    throw new Error("Este paciente ya tiene ficha.");
  }
  const ficha = {
    id: datos.id,
    nutricionistaId: datos.nutricionistaId,
    objetivo: datos.objetivo,
    antecedentes: String(datos.antecedentes ?? "").trim(),
    creadaEn: hoy(),
  };
  guardar(CLAVE, { ...todo, fichas: [...todo.fichas, ficha] });
  return ficha;
}

export function listarMediciones(pacienteId) {
  return leerTodo()
    .mediciones.filter((m) => m.pacienteId === pacienteId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function registrarMedicion(pacienteId, datos) {
  const todo = leerTodo();
  const ficha = fichaExistente(todo.fichas, pacienteId);
  const errores = validarMedicion(datos);
  if (Object.keys(errores).length > 0) {
    const error = new Error("La medición tiene datos fuera de rango.");
    error.errores = errores;
    throw error;
  }
  const medicion = {
    id: siguienteId(todo.mediciones, "M", 4),
    pacienteId,
    nutricionistaId: datos.nutricionistaId ?? ficha.nutricionistaId,
    fecha: datos.fecha,
    pesoKg: Number(datos.pesoKg),
    tallaCm: Number(datos.tallaCm),
    cinturaCm: numeroOpcional(datos.cinturaCm),
    caderaCm: numeroOpcional(datos.caderaCm),
    grasaPct: numeroOpcional(datos.grasaPct),
    notas: String(datos.notas ?? "").trim(),
  };
  guardar(CLAVE, { ...todo, mediciones: [...todo.mediciones, medicion] });
  return medicion;
}

export function obtenerPlan(pacienteId) {
  const planes = leerTodo()
    .planes.filter((p) => p.pacienteId === pacienteId)
    .sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde) || b.id.localeCompare(a.id));
  return planes[0] ?? null;
}

export function guardarPlan(pacienteId, plan) {
  const todo = leerTodo();
  const ficha = fichaExistente(todo.fichas, pacienteId);
  const existente = plan.id ? todo.planes.find((p) => p.id === plan.id) : null;
  const guardado = {
    id: existente ? existente.id : siguienteId(todo.planes, "PA", 3),
    pacienteId,
    nutricionistaId: plan.nutricionistaId ?? ficha.nutricionistaId,
    vigenteDesde: plan.vigenteDesde || hoy(),
    objetivo: String(plan.objetivo ?? "").trim(),
    kcalDiarias: numeroOpcional(plan.kcalDiarias),
    comidas: {
      desayuno: plan.comidas?.desayuno ?? "",
      colacion: plan.comidas?.colacion ?? "",
      almuerzo: plan.comidas?.almuerzo ?? "",
      once: plan.comidas?.once ?? "",
      cena: plan.comidas?.cena ?? "",
    },
    indicaciones: String(plan.indicaciones ?? "").trim(),
  };
  const planes = existente
    ? todo.planes.map((p) => (p.id === existente.id ? guardado : p))
    : [...todo.planes, guardado];
  guardar(CLAVE, { ...todo, planes });
  return guardado;
}
