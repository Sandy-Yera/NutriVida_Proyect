package cl.duoc.nutrivida.citas.client;

import cl.duoc.nutrivida.citas.dto.HorarioNutricionista;
import cl.duoc.nutrivida.citas.dto.ServicioClinica;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Lo que ms-citas necesita de ms-clinica (Catalina): el horario de cada nutricionista y la
 * duración, el precio y la modalidad de cada servicio. ms-citas no guarda una copia de esos
 * datos, porque su dueño es ms-clinica (no hay claves foráneas entre esquemas, contrato §1).
 *
 * <p>Tres implementaciones, y ClinicaConfig elige una según NUTRIVIDA_CLINICA_MODO:
 * <ul>
 *   <li>{@link ClinicaHttp}: pide los datos por REST a ms-clinica.</li>
 *   <li>{@link ClinicaSimulada}: las semillas de EP2, sin red (pruebas y plan B si C-31 se atrasa).</li>
 *   <li>{@link ClinicaConRespaldo}: REST y, si ms-clinica no responde, las semillas.</li>
 * </ul>
 * Los services (R7) dependen de esta interfaz y no saben cuál de las tres les tocó.
 */
public interface ClinicaClient {

    /** Todos los nutricionistas con su jornada. */
    List<HorarioNutricionista> nutricionistas();

    /** Todo el catálogo de servicios. */
    List<ServicioClinica> servicios();

    default Optional<HorarioNutricionista> nutricionista(String id) {
        return nutricionistas().stream().filter(n -> n.id().equals(id)).findFirst();
    }

    default Optional<ServicioClinica> servicio(String codigo) {
        return servicios().stream().filter(s -> s.codigo().equals(codigo)).findFirst();
    }

    /** RN-16: códigos de los servicios no presenciales (hoy solo CN004), para ReglasCita.puedeAgendarTeleconsulta. */
    default Set<String> codigosNoPresenciales() {
        return servicios().stream()
                .filter(s -> !s.esPresencial())
                .map(ServicioClinica::codigo)
                .collect(Collectors.toUnmodifiableSet());
    }
}
