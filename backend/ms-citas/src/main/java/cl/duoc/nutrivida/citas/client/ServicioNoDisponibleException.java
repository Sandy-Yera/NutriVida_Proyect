package cl.duoc.nutrivida.citas.client;

import cl.duoc.nutrivida.citas.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Otro microservicio (ms-clinica o ms-usuarios) no entregó un dato que ms-citas necesita. Sale
 * como 503 con el JSON común; el usuario ve un mensaje legible y el detalle técnico queda solo
 * en el log.
 *
 * <p>permiteRespaldo distingue dos casos:
 * <ul>
 *   <li>true: el servicio no está (sin conexión, tiempo agotado, 5xx) o aún no tiene el endpoint.
 *       En modo auto se pueden usar las semillas de EP2.</li>
 *   <li>false: el servicio respondió, pero algo no calza con lo acordado (403, JSON con otra
 *       forma). Es un error del contrato y no se esconde con las semillas.</li>
 * </ul>
 */
public class ServicioNoDisponibleException extends ApiException {

    private final String detalle;
    private final boolean permiteRespaldo;

    public ServicioNoDisponibleException(String mensaje, String detalle, boolean permiteRespaldo, Throwable causa) {
        super(HttpStatus.SERVICE_UNAVAILABLE, mensaje);
        this.detalle = detalle;
        this.permiteRespaldo = permiteRespaldo;
        if (causa != null) initCause(causa);
    }

    public String getDetalle() { return detalle; }

    public boolean permiteRespaldo() { return permiteRespaldo; }
}
