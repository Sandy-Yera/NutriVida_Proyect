import { obtener as obtenerUsuario } from "../data/usuariosData.js";
import { errorNoAutenticado, errorProhibido } from "../utils/errores.js";

// Quién hace la operación. En EP2 se busca por el id que entrega la página (sesion.id).
// En EP3 este dato sale del JWT en el microservicio (no lo manda el frontend), así que la regla
// queda igual: si no hay usuario válido es 401 y si el rol no corresponde es 403.
export function exigirActor(usuarioId, roles = []) {
  const usuario = usuarioId ? obtenerUsuario(usuarioId) : null;
  if (!usuario || !usuario.activo) throw errorNoAutenticado();
  if (roles.length > 0 && !roles.includes(usuario.rol)) throw errorProhibido();
  return {
    id: usuario.id,
    rol: usuario.rol,
    nutricionistaId: usuario.nutricionistaId ?? null,
  };
}
