package cl.duoc.nutrivida.citas.config;

import cl.duoc.nutrivida.citas.client.ClinicaClient;
import cl.duoc.nutrivida.citas.client.ClinicaConRespaldo;
import cl.duoc.nutrivida.citas.client.ClinicaHttp;
import cl.duoc.nutrivida.citas.client.ClinicaSimulada;
import cl.duoc.nutrivida.citas.client.ModoCliente;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Elige la implementación de ClinicaClient (R6) con NUTRIVIDA_CLINICA_URL (en Docker,
 * http://ms-clinica:8083; vacía = semillas) y NUTRIVIDA_CLINICA_MODO (auto, http o simulado,
 * ver ModoCliente). Al arrancar deja en el log una línea "ms-clinica: modo …" que
 * scripts/verificar.ps1 revisa.
 */
@Configuration
public class ClinicaConfig {

    private static final Logger log = LoggerFactory.getLogger(ClinicaConfig.class);

    @Bean
    public ClinicaClient clinicaClient(@Value("${nutrivida.clinica.url:}") String url,
            @Value("${nutrivida.clinica.modo:auto}") String modo,
            @Value("${nutrivida.clinica.espera-ms:3000}") long esperaMs) {
        return crear(url, modo, Duration.ofMillis(esperaMs));
    }

    static ClinicaClient crear(String url, String modoTexto, Duration espera) {
        ModoCliente modo = ModoCliente.leer(modoTexto, "NUTRIVIDA_CLINICA_MODO");
        String base = ModoCliente.limpiarUrl(url);
        if (modo == ModoCliente.HTTP && base.isEmpty()) {
            throw new IllegalStateException(
                    "NUTRIVIDA_CLINICA_MODO=http necesita NUTRIVIDA_CLINICA_URL (por ejemplo http://ms-clinica:8083).");
        }
        ClinicaClient cliente;
        String descripcion;
        if (modo == ModoCliente.SIMULADO || base.isEmpty()) {
            cliente = new ClinicaSimulada();
            descripcion = "SIMULADO (semillas de EP2)";
        } else if (modo == ModoCliente.HTTP) {
            cliente = new ClinicaHttp(base, espera);
            descripcion = "HTTP " + base;
        } else {
            cliente = new ClinicaConRespaldo(new ClinicaHttp(base, espera), new ClinicaSimulada());
            descripcion = "AUTO " + base + " (semillas de EP2 si no responde)";
        }
        log.info("ms-clinica: modo {}", descripcion);
        return cliente;
    }
}
