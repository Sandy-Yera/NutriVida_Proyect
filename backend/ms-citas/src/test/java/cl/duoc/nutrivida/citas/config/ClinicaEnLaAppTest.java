package cl.duoc.nutrivida.citas.config;

import static org.assertj.core.api.Assertions.assertThat;

import cl.duoc.nutrivida.citas.client.ClinicaClient;
import cl.duoc.nutrivida.citas.client.ClinicaSimulada;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/** Con application.properties (sin NUTRIVIDA_CLINICA_URL) la app arranca con las semillas. */
@SpringBootTest
class ClinicaEnLaAppTest {

    @Autowired ClinicaClient clinica;

    @Test
    @DisplayName("la app arranca con un ClinicaClient y, sin URL, son las semillas de EP2")
    void bean() {
        assertThat(clinica).isInstanceOf(ClinicaSimulada.class);
    }
}
