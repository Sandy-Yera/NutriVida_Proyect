// Si lo guardado está dañado (JSON inválido), se vuelve a la semilla en vez de romper la app.
export function leer(clave, semilla) {
  const guardado = localStorage.getItem(clave);
  if (guardado) {
    try {
      return JSON.parse(guardado);
    } catch {
      localStorage.removeItem(clave);
    }
  }
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
