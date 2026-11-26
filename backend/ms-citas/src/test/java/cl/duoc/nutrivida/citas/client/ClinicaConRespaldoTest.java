package cl.duoc.nutrivida.citas.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import cl.duoc.nutrivida.citas.dto.HorarioNutricionista;
import cl.duoc.nutrivida.citas.dto.ServicioClinica;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** R6: el modo AUTO usa las semillas solo cuando ms-clinica no está, y vuelve a ms-clinica apenas responde. */
class ClinicaConRespaldoTest {

    static final HorarioNutricionista REAL =
            new HorarioNutricionista("NUT009", List.of(1), LocalTime.of(10, 0), LocalTime.of(12, 0));
    static final ServicioClinica SERVICIO_REAL =
            new ServicioClinica("CN009", "CONSULTA", "Nuevo", 30, "Presencial", 1000, true);

    /** ms-clinica falso: cada catálogo responde o falla según se configure. */
    static class ClinicaFalsa implements ClinicaClient {
        ClinicaNoDisponibleException falloNutricionistas;
        ClinicaNoDisponibleException falloServicios;

        @Override
        public List<HorarioNutricionista> nutricionistas() {
            if (falloNutricionistas != null) throw falloNutricionistas;
            return List.of(REAL);
        }

        @Override
        public List<ServicioClinica> servicios() {
            if (falloServicios != null) throw falloServicios;
            return List.of(SERVICIO_REAL);
        }
    }

    static ClinicaNoDisponibleException caida() {
        return new ClinicaNoDisponibleException("/api/nutricionistas respondió 404", true, null);
    }

    final ClinicaFalsa clinica = new ClinicaFalsa();
    final ClinicaConRespaldo auto = new ClinicaConRespaldo(clinica, new ClinicaSimulada());

    @Test
    @DisplayName("si ms-clinica responde, sus datos mandan (no las semillas)")
    void responde() {
        assertThat(auto.nutricionistas()).containsExactly(REAL);
        assertThat(auto.usandoRespaldo()).isFalse();
    }

    @Test
    @DisplayName("si ms-clinica no está, usa las semillas de EP2, y vuelve a ms-clinica cuando responde")
    void caeYVuelve() {
        clinica.falloNutricionistas = caida();
        assertThat(auto.nutricionista("NUT001")).isPresent();   // semilla de EP2
        assertThat(auto.nutricionista("NUT009")).isEmpty();
        assertThat(auto.usandoRespaldo()).isTrue();

        clinica.falloNutricionistas = null;
        assertThat(auto.nutricionistas()).containsExactly(REAL);
        assertThat(auto.usandoRespaldo()).isFalse();
    }

    @Test
    @DisplayName("un error de contrato (401, JSON distinto) no se esconde: sale como 503")
    void errorDeContrato() {
        clinica.falloNutricionistas = new ClinicaNoDisponibleException("/api/nutricionistas respondió 401", false, null);
        assertThatThrownBy(auto::nutricionistas).isInstanceOf(ClinicaNoDisponibleException.class);
        assertThat(auto.usandoRespaldo()).isFalse();
    }

    @Test
    @DisplayName("cada catálogo va por separado: servicios reales aunque los nutricionistas salgan de las semillas")
    void catalogosIndependientes() {
        clinica.falloNutricionistas = caida();
        assertThat(auto.servicios()).containsExactly(SERVICIO_REAL);
        assertThat(auto.nutricionistas()).hasSize(4);
    }
}
