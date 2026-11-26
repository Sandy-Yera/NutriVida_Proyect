package cl.duoc.nutrivida.citas.client;

import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Modo AUTO de ms-usuarios, igual que ClinicaConRespaldo: pregunta primero a ms-usuarios y solo
 * si no está o aún no tiene el endpoint usa las semillas. Un error de contrato no se esconde.
 */
public class UsuariosConRespaldo implements UsuariosClient {

    private static final Logger log = LoggerFactory.getLogger(UsuariosConRespaldo.class);

    private final UsuariosClient principal;
    private final UsuariosClient respaldo;
    private final AtomicBoolean enRespaldo = new AtomicBoolean(false);

    public UsuariosConRespaldo(UsuariosClient principal, UsuariosClient respaldo) {
        this.principal = principal;
        this.respaldo = respaldo;
    }

    @Override
    public EstadoCuenta estado(String usuarioId) {
        try {
            EstadoCuenta estado = principal.estado(usuarioId);
            if (enRespaldo.compareAndSet(true, false)) log.info("ms-usuarios volvió a responder.");
            return estado;
        } catch (ServicioNoDisponibleException e) {
            if (!e.permiteRespaldo()) throw e;
            if (enRespaldo.compareAndSet(false, true)) {
                log.warn("ms-usuarios no disponible ({}): las cuentas se revisan con las semillas de EP2.", e.getDetalle());
            }
            return respaldo.estado(usuarioId);
        }
    }

    public boolean usandoRespaldo() {
        return enRespaldo.get();
    }
}
