package cl.duoc.nutrivida.citas.client;

import cl.duoc.nutrivida.citas.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * ms-clinica no entregó los datos. Sale como 503 con el JSON común (GlobalExceptionHandler la
 * trata como cualquier ApiException); el usuario ve un mensaje legible y el detalle técnico queda
 * solo en el log.
 *
 * <p>permiteRespaldo distingue dos casos:
 * <ul>
 *   <li>true: ms-clinica no está (sin conexión, tiempo agotado, 5xx) o aún no tiene el endpoint
 *       (404 en la lista). ClinicaConRespaldo puede usar las semillas.</li>
 *   <li>false: ms-clinica respondió, pero algo no calza con lo acordado (401/403, JSON con otra
 *       forma, un horario sin días). Es un error del contrato y no se esconde con las semillas.</li>
 * </ul>
 */
public class ClinicaNoDisponibleException extends ApiException {

    public static final String MENSAJE =
            "No pudimos consultar el horario de la clínica. Intenta nuevamente en unos minutos.";

    private final String detalle;
    private final boolean permiteRespaldo;

    public ClinicaNoDisponibleException(String detalle, boolean permiteRespaldo, Throwable causa) {
        super(HttpStatus.SERVICE_UNAVAILABLE, MENSAJE);
        this.detalle = detalle;
        this.permiteRespaldo = permiteRespaldo;
        if (causa != null) initCause(causa);
    }

    public String getDetalle() { return detalle; }

    public boolean permiteRespaldo() { return permiteRespaldo; }
}
