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

export const NOMBRE_TIPO_SERVICIO = {
  CONSULTA: "Consultas",
  PLAN: "Planes",
  EVALUACION: "Evaluaciones",
  TALLER: "Talleres",
};

export const TIPO_SERVICIO_SINGULAR = {
  CONSULTA: "Consulta",
  PLAN: "Plan especializado",
  EVALUACION: "Evaluación",
  TALLER: "Taller grupal",
};

export const SLUG_TIPO_SERVICIO = {
  CONSULTA: "consultas",
  PLAN: "planes",
  EVALUACION: "evaluaciones",
  TALLER: "talleres",
};

export const TIPOS_AGENDABLES = ["CONSULTA", "EVALUACION", "PLAN"];

export function tipoDesdeSlug(slug) {
  return Object.keys(SLUG_TIPO_SERVICIO).find((tipo) => SLUG_TIPO_SERVICIO[tipo] === slug) ?? null;
}

export function urlSolicitarCita({ servicio, nutricionista } = {}) {
  const parametros = new URLSearchParams();
  if (servicio) parametros.set("servicio", servicio);
  if (nutricionista) parametros.set("nutricionista", nutricionista);
  const consulta = parametros.toString();
  return consulta ? `/citas/solicitar?${consulta}` : "/citas/solicitar";
}

export function incluyeDelPlan(descripcion) {
  const texto = String(descripcion ?? "").trim();
  if (!/^incluye\s/i.test(texto)) return [];
  return texto
    .replace(/^incluye\s+/i, "")
    .replace(/\.$/, "")
    .split("+")
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1));
}

const NOMBRES_DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function describirDias(dias) {
  const ordenados = [...dias].sort((a, b) => a - b);
  if (ordenados.length === 0) return "";
  const consecutivos = ordenados.every((dia, i) => i === 0 || dia === ordenados[i - 1] + 1);
  let texto;
  if (consecutivos && ordenados.length >= 3) {
    texto = `${NOMBRES_DIAS[ordenados[0]]} a ${NOMBRES_DIAS[ordenados.at(-1)]}`;
  } else {
    const nombres = ordenados.map((dia) => NOMBRES_DIAS[dia]);
    texto =
      nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
  }
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export const MOTIVOS_CONTACTO = [
  "Consulta general",
  "Agendamiento de horas",
  "Planes y precios",
  "Talleres grupales",
  "Otro",
];

export function validarContacto(datos) {
  const errores = {};
  const nombre = String(datos.nombre ?? "").trim();
  if (!nombre) errores.nombre = "Ingresa tu nombre.";
  else if (nombre.length < 2) errores.nombre = "El nombre debe tener al menos 2 caracteres.";
  const correo = String(datos.correo ?? "").trim();
  if (!correo) errores.correo = "Ingresa tu correo.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
    errores.correo = "El correo no es válido: usa el formato nombre@dominio.cl.";
  }
  const telefono = String(datos.telefono ?? "").replace(/\s/g, "");
  if (telefono && !/^\+569\d{8}$/.test(telefono)) {
    errores.telefono = "El teléfono debe ser un celular chileno: +56 9 y 8 dígitos.";
  }
  if (!MOTIVOS_CONTACTO.includes(datos.motivo)) errores.motivo = "Elige el motivo de tu mensaje.";
  const mensaje = String(datos.mensaje ?? "").trim();
  if (!mensaje) errores.mensaje = "Escribe tu mensaje.";
  else if (mensaje.length < 10 || mensaje.length > 500) {
    errores.mensaje = "El mensaje debe tener entre 10 y 500 caracteres.";
  }
  return errores;
}

export const INDICADORES_PROGRESO = {
  PESO: { nombre: "Peso", unidad: "kg", decimalesFijos: true },
  CINTURA: { nombre: "Cintura", unidad: "cm", decimalesFijos: false },
  IMC: { nombre: "IMC", unidad: "", decimalesFijos: true },
  GRASA: { nombre: "% grasa", unidad: "%", decimalesFijos: true },
};

