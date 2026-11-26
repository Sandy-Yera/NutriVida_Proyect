package cl.duoc.nutrivida.citas.client;

/** ms-clinica no entregó el horario o el catálogo (ver ServicioNoDisponibleException). */
public class ClinicaNoDisponibleException extends ServicioNoDisponibleException {

    public static final String MENSAJE =
            "No pudimos consultar el horario de la clínica. Intenta nuevamente en unos minutos.";

    public ClinicaNoDisponibleException(String detalle, boolean permiteRespaldo, Throwable causa) {
        super(MENSAJE, detalle, permiteRespaldo, causa);
    }
}
