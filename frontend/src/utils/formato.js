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

export function formatearRut(rut) {
  const limpio = String(rut ?? "")
    .replace(/[^0-9kK]/g, "")
    .toUpperCase();
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpo}-${limpio.slice(-1)}`;
}

export function formatearTelefono(telefono) {
  const digitos = String(telefono ?? "").replace(/\D/g, "");
  if (!/^569\d{8}$/.test(digitos)) return String(telefono ?? "").trim();
  return `+56 9 ${digitos.slice(3, 7)} ${digitos.slice(7)}`;
}
