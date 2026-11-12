package cl.duoc.nutrivida.citas.config;

import cl.duoc.nutrivida.citas.client.ClinicaClient;
import cl.duoc.nutrivida.citas.client.ClinicaConRespaldo;
import cl.duoc.nutrivida.citas.client.ClinicaHttp;
import cl.duoc.nutrivida.citas.client.ClinicaSimulada;
import java.time.Duration;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Elige la implementación de ClinicaClient (R6) con dos variables de entorno:
 * <ul>
 *   <li>NUTRIVIDA_CLINICA_URL: dónde está ms-clinica (en Docker, http://ms-clinica:8083).
 *       Vacía: siempre las semillas.</li>
 *   <li>NUTRIVIDA_CLINICA_MODO: auto (por defecto), http o simulado.
 *       <ul>
 *         <li>auto: ms-clinica y, si no responde, las semillas.</li>
 *         <li>http: solo ms-clinica; si no responde, 503. Es el modo del video y de la entrega,
 *             cuando C-31 esté listo.</li>
 *         <li>simulado: siempre las semillas.</li>
 *       </ul>
 *   </li>
 * </ul>
 * Al arrancar deja en el log una línea "ms-clinica: modo …" (scripts/verificar.ps1 la revisa).
 */
@Configuration
public class ClinicaConfig {

    private static final Logger log = LoggerFactory.getLogger(ClinicaConfig.class);

    public enum Modo { AUTO, HTTP, SIMULADO }

    @Bean
    public ClinicaClient clinicaClient(@Value("${nutrivida.clinica.url:}") String url,
            @Value("${nutrivida.clinica.modo:auto}") String modo,
            @Value("${nutrivida.clinica.espera-ms:3000}") long esperaMs) {
        return crear(url, modo, Duration.ofMillis(esperaMs));
    }

    static ClinicaClient crear(String url, String modoTexto, Duration espera) {
        Modo modo = leerModo(modoTexto);
        String base = url == null ? "" : url.trim().replaceAll("/+$", "");
        if (modo == Modo.HTTP && base.isEmpty()) {
            throw new IllegalStateException(
                    "NUTRIVIDA_CLINICA_MODO=http necesita NUTRIVIDA_CLINICA_URL (por ejemplo http://ms-clinica:8083).");
        }
        ClinicaClient cliente;
        String descripcion;
        if (modo == Modo.SIMULADO || base.isEmpty()) {
            cliente = new ClinicaSimulada();
            descripcion = "SIMULADO (semillas de EP2)";
        } else if (modo == Modo.HTTP) {
            cliente = new ClinicaHttp(base, espera);
            descripcion = "HTTP " + base;
        } else {
            cliente = new ClinicaConRespaldo(new ClinicaHttp(base, espera), new ClinicaSimulada());
            descripcion = "AUTO " + base + " (semillas de EP2 si no responde)";
        }
        log.info("ms-clinica: modo {}", descripcion);
        return cliente;
    }

    static Modo leerModo(String texto) {
        String valor = texto == null || texto.isBlank() ? "auto" : texto.trim();
        try {
            return Modo.valueOf(valor.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(
                    "NUTRIVIDA_CLINICA_MODO=" + valor + " no es válido: usa auto, http o simulado.", e);
        }
    }
}
