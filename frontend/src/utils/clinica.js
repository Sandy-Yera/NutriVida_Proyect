import { aFechaLocal } from "./formato.js";

export const OBJETIVOS_FICHA = {
  PERDIDA_PESO: "Pérdida de peso",
  METABOLICO: "Control metabólico",
  DEPORTIVA: "Nutrición deportiva",
  VEGETARIANA: "Alimentación vegetariana o vegana",
  INFANTIL: "Nutrición infantil",
};

const RANGOS_MEDICION = [
  { campo: "pesoKg", nombre: "el peso", min: 2, max: 300, unidad: "kg", obligatorio: true },
  { campo: "tallaCm", nombre: "la talla", min: 45, max: 230, unidad: "cm", obligatorio: true },
  { campo: "cinturaCm", nombre: "la cintura", min: 30, max: 200, unidad: "cm" },
  { campo: "caderaCm", nombre: "la cadera", min: 30, max: 200, unidad: "cm" },
  { campo: "grasaPct", nombre: "el % de grasa", min: 2, max: 70, unidad: "%" },
];

export function quitarTildes(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function calcularImc(pesoKg, tallaCm) {
  const tallaM = Number(tallaCm) / 100;
  if (!Number(pesoKg) || !tallaM) return null;
  return Math.round((Number(pesoKg) / (tallaM * tallaM)) * 10) / 10;
}

export function clasificarImc(imc, objetivo) {
  if (imc === null || imc === undefined || objetivo === "INFANTIL") return null;
  if (imc < 18.5) return "Bajo peso";
  if (imc < 25) return "Normal";
  if (imc < 30) return "Sobrepeso";
  return "Obesidad";
}

export function validarMedicion(datos, hoy = new Date()) {
  const errores = {};
  RANGOS_MEDICION.forEach(({ campo, nombre, min, max, unidad, obligatorio }) => {
    const valor = datos[campo];
    if (valor === undefined || valor === null || valor === "") {
      if (obligatorio) errores[campo] = `Ingresa ${nombre}.`;
      return;
    }
    const numero = Number(valor);
    if (Number.isNaN(numero) || numero < min || numero > max) {
      const etiqueta = nombre.charAt(0).toUpperCase() + nombre.slice(1);
      errores[campo] = `${etiqueta} debe estar entre ${min} y ${max} ${unidad}.`;
    }
  });
  if (!datos.fecha) {
    errores.fecha = "Ingresa la fecha de la medición.";
  } else if (aFechaLocal(datos.fecha) > hoy) {
    errores.fecha = "La fecha de la medición no puede ser futura.";
  }
  return errores;
}

export function filtrarServicios(lista, { tipo, texto } = {}) {
  const buscado = quitarTildes(texto);
  return lista.filter(
    (servicio) =>
      (!tipo || servicio.tipo === tipo) &&
      (!buscado || quitarTildes(`${servicio.nombre} ${servicio.descripcion}`).includes(buscado)),
  );
}

export function pacientesDeNutricionista(fichas, nutricionistaId) {
  return fichas.filter((ficha) => ficha.nutricionistaId === nutricionistaId);
}
