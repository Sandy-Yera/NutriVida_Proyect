export function leer(clave, semilla) {
  const guardado = localStorage.getItem(clave);
  if (guardado) return JSON.parse(guardado);
  localStorage.setItem(clave, JSON.stringify(semilla));
  return JSON.parse(JSON.stringify(semilla));
}

export function guardar(clave, datos) {
  localStorage.setItem(clave, JSON.stringify(datos));
}

export function restablecerDatosDemo() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("nv_"))
    .forEach((k) => localStorage.removeItem(k));
}