export const COMIDAS_PLAN = [
  { clave: "desayuno", nombre: "Desayuno" },
  { clave: "colacion", nombre: "Colación" },
  { clave: "almuerzo", nombre: "Almuerzo" },
  { clave: "once", nombre: "Once" },
  { clave: "cena", nombre: "Cena" },
];

const MESES_CINTA = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const MS_DIA = 86400000;

export function diaDesdeFecha(fecha) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return Date.UTC(anio, mes - 1, dia) / MS_DIA;
}

export function fechaDesdeDia(numero) {
  return new Date(numero * MS_DIA).toISOString().slice(0, 10);
}

export function valorIndicador(medicion, indicador) {
  const valores = {
    PESO: medicion.pesoKg,
    CINTURA: medicion.cinturaCm,
    IMC: calcularImc(medicion.pesoKg, medicion.tallaCm),
    GRASA: medicion.grasaPct,
  };
  const valor = valores[indicador];
  return valor === null || valor === undefined || Number.isNaN(Number(valor))
    ? null
    : Number(valor);
}

export function serieProgreso(mediciones, indicador) {
  return [...mediciones]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((medicion) => ({
      fecha: medicion.fecha,
      dia: diaDesdeFecha(medicion.fecha),
      valor: valorIndicador(medicion, indicador),
    }))
    .filter((punto) => punto.valor !== null);
}

export function formatearMedida(valor, indicador, { conUnidad = false, conSigno = false } = {}) {
  if (valor === null || valor === undefined) return "—";
  const { unidad, decimalesFijos } = INDICADORES_PROGRESO[indicador];
  const numero = new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: decimalesFijos ? 1 : 0,
    maximumFractionDigits: 1,
    signDisplay: conSigno ? "exceptZero" : "auto",
  }).format(valor);
  if (!conUnidad || !unidad) return numero;
  return unidad === "%" ? `${numero} %` : `${numero} ${unidad}`;
}

export function resumenProgreso(serie) {
  if (serie.length === 0) return null;
  const inicial = serie[0];
  const actual = serie.at(-1);
  return { inicial, actual, cambio: Math.round((actual.valor - inicial.valor) * 10) / 10 };
}

export function dominioValores(valores) {
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const margen = Math.max((maximo - minimo) * 0.15, 1);
  return [Math.floor(minimo - margen), Math.ceil(maximo + margen)];
}

export function dominioCinta(serie) {
  if (serie.length === 0) return null;
  const inicioMes = `${serie[0].fecha.slice(0, 7)}-01`;
  return { desde: diaDesdeFecha(inicioMes), hasta: serie.at(-1).dia + 10 };
}

export function marcasCinta({ desde, hasta }) {
  const marcas = [];
  for (let numero = desde; numero <= hasta; numero += 1) {
    const fecha = fechaDesdeDia(numero);
    const diaMes = Number(fecha.slice(8, 10));
    const diaSemana = new Date(numero * MS_DIA).getUTCDay();
    let tipo = "dia";
    if (diaMes === 1) tipo = "mes";
    else if (diaSemana === 1) tipo = "semana";
    marcas.push({
      fecha,
      tipo,
      posicion: (numero - desde) / (hasta - desde),
      etiqueta: tipo === "mes" ? MESES_CINTA[Number(fecha.slice(5, 7)) - 1] : null,
    });
  }
  return marcas;
}

const ESTADOS_PROXIMA_CITA = ["PENDIENTE", "CONFIRMADA"];

function fechaHoraLocal(fecha) {
  const dos = (n) => String(n).padStart(2, "0");
  const dia = `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
  return `${dia}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

export function proximaCita(citas, pacienteId, ahora = new Date()) {
  const limite = fechaHoraLocal(ahora);
  const vigentes = citas.filter(
    (cita) =>
      cita.pacienteId === pacienteId &&
      ESTADOS_PROXIMA_CITA.includes(cita.estado) &&
      `${cita.fecha}T${cita.hora}` >= limite,
  );
  vigentes.sort((a, b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`));
  return vigentes[0] ?? null;
}
