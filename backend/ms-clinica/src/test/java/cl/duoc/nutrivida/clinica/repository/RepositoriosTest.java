package cl.duoc.nutrivida.clinica.repository;

import static org.assertj.core.api.Assertions.assertThat;

import cl.duoc.nutrivida.clinica.model.Nutricionista;
import java.time.LocalTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/** C-30: el modelo calza con las semillas de EP2 (data.sql, las mismas de 03_clinica.sql). */
@SpringBootTest
@Transactional
class RepositoriosTest {

    @Autowired ServicioRepository servicios;
    @Autowired NutricionistaRepository nutricionistas;
    @Autowired FichaRepository fichas;
    @Autowired MedicionRepository mediciones;
    @Autowired PlanAlimentarioRepository planes;
    @Autowired ContadorRepository contadores;

    @Test
    @DisplayName("Semillas: 18 servicios, 4 nutricionistas, 2 fichas, 7 mediciones")
    void semillas() {
        assertThat(servicios.count()).isEqualTo(18);
        assertThat(nutricionistas.count()).isEqualTo(4);
        assertThat(fichas.count()).isEqualTo(2);
        assertThat(mediciones.count()).isEqualTo(7);
    }

    @Test
    @DisplayName("Jornada de NUT001: lunes, miércoles y viernes de 09:00 a 17:00")
    void jornada() {
        Nutricionista n = nutricionistas.findById("NUT001").orElseThrow();
        assertThat(n.getDias()).containsExactlyInAnyOrder(1, 3, 5);
        assertThat(n.getHoraInicio()).isEqualTo(LocalTime.of(9, 0));
        assertThat(n.getHoraFin()).isEqualTo(LocalTime.of(17, 0));
        assertThat(n.getUsuarioId()).isEqualTo("U010");
    }

    @Test
    @DisplayName("Plan vigente de U100: PA001; mediciones en orden de fecha")
    void vigenteYOrden() {
        assertThat(planes.findFirstByPacienteIdOrderByVigenteDesdeDescIdDesc("U100")).get()
                .extracting("id").isEqualTo("PA001");
        assertThat(mediciones.findByPacienteIdOrderByFechaAscIdAsc("U100"))
                .extracting("id").containsExactly("M0001", "M0002", "M0003", "M0004", "M0005");
        assertThat(fichas.findByNutricionistaIdOrderByPacienteIdAsc("NUT002")).extracting("pacienteId").containsExactly("U101");
    }

    @Test
    @DisplayName("Contador: el siguiente id de medición es M0008")
    void contador() {
        assertThat(contadores.bloquear("MEDICION").orElseThrow().siguiente("M", 4)).isEqualTo("M0008");
    }
}
