package cl.duoc.nutrivida.citas.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Cliente REST de ms-usuarios (NUTRIVIDA_USUARIOS_URL, en Docker http://ms-usuarios:8081).
 * Pide GET /api/usuarios/{id} con el mismo token del usuario (la regla "dueño" de ms-usuarios
 * le deja leer su propia cuenta) y mira el campo activo.
 *
 * <ul>
 *   <li>200: activo true → ACTIVA; false → DESACTIVADA.</li>
 *   <li>401 o un 404 del usuario: ms-usuarios no reconoce esa cuenta → DESACTIVADA.</li>
 *   <li>404 de ruta (mensaje "La ruta solicitada no existe.", el del formato común): el endpoint
 *       aún no existe (G-32). Sin conexión, tiempo agotado o 5xx: ms-usuarios no está. En ambos
 *       casos se permite usar las semillas.</li>
 *   <li>Otro código (403…) o un JSON sin "activo": error del contrato, 503 sin semillas.</li>
 * </ul>
 */
public class UsuariosHttp implements UsuariosClient {

    private static final Logger log = LoggerFactory.getLogger(UsuariosHttp.class);
    static final String RUTA_INEXISTENTE = "La ruta solicitada no existe.";

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Cuenta(String id, Boolean activo) { }

    private final String urlBase;
    private final RestClient rest;

    public UsuariosHttp(String urlBase, Duration espera) {
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
    public EstadoCuenta estado(String usuarioId) {
        String ruta = "/api/usuarios/" + usuarioId;
        try {
            Cuenta cuenta = rest.get().uri("/api/usuarios/{id}", usuarioId).accept(MediaType.APPLICATION_JSON)
                    .retrieve().body(Cuenta.class);
            if (cuenta == null || cuenta.activo() == null) {
                throw fallo(ruta + " respondió sin el campo activo", false, null);
            }
            return cuenta.activo() ? EstadoCuenta.ACTIVA : EstadoCuenta.DESACTIVADA;
        } catch (HttpStatusCodeException e) {
            int status = e.getStatusCode().value();
            if (status == 404 && e.getResponseBodyAsString().contains(RUTA_INEXISTENTE)) {
                throw fallo(ruta + " respondió 404 (el endpoint aún no existe en ms-usuarios)", true, e);
            }
            if (status == 401 || status == 404) return EstadoCuenta.DESACTIVADA;
            throw fallo(ruta + " respondió " + status, e.getStatusCode().is5xxServerError(), e);
        } catch (ResourceAccessException e) {
            throw fallo("sin respuesta de " + urlBase + ruta + ": " + e.getMessage(), true, e);
        } catch (RestClientException e) {
            throw fallo(ruta + " no entregó la cuenta esperada: " + e.getMessage(), false, e);
        }
    }

    private static UsuariosNoDisponibleException fallo(String detalle, boolean permiteRespaldo, Throwable causa) {
        log.warn("ms-usuarios: {}", detalle);
        return new UsuariosNoDisponibleException(detalle, permiteRespaldo, causa);
    }
}
