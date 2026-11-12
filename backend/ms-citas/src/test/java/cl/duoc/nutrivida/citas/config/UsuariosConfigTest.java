package cl.duoc.nutrivida.citas.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import cl.duoc.nutrivida.citas.client.UsuariosConRespaldo;
import cl.duoc.nutrivida.citas.client.UsuariosHttp;
import cl.duoc.nutrivida.citas.client.UsuariosSimulado;
import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** R8: NUTRIVIDA_USUARIOS_URL y NUTRIVIDA_USUARIOS_MODO eligen el cliente, igual que con ms-clinica. */
class UsuariosConfigTest {

    static final Duration ESPERA = Duration.ofSeconds(1);

    @Test
    @DisplayName("sin URL, o en modo simulado, se usan las semillas de EP2")
    void semillas() {
        assertThat(UsuariosConfig.crear("", "auto", ESPERA)).isInstanceOf(UsuariosSimulado.class);
        assertThat(UsuariosConfig.crear("http://ms-usuarios:8081", "simulado", ESPERA)).isInstanceOf(UsuariosSimulado.class);
    }

    @Test
    @DisplayName("con URL: auto = ms-usuarios con respaldo; http = solo ms-usuarios")
    void conUrl() {
        assertThat(UsuariosConfig.crear("http://ms-usuarios:8081/", "AUTO", ESPERA)).isInstanceOf(UsuariosConRespaldo.class);
        assertThat(UsuariosConfig.crear("http://ms-usuarios:8081", " http ", ESPERA)).isInstanceOf(UsuariosHttp.class);
    }

    @Test
    @DisplayName("modo http sin URL, o un modo desconocido, detienen el arranque con un mensaje claro")
    void configuracionInvalida() {
        assertThatThrownBy(() -> UsuariosConfig.crear("", "http", ESPERA))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("NUTRIVIDA_USUARIOS_URL");
        assertThatThrownBy(() -> UsuariosConfig.crear("", "nube", ESPERA))
                .hasMessageContaining("NUTRIVIDA_USUARIOS_MODO");
    }
}
