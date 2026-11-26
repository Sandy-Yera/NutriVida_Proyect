package cl.duoc.nutrivida.usuarios.config;

/** Ejemplos de Swagger (G-34). Constantes para usarlas dentro de las anotaciones. */
public final class EjemplosApi {

    public static final String LOGIN_OK = """
            {"token":"eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJVMTAwIiwicm9sIjoiUEFDSUVOVEUiLCJub21icmUiOiJKYXZpZXJhIn0.firma",
             "tipo":"Bearer","expiraEn":28800,
             "usuario":{"id":"U100","nombre":"Javiera","apellido":"Soto","rut":"19.876.543-0",
                        "correo":"javiera.soto@correo.cl","telefono":"+56 9 2222 0100","fechaNacimiento":"1997-04-14",
                        "rol":"PACIENTE","nutricionistaId":null,"activo":true,"creadoEn":"2026-08-01"}}""";

    public static final String USUARIO = """
            {"id":"U100","nombre":"Javiera","apellido":"Soto","rut":"19.876.543-0","correo":"javiera.soto@correo.cl",
             "telefono":"+56 9 2222 0100","fechaNacimiento":"1997-04-14","rol":"PACIENTE","nutricionistaId":null,
             "activo":true,"creadoEn":"2026-08-01"}""";

    public static final String ERROR_401 = """
            {"timestamp":"2026-11-23T15:04:05Z","status":401,"error":"Unauthorized",
             "mensaje":"Correo o contraseña incorrectos.","ruta":"/api/auth/login"}""";

    public static final String ERROR_403 = """
            {"timestamp":"2026-11-23T15:04:05Z","status":403,"error":"Forbidden",
             "mensaje":"No tienes permiso para hacer esto.","ruta":"/api/usuarios"}""";

    public static final String ERROR_409 = """
            {"timestamp":"2026-11-23T15:04:05Z","status":409,"error":"Conflict",
             "mensaje":"Ya existe un usuario con ese correo.","ruta":"/api/usuarios",
             "errores":{"correo":"Ya existe un usuario con ese correo."}}""";

    public static final String ERROR_400 = """
            {"timestamp":"2026-11-23T15:04:05Z","status":400,"error":"Bad Request",
             "mensaje":"Revisa los datos ingresados.","ruta":"/api/auth/registro",
             "errores":{"rut":"El RUT no es válido: revisa el dígito verificador.",
                        "clave":"La contraseña debe tener al menos 8 caracteres, una mayúscula y un número."}}""";

    private EjemplosApi() { }
}
