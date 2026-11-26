package cl.duoc.nutrivida.citas.client;

import cl.duoc.nutrivida.citas.dto.HorarioNutricionista;
import cl.duoc.nutrivida.citas.dto.ServicioClinica;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Modo AUTO: pregunta siempre primero a ms-clinica, y solo si no está o aún no tiene el endpoint
 * usa las semillas de EP2. Así ms-citas funciona hoy, antes de C-31, y empieza a usar los datos
 * reales de Catalina apenas existan, sin cambiar nada.
 *
 * <p>Si ms-clinica responde pero algo no calza con el contrato (401, JSON con otra forma), NO se
 * usan las semillas: el error sale como 503 para que se note y se corrija.
 *
 * <p>Cada catálogo va por separado: si Catalina publica /api/servicios antes que
 * /api/nutricionistas, los servicios ya salen de ms-clinica. El aviso queda en el log una vez
 * al pasar a las semillas y otra al volver a ms-clinica, no en cada petición.
 */
public class ClinicaConRespaldo implements ClinicaClient {

    private static final Logger log = LoggerFactory.getLogger(ClinicaConRespaldo.class);

    private final ClinicaClient principal;
    private final ClinicaClient respaldo;
    private final AtomicBoolean nutricionistasEnRespaldo = new AtomicBoolean(false);
    private final AtomicBoolean serviciosEnRespaldo = new AtomicBoolean(false);

    public ClinicaConRespaldo(ClinicaClient principal, ClinicaClient respaldo) {
        this.principal = principal;
        this.respaldo = respaldo;
    }

    @Override
    public List<HorarioNutricionista> nutricionistas() {
        return intentar("nutricionistas", nutricionistasEnRespaldo, principal::nutricionistas, respaldo::nutricionistas);
    }

    @Override
    public List<ServicioClinica> servicios() {
        return intentar("servicios", serviciosEnRespaldo, principal::servicios, respaldo::servicios);
    }

    /** true mientras algún catálogo sale de las semillas. */
    public boolean usandoRespaldo() {
        return nutricionistasEnRespaldo.get() || serviciosEnRespaldo.get();
    }

    private <T> T intentar(String catalogo, AtomicBoolean enRespaldo, Supplier<T> real, Supplier<T> simulado) {
        try {
            T resultado = real.get();
            if (enRespaldo.compareAndSet(true, false)) {
                log.info("ms-clinica volvió a responder: los {} vuelven a salir de ms-clinica.", catalogo);
            }
            return resultado;
        } catch (ClinicaNoDisponibleException e) {
            if (!e.permiteRespaldo()) throw e;
            if (enRespaldo.compareAndSet(false, true)) {
                log.warn("ms-clinica no disponible ({}): los {} salen de las semillas de EP2 hasta que responda.",
                        e.getDetalle(), catalogo);
            }
            return simulado.get();
        }
    }
}
