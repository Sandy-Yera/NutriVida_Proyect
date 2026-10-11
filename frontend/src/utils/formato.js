const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function formatearPrecio(monto) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(monto);
}

export function aFechaLocal(texto) {
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

export function formatearFecha(texto) {
  const f = aFechaLocal(texto);
  return `${DIAS[f.getDay()]} ${f.getDate()} ${MESES[f.getMonth()]}`;
}
