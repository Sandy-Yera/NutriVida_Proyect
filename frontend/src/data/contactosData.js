import { guardar, leer } from "./almacen.js";

const CLAVE = "nv_contactos";

export function listar() {
  return leer(CLAVE, []);
}

export function registrar(datos) {
  const contactos = leer(CLAVE, []);
  const mayor = contactos.reduce((max, c) => Math.max(max, Number(c.id.slice(2)) || 0), 0);
  const nuevo = {
    id: `CT${String(mayor + 1).padStart(3, "0")}`,
    nombre: String(datos.nombre ?? "").trim(),
    correo: String(datos.correo ?? "")
      .trim()
      .toLowerCase(),
    telefono: String(datos.telefono ?? "").trim(),
    motivo: datos.motivo,
    mensaje: String(datos.mensaje ?? "").trim(),
    fecha: new Date().toLocaleDateString("sv-SE"),
  };
  guardar(CLAVE, [...contactos, nuevo]);
  return nuevo;
}
