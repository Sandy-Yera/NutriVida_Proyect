package cl.duoc.nutrivida.citas.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

/**
 * Cuerpo de error común a los 3 microservicios (ver documentacion/ep3/contrato-backend.md).
 * <pre>
 * { "timestamp": "2026-11-20T15:04:05Z", "status": 409, "error": "Conflict",
 *   "mensaje": "Ese horario ya está tomado.", "ruta": "/api/citas", "errores": { "hora": "..." } }
 * </pre>
 * "mensaje" es lo único que la interfaz muestra; "errores" solo aparece si hay campos con error.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorRespuesta(
        String timestamp,
        int status,
        String error,
        String mensaje,
        String ruta,
        Map<String, String> errores) {
}
