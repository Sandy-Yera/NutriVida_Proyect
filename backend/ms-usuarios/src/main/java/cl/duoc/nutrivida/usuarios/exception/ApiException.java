package cl.duoc.nutrivida.usuarios.exception;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * Error de negocio con su código HTTP. Los services lanzan esta excepción y
 * GlobalExceptionHandler la convierte en ErrorRespuesta. Así ningún controlador arma errores a mano.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final Map<String, String> errores;

    public ApiException(HttpStatus status, String mensaje) {
        this(status, mensaje, null);
    }

    public ApiException(HttpStatus status, String mensaje, Map<String, String> errores) {
        super(mensaje);
        this.status = status;
        this.errores = errores == null || errores.isEmpty() ? null : new LinkedHashMap<>(errores);
    }

    public HttpStatus getStatus() { return status; }

    public Map<String, String> getErrores() { return errores; }

    /** 400: un dato con formato o rango inválido, asociado a un campo del formulario. */
    public static ApiException validacion(String campo, String mensaje) {
        return new ApiException(HttpStatus.BAD_REQUEST, mensaje, Map.of(campo, mensaje));
    }

    /** 403: hay sesión, pero el rol o el dueño del recurso no corresponde. */
    public static ApiException prohibido(String mensaje) {
        return new ApiException(HttpStatus.FORBIDDEN, mensaje);
    }

    /** 404: el recurso no existe. */
    public static ApiException noEncontrado(String mensaje) {
        return new ApiException(HttpStatus.NOT_FOUND, mensaje);
    }

    /** 409: choca con el estado actual (horario tomado, transición no permitida, duplicado). */
    public static ApiException conflicto(String mensaje) {
        return new ApiException(HttpStatus.CONFLICT, mensaje);
    }

    /** 409 asociado a un campo (por ejemplo, correo o RUT duplicado). */
    public static ApiException conflicto(String campo, String mensaje) {
        return new ApiException(HttpStatus.CONFLICT, mensaje, Map.of(campo, mensaje));
    }
}
