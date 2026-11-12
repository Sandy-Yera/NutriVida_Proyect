package cl.duoc.nutrivida.citas.client;

/** ms-usuarios no pudo confirmar si la cuenta está activa (ver ServicioNoDisponibleException). */
public class UsuariosNoDisponibleException extends ServicioNoDisponibleException {

    public static final String MENSAJE =
            "No pudimos confirmar tu sesión con la clínica. Intenta nuevamente en unos minutos.";

    public UsuariosNoDisponibleException(String detalle, boolean permiteRespaldo, Throwable causa) {
        super(MENSAJE, detalle, permiteRespaldo, causa);
    }
}
