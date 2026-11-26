import { guardar, leer } from "./almacen.js";
import { nutricionistasSemilla } from "./semillas/nutricionistas.js";
import { ErrorApi, errorDeCampo, errorNoEncontrado } from "../utils/errores.js";

// Los nutricionistas pasan a guardarse en nv_nutricionistas para que la foto persista
// (antes el service devolvía la semilla, que no se puede modificar). En EP3: tabla nutricionista
// de ms-clinica, con la foto en una columna o en un almacenamiento de archivos.
const CLAVE = "nv_nutricionistas";

const FOTO_VALIDA = /^(data:image\/(jpeg|png|webp);base64,|https?:\/\/|\/)/;

function buscarIndice(nutricionistas, id) {
  const indice = nutricionistas.findIndex((n) => n.id === id);
  if (indice === -1) throw errorNoEncontrado("El nutricionista no existe.");
  return indice;
}

export function listar() {
  return leer(CLAVE, nutricionistasSemilla).map((n) => ({ fotoUrl: null, ...n }));
}

export function obtener(id) {
  return listar().find((n) => n.id === id) ?? null;
}

// fotoUrl: imagen data: (EP2), URL de la API (EP3) o null para quitar la foto.
export function actualizarFoto(id, fotoUrl) {
  if (fotoUrl !== null && !FOTO_VALIDA.test(String(fotoUrl ?? ""))) {
    throw errorDeCampo("foto", "La foto no tiene un formato válido.");
  }
  const nutricionistas = listar();
  const indice = buscarIndice(nutricionistas, id);
  const actualizado = { ...nutricionistas[indice], fotoUrl };
  nutricionistas[indice] = actualizado;
  try {
    guardar(CLAVE, nutricionistas);
  } catch {
    // QuotaExceededError: el navegador no tiene espacio para la imagen.
    throw new ErrorApi("La foto es demasiado pesada para guardarla. Prueba con una más liviana.", {
      codigo: "MUY_GRANDE",
      campo: "foto",
    });
  }
  return actualizado;
}
