package cl.duoc.nutrivida.citas.client;

import cl.duoc.nutrivida.citas.dto.HorarioNutricionista;
import cl.duoc.nutrivida.citas.dto.ServicioClinica;
import java.io.IOException;
import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRequest;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Cliente REST de ms-clinica (NUTRIVIDA_CLINICA_URL, en Docker http://ms-clinica:8083).
 *
 * <p>Pide las listas completas (GET /api/nutricionistas y GET /api/servicios) en vez de un
 * elemento por id, por tres razones:
 * <ul>
 *   <li>El catálogo es chico (4 nutricionistas, 18 servicios): una llamada basta.</li>
 *   <li>La regla de teleconsulta (RN-16) necesita todos los servicios, y las estadísticas, todos
 *       los nutricionistas.</li>
 *   <li>Un 404 de una lista solo puede significar que el endpoint aún no existe. Con
 *       /api/nutricionistas/{id}, un 404 podría ser eso o un id que no existe.</li>
 * </ul>
 *
 * <p>Lo que llega se revisa antes de usarlo: si ms-clinica cambiara la forma del JSON, sin esta
 * revisión un horario sin días daría un 500 lejos de aquí, en ReglasCita.
 */
public class ClinicaHttp implements ClinicaClient {

    private static final Logger log = LoggerFactory.getLogger(ClinicaHttp.class);

    static final String RUTA_NUTRICIONISTAS = "/api/nutricionistas";
    static final String RUTA_SERVICIOS = "/api/servicios";

    private final String urlBase;
    private final RestClient rest;

    /** espera: tiempo máximo para conectar y para leer. Si ms-clinica se cuelga, la reserva no se cuelga con él. */
    public ClinicaHttp(String urlBase, Duration espera) {
        this.urlBase = urlBase;
        SimpleClientHttpRequestFactory fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(espera);
        fabrica.setReadTimeout(espera);
        this.rest = RestClient.builder()
                .baseUrl(urlBase)
                .requestFactory(fabrica)
                .requestInterceptor(ClinicaHttp::reenviarToken)
                .build();
    }

    @Override
    public List<HorarioNutricionista> nutricionistas() {
        List<HorarioNutricionista> lista = pedir(RUTA_NUTRICIONISTAS,
                new ParameterizedTypeReference<List<HorarioNutricionista>>() { });
        lista.forEach(ClinicaHttp::exigirHorario);
        return lista;
    }

    @Override
    public List<ServicioClinica> servicios() {
        List<ServicioClinica> lista = pedir(RUTA_SERVICIOS, new ParameterizedTypeReference<List<ServicioClinica>>() { });
        lista.forEach(ClinicaHttp::exigirServicio);
        return lista;
    }

    private <T> List<T> pedir(String ruta, ParameterizedTypeReference<List<T>> tipo) {
        try {
            List<T> lista = rest.get().uri(ruta).accept(MediaType.APPLICATION_JSON).retrieve().body(tipo);
            if (lista == null) throw fallo(ruta + " respondió sin cuerpo", false, null);
            return lista;
        } catch (HttpStatusCodeException e) {
            int status = e.getStatusCode().value();
            boolean respaldo = status == 404 || e.getStatusCode().is5xxServerError();
            String extra = status == 404 ? " (el endpoint aún no existe en ms-clinica)" : "";
            throw fallo(ruta + " respondió " + status + extra, respaldo, e);
        } catch (ResourceAccessException e) {
            throw fallo("sin respuesta de " + urlBase + ruta + ": " + e.getMessage(), true, e);
        } catch (RestClientException e) {
            throw fallo(ruta + " no entregó la lista esperada: " + e.getMessage(), false, e);
        }
    }

    // ------------------------------------------------------------------ revisión del contrato

    private static void exigirHorario(HorarioNutricionista n) {
        if (n == null || vacio(n.id())) throw contrato("un nutricionista viene sin id");
        if (n.dias() == null || n.horaInicio() == null || n.horaFin() == null) {
            throw contrato(n.id() + " viene sin dias, horaInicio u horaFin");
        }
        if (n.dias().stream().anyMatch(d -> d == null || d < 0 || d > 6)) {
            throw contrato(n.id() + " tiene días fuera de 0-6 (0 = domingo, como en EP2): " + n.dias());
        }
        if (!n.horaInicio().isBefore(n.horaFin())) {
            throw contrato(n.id() + " tiene horaInicio después de horaFin");
        }
    }

    private static void exigirServicio(ServicioClinica s) {
        if (s == null || vacio(s.codigo())) throw contrato("un servicio viene sin codigo");
        if (vacio(s.modalidad()) || s.precio() == null || s.precio() <= 0) {
            throw contrato(s.codigo() + " viene sin modalidad o sin un precio positivo");
        }
        if (s.duracionMin() != null && s.duracionMin() <= 0) {
            throw contrato(s.codigo() + " tiene una duración no positiva");
        }
    }

    private static boolean vacio(String texto) {
        return texto == null || texto.isBlank();
    }

    private static ClinicaNoDisponibleException contrato(String detalle) {
        return fallo("el JSON no calza con el contrato: " + detalle, false, null);
    }

    private static ClinicaNoDisponibleException fallo(String detalle, boolean permiteRespaldo, Throwable causa) {
        log.warn("ms-clinica: {}", detalle);
        return new ClinicaNoDisponibleException(detalle, permiteRespaldo, causa);
    }

    /**
     * Hoy el catálogo es público (contrato §3), pero si el equipo decide exigir token (Forma D,
     * pendiente 1 del roadmap), ms-citas reenvía el mismo token del usuario y nada se rompe.
     */
    static ClientHttpResponse reenviarToken(HttpRequest peticion, byte[] cuerpo, ClientHttpRequestExecution ejecucion)
            throws IOException {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes atributos) {
            String token = atributos.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
            if (token != null) peticion.getHeaders().set(HttpHeaders.AUTHORIZATION, token);
        }
        return ejecucion.execute(peticion, cuerpo);
    }
}
