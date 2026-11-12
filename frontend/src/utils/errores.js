// Contrato de errores común a los 5 services (preparación EP3).
// Cada error lleva el código HTTP que devolverá el microservicio de Spring Boot y la misma
// forma del cuerpo de error que se acordó para el @RestControllerAdvice:
//   { estado: 409, codigo: "CONFLICTO", mensaje: "...", errores: { campo: "mensaje" } }
// Así, cuando los services llamen a la API, la UI no cambia: sigue leyendo error.message,
// error.campo (formularios de un campo) y error.errores (formularios de varios campos).

export const CODIGOS = {
  VALIDACION: 400,
  NO_AUTENTICADO: 401,
  PROHIBIDO: 403,
  NO_ENCONTRADO: 404,
  CONFLICTO: 409,
  MUY_GRANDE: 413,
  TIPO_NO_SOPORTADO: 415,
};

export class ErrorApi extends Error {
  constructor(mensaje, { codigo = "VALIDACION", campo, errores } = {}) {
    super(mensaje);
    this.name = "ErrorApi";
    this.codigo = codigo;
    this.estado = CODIGOS[codigo] ?? 400;
    if (campo) this.campo = campo;
    if (errores) this.errores = errores;
  }

  // Cuerpo JSON equivalente al que devolverá el backend. Un error de un solo campo
  // viaja igual que uno de varios: dentro de "errores".
  aCuerpo() {
    return {
      estado: this.estado,
      codigo: this.codigo,
      mensaje: this.message,
      errores: this.errores ?? (this.campo ? { [this.campo]: this.message } : {}),
    };
  }
}

export const errorValidacion = (mensaje, opciones) =>
  new ErrorApi(mensaje, { ...opciones, codigo: "VALIDACION" });

export const errorDeCampo = (campo, mensaje) =>
  new ErrorApi(mensaje, { codigo: "VALIDACION", campo });

export const errorNoAutenticado = (mensaje = "Debes iniciar sesión para continuar.") =>
  new ErrorApi(mensaje, { codigo: "NO_AUTENTICADO" });

export const errorProhibido = (mensaje = "No tienes permiso para hacer esto.") =>
  new ErrorApi(mensaje, { codigo: "PROHIBIDO" });

export const errorNoEncontrado = (mensaje) => new ErrorApi(mensaje, { codigo: "NO_ENCONTRADO" });

export const errorConflicto = (mensaje, opciones) =>
  new ErrorApi(mensaje, { ...opciones, codigo: "CONFLICTO" });

// Reconstruye un ErrorApi desde el cuerpo que devuelve el backend (para el cliente HTTP de EP3).
export function desdeRespuesta(cuerpo, estadoHttp) {
  const codigo =
    cuerpo?.codigo ?? Object.keys(CODIGOS).find((c) => CODIGOS[c] === estadoHttp) ?? "VALIDACION";
  const errores =
    cuerpo?.errores && Object.keys(cuerpo.errores).length ? cuerpo.errores : undefined;
  const campos = errores ? Object.keys(errores) : [];
  return new ErrorApi(cuerpo?.mensaje ?? "Ocurrió un error inesperado.", {
    codigo,
    errores,
    campo: campos.length === 1 ? campos[0] : undefined,
  });
}
