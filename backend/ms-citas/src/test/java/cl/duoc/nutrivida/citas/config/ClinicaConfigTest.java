package cl.duoc.nutrivida.citas.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import cl.duoc.nutrivida.citas.client.ClinicaConRespaldo;
import cl.duoc.nutrivida.citas.client.ClinicaHttp;
import cl.duoc.nutrivida.citas.client.ClinicaSimulada;
import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** R6: qué cliente de ms-clinica se usa según NUTRIVIDA_CLINICA_URL y NUTRIVIDA_CLINICA_MODO. */
class ClinicaConfigTest {

    static final String URL = "http://ms-clinica:8083";
    static final Duration ESPERA = Duration.ofSeconds(1);

    @Test
    @DisplayName("auto con URL (Docker): ms-clinica con las semillas de respaldo")
    void auto() {
        assertThat(ClinicaConfig.crear(URL, "auto", ESPERA)).isInstanceOf(ClinicaConRespaldo.class);
        assertThat(ClinicaConfig.crear(URL, "", ESPERA)).isInstanceOf(ClinicaConRespaldo.class);
    }

    @Test
    @DisplayName("http con URL: solo ms-clinica; simulado: solo las semillas, aunque haya URL")
    void httpYSimulado() {
        assertThat(ClinicaConfig.crear(URL + "/", "HTTP", ESPERA)).isInstanceOf(ClinicaHttp.class);
        assertThat(ClinicaConfig.crear(URL, "simulado", ESPERA)).isInstanceOf(ClinicaSimulada.class);
    }

    @Test
    @DisplayName("sin URL (IDE, pruebas): las semillas; salvo en modo http, que no arranca y dice por qué")
    void sinUrl() {
        assertThat(ClinicaConfig.crear("", "auto", ESPERA)).isInstanceOf(ClinicaSimulada.class);
        assertThat(ClinicaConfig.crear(null, "auto", ESPERA)).isInstanceOf(ClinicaSimulada.class);
        assertThatThrownBy(() -> ClinicaConfig.crear(" ", "http", ESPERA))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("NUTRIVIDA_CLINICA_URL");
    }

    @Test
    @DisplayName("un modo mal escrito no arranca y nombra los valores válidos")
    void modoInvalido() {
        assertThatThrownBy(() -> ClinicaConfig.crear(URL, "real", ESPERA))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("auto, http o simulado");
    }
}
