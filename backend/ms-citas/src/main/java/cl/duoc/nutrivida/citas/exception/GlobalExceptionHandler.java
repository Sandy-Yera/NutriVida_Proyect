package cl.duoc.nutrivida.citas.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import cl.duoc.nutrivida.citas.security.JwtFiltro;

/**
 * Único lugar donde se arma el JSON de error. También recibe los 401 y 403 de Spring Security
 * (ManejadorErroresSeguridad se los reenvía), así que todos los errores salen con el mismo formato.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorRespuesta> negocio(ApiException ex, HttpServletRequest req) {
        return responder(ex.getStatus(), ex.getMessage(), ex.getErrores(), req);
    }

    /** 400 de @Valid: un mensaje por campo, para mostrarlo bajo cada input. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorRespuesta> validacion(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> errores = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> errores.putIfAbsent(e.getField(), e.getDefaultMessage()));
        String mensaje = errores.size() == 1 ? errores.values().iterator().next() : "Revisa los datos ingresados.";
        return responder(HttpStatus.BAD_REQUEST, mensaje, errores, req);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorRespuesta> jsonInvalido(HttpMessageNotReadableException ex, HttpServletRequest req) {
        return responder(HttpStatus.BAD_REQUEST, "El cuerpo de la petición no es un JSON válido.", null, req);
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<ErrorRespuesta> parametro(Exception ex, HttpServletRequest req) {
        return responder(HttpStatus.BAD_REQUEST, "Falta un parámetro o tiene un formato inválido.", null, req);
    }

    /** 401: sin token, token vencido o firma inválida. El filtro deja el motivo en la petición. */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorRespuesta> noAutenticado(AuthenticationException ex, HttpServletRequest req) {
        Object motivo = req.getAttribute(JwtFiltro.ATRIBUTO_MOTIVO);
        String mensaje = motivo != null ? motivo.toString() : "Debes iniciar sesión para continuar.";
        return responder(HttpStatus.UNAUTHORIZED, mensaje, null, req);
    }

    /** 403: hay sesión, pero el rol no alcanza (incluye los rechazos de @PreAuthorize). */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorRespuesta> prohibido(AccessDeniedException ex, HttpServletRequest req) {
        return responder(HttpStatus.FORBIDDEN, "No tienes permiso para hacer esto.", null, req);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorRespuesta> rutaInexistente(NoResourceFoundException ex, HttpServletRequest req) {
        return responder(HttpStatus.NOT_FOUND, "La ruta solicitada no existe.", null, req);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorRespuesta> metodo(HttpRequestMethodNotSupportedException ex, HttpServletRequest req) {
        return responder(HttpStatus.METHOD_NOT_ALLOWED, "Ese método HTTP no está disponible en esta ruta.", null, req);
    }

    /** 409 de la base de datos: la última barrera (UNIQUE, claves) cuando dos peticiones compiten. */
    @ExceptionHandler({DataIntegrityViolationException.class, PessimisticLockingFailureException.class,
            ObjectOptimisticLockingFailureException.class})
    public ResponseEntity<ErrorRespuesta> integridad(Exception ex, HttpServletRequest req) {
        log.warn("Conflicto de integridad en {}: {}", req.getRequestURI(), ex.getMessage());
        return responder(HttpStatus.CONFLICT, "El dato choca con otro registro. Actualiza e intenta de nuevo.", null, req);
    }

    /** 500: nunca se muestra el detalle técnico; queda solo en el log del servidor. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorRespuesta> inesperado(Exception ex, HttpServletRequest req) {
        log.error("Error no controlado en {}", req.getRequestURI(), ex);
        return responder(HttpStatus.INTERNAL_SERVER_ERROR, "Ocurrió un error inesperado. Intenta nuevamente.", null, req);
    }

    private ResponseEntity<ErrorRespuesta> responder(HttpStatus status, String mensaje, Map<String, String> errores,
            HttpServletRequest req) {
        ErrorRespuesta cuerpo = new ErrorRespuesta(
                Instant.now().toString(),
                status.value(),
                status.getReasonPhrase(),
                mensaje,
                req.getRequestURI(),
                errores == null || errores.isEmpty() ? null : errores);
        return ResponseEntity.status(status).body(cuerpo);
    }
}
