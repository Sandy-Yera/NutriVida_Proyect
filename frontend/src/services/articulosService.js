import { articulosSemilla } from "../data/semillas/articulos.js";

// Consejos nutricionales (RF-ACC-09). Antes las páginas leían la semilla directo; ahora pasan
// por este service para que en EP3 baste con cambiar el origen (GET /api/articulos).
// Los artículos son de solo lectura en EP2, por eso no hay capa data/ con localStorage.

const copia = (articulo) => ({ ...articulo });

// Del más reciente al más antiguo.
export async function listarArticulos() {
  return [...articulosSemilla].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(copia);
}

// null si no existe (404 en EP3).
export async function obtenerArticulo(id) {
  const encontrado = articulosSemilla.find((a) => a.id === id);
  return encontrado ? copia(encontrado) : null;
}
