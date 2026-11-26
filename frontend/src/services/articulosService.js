import { articulosSemilla } from "../data/semillas/articulos.js";
import { apiFetch, apiFetchONull, usarApi } from "./http.js";

// Consejos nutricionales (RF-ACC-09). Las páginas pasan por este service: en modo API los
// pide a ms-usuarios (GET /api/articulos, público) y en modo local usa la semilla de EP2.
// Son de solo lectura, por eso no hay capa data/ con localStorage.

const copia = (articulo) => ({ ...articulo });

// Del más reciente al más antiguo (el backend ya los entrega así).
export async function listarArticulos() {
  if (usarApi()) return apiFetch("/api/articulos");
  return [...articulosSemilla].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(copia);
}

// null si no existe (404).
export async function obtenerArticulo(id) {
  if (usarApi()) return apiFetchONull(`/api/articulos/${encodeURIComponent(id)}`);
  const encontrado = articulosSemilla.find((a) => a.id === id);
  return encontrado ? copia(encontrado) : null;
}
