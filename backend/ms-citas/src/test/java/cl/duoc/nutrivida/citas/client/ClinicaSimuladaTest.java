package cl.duoc.nutrivida.citas.client;

import static org.assertj.core.api.Assertions.assertThat;

import cl.duoc.nutrivida.citas.dto.HorarioNutricionista;
import cl.duoc.nutrivida.citas.dto.ServicioClinica;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** R6: las semillas simuladas son las de EP2, así el plan B da los mismos resultados que el frontend local. */
class ClinicaSimuladaTest {

    final ClinicaSimulada clinica = new ClinicaSimulada();

    @Test
    @DisplayName("los 4 nutricionistas con la jornada de EP2 (semillas/nutricionistas.js)")
    void nutricionistas() {
        assertThat(clinica.nutricionistas()).extracting(HorarioNutricionista::id)
                .containsExactly("NUT001", "NUT002", "NUT003", "NUT004");
        assertThat(clinica.nutricionista("NUT003")).hasValue(
                new HorarioNutricionista("NUT003", List.of(1, 2, 3, 4, 5), LocalTime.of(8, 0), LocalTime.of(13, 0)));
    }

    @Test
    @DisplayName("el catálogo de EP2: 18 servicios activos, solo CN004 no presencial y los planes sin duración")
    void servicios() {
        assertThat(clinica.servicios()).hasSize(18).allMatch(ServicioClinica::estaActivo);
        assertThat(clinica.codigosNoPresenciales()).containsExactly("CN004");
        assertThat(clinica.servicios()).filteredOn(s -> s.tipo().equals("PLAN"))
                .hasSize(6).allMatch(s -> s.duracionMin() == null);
    }

    @Test
    @DisplayName("calza con las semillas de 02_citas.sql: CN001 de 50 min a $35.000 y CN002 de 30 min a $25.000")
    void calzaConLasCitasSemilla() {
        assertThat(clinica.servicio("CN001")).get()
                .extracting(ServicioClinica::duracionMin, ServicioClinica::precio).containsExactly(50, 35000);
        assertThat(clinica.servicio("CN002")).get()
                .extracting(ServicioClinica::duracionMin, ServicioClinica::precio).containsExactly(30, 25000);
    }
}
