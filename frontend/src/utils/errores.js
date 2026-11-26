// Contrato de errores común a los services y a los 3 microservicios (EP3).
// Cuerpo JSON que devuelve el GlobalExceptionHandler de cada microservicio
// (detalle en documentacion/ep3/contrato-backend.md):
//   { timestamp, status: 409, error: "Conflict", mensaje: "...", ruta: "/api/citas",
//     errores: { campo: "mensaje" } }   <- "errores" solo si hay campos con error
// En el frontend ese cuerpo se convierte en un ErrorApi, así la UI no cambia entre el modo
// local y el modo API: sigue leyendo error.message, error.campo y error.errores.

export const CODIGOS = {
  VALIDACION: 400,
  NO_AUTENTICADO: 401,
  PAGO_RECHAZADO: 402,
  PROHIBIDO: 403,
  NO_ENCONTRADO: 404,
  NO_PERMITIDO: 405,
  CONFLICTO: 409,
  MUY_GRANDE: 413,
  TIPO_NO_SOPORTADO: 415,
  ERROR_SERVIDOR: 500,
  SIN_CONEXION: 503,
};

// Nombre estándar del código HTTP: el campo "error" del cuerpo.
const FRASE_HTTP = {
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  413: "Payload Too Large",
  415: "Unsupported Media Type",
  500: "Internal Server Error",
  503: "Service Unavailable",
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

  // Cuerpo JSON equivalente al que devuelve el backend. Un error de un solo campo viaja igual
  // que uno de varios: dentro de "errores". Sin campos con error, "errores" no se envía.
  aCuerpo(ruta = "") {
    const errores = this.errores ?? (this.campo ? { [this.campo]: this.message } : null);
    return {
      timestamp: new Date().toISOString(),
      status: this.estado,
      error: FRASE_HTTP[this.estado] ?? "Error",
      mensaje: this.message,
      ruta,
      ...(errores ? { errores } : {}),
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

// Reconstruye un ErrorApi desde la respuesta del backend (lo usa services/http.js).
// "estadoHttp" manda sobre cuerpo.status: si un proxy responde sin JSON, igual sabemos el código.
export function desdeRespuesta(cuerpo, estadoHttp) {
  const estado = estadoHttp ?? cuerpo?.status ?? 500;
  const codigo =
    Object.keys(CODIGOS).find((c) => CODIGOS[c] === estado) ??
    (estado >= 500 ? "ERROR_SERVIDOR" : "VALIDACION");
  const errores =
    cuerpo?.errores && Object.keys(cuerpo.errores).length ? cuerpo.errores : undefined;
  const campos = errores ? Object.keys(errores) : [];
  const error = new ErrorApi(
    cuerpo?.mensaje ?? "Ocurrió un error inesperado. Intenta nuevamente.",
    {
      codigo,
      errores,
      campo: campos.length === 1 ? campos[0] : undefined,
    },
  );
  // Un código que no está en la tabla (por ejemplo 422) conserva su número real.
  error.estado = estado;
  return error;
}

// Sin respuesta del servidor (apagado, sin red o bloqueado por CORS).
export const errorSinConexion = () =>
  new ErrorApi("No fue posible conectar con el servidor. Revisa que el backend esté encendido.", {
    codigo: "SIN_CONEXION",
  });
