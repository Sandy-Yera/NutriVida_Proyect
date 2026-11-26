package cl.duoc.nutrivida.citas.dto;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Las dos preguntas que ms-citas le hace a un servicio de ms-clinica: ¿es presencial? ¿está activo? */
class ServicioClinicaTest {

    static ServicioClinica servicio(String modalidad, Boolean activo) {
        return new ServicioClinica("X", "CONSULTA", "X", 30, modalidad, 1000, activo);
    }

    @Test
    @DisplayName("presencial: \"Presencial\" y \"Presencial (grupo)\" sí; online o sin modalidad, no")
    void presencial() {
        assertThat(servicio("Presencial", true).esPresencial()).isTrue();
        assertThat(servicio("Presencial (grupo)", true).esPresencial()).isTrue();
        assertThat(servicio("Online (video)", true).esPresencial()).isFalse();
        assertThat(servicio(null, true).esPresencial()).isFalse();
    }

    @Test
    @DisplayName("activo: true o ausente cuenta como activo; solo false lo desactiva")
    void activo() {
        assertThat(servicio("Presencial", true).estaActivo()).isTrue();
        assertThat(servicio("Presencial", null).estaActivo()).isTrue();
        assertThat(servicio("Presencial", false).estaActivo()).isFalse();
    }
}
