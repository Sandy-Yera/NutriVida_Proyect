package cl.duoc.nutrivida.citas.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import cl.duoc.nutrivida.citas.model.Cita;
import cl.duoc.nutrivida.citas.model.Contador;
import cl.duoc.nutrivida.citas.model.EstadoCita;
import cl.duoc.nutrivida.citas.model.EstadoPago;
import cl.duoc.nutrivida.citas.model.Pago;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

/**
 * R3: el modelo de ms-citas sobre H2 (perfil por defecto). Prueba lo que la base debe garantizar
 * aunque el código fallara: un pago respalda una sola cita, el historial se borra con la cita
 * pero el pago no, y el candado de agenda se puede tomar más de una vez sin error.
 * Que las tablas de MySQL calcen con las entidades lo comprueba scripts\verificar.ps1 (validate).
 */
@SpringBootTest
@Transactional
class CitaRepositoryTest {

    private static final LocalDate DIA = LocalDate.of(2026, 11, 20);

    @Autowired CitaRepository citas;
    @Autowired PagoRepository pagos;
    @Autowired AgendaDiaRepository agenda;
    @Autowired ContadorRepository contadores;
    @Autowired EntityManager em;

    private Pago pago(String id) {
        return pagos.save(new Pago(id, "U100", 25000, "4242", EstadoPago.APROBADO, null, DIA));
    }

    private Cita cita(String id, Pago pago, String hora, EstadoCita estado) {
        return new Cita(id, "U100", "NUT001", "CN002", DIA, LocalTime.parse(hora), 30,
                "Control mensual de peso", estado, pago, DIA);
    }

    @Test
    @DisplayName("guarda una cita con su pago y la encuentra por el pago")
    void guardaYLee() {
        citas.saveAndFlush(cita("C0901", pago("P0901"), "10:00", EstadoCita.PENDIENTE));
        em.clear();

        Cita leida = citas.findByPago_Id("P0901").orElseThrow();
        assertThat(leida.getId()).isEqualTo("C0901");
        assertThat(leida.getHora()).isEqualTo(LocalTime.of(10, 0));
        assertThat(leida.getPago().getUltimos4()).isEqualTo("4242");
    }

    @Test
    @DisplayName("RN-35: la base rechaza una segunda cita con el mismo pago")
    void pagoDobleChocaConUnique() {
        Pago pago = pago("P0902");
        citas.saveAndFlush(cita("C0902", pago, "10:00", EstadoCita.PENDIENTE));

        assertThatThrownBy(() -> citas.saveAndFlush(cita("C0903", pago, "11:00", EstadoCita.PENDIENTE)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("RN-04: el historial guarda de, a y por, en orden")
    void historialEnOrden() {
        Cita cita = cita("C0904", pago("P0904"), "10:00", EstadoCita.PENDIENTE);
        cita.registrarCambio(EstadoCita.CONFIRMADA, "U050", Instant.parse("2026-11-18T12:00:00Z"));
        cita.registrarCambio(EstadoCita.ATENDIDA, "U010", Instant.parse("2026-11-20T13:30:00Z"));
        citas.saveAndFlush(cita);
        em.clear();

        Cita leida = citas.findById("C0904").orElseThrow();
        assertThat(leida.getEstado()).isEqualTo(EstadoCita.ATENDIDA);
        assertThat(leida.getHistorial())
                .extracting(h -> h.getEstadoAnterior() + ">" + h.getEstadoNuevo() + ":" + h.getUsuarioId())
                .containsExactly("PENDIENTE>CONFIRMADA:U050", "CONFIRMADA>ATENDIDA:U010");
    }

    @Test
    @DisplayName("§6.1: borrar la cita borra su historial, pero el pago queda")
    void borrarCitaConservaPago() {
        Cita cita = cita("C0905", pago("P0905"), "10:00", EstadoCita.PENDIENTE);
        cita.registrarCambio(EstadoCita.CANCELADA, "U100", Instant.parse("2026-11-18T12:00:00Z"));
        citas.saveAndFlush(cita);

        citas.delete(cita);
        citas.flush();
        em.clear();

        assertThat(citas.findById("C0905")).isEmpty();
        assertThat(pagos.findById("P0905")).isPresent();
        Number restantes = (Number) em.createNativeQuery(
                "select count(*) from historial_cita where cita_id = 'C0905'").getSingleResult();
        assertThat(restantes.intValue()).isZero();
    }

    @Test
    @DisplayName("RN-10: solo las citas pendientes o confirmadas cuentan para los choques")
    void choquesSoloConLasQueOcupan() {
        citas.save(cita("C0906", pago("P0906"), "09:00", EstadoCita.PENDIENTE));
        citas.save(cita("C0907", pago("P0907"), "10:00", EstadoCita.CANCELADA));
        citas.saveAndFlush(cita("C0908", pago("P0908"), "11:00", EstadoCita.CONFIRMADA));

        var ocupan = EnumSet.of(EstadoCita.PENDIENTE, EstadoCita.CONFIRMADA);
        assertThat(citas.findByNutricionistaIdAndFechaAndEstadoIn("NUT001", DIA, ocupan))
                .extracting(Cita::getId)
                .containsExactlyInAnyOrder("C0906", "C0908");
    }

    @Test
    @DisplayName("buscar: los filtros vacíos no restringen y el resultado sale por fecha y hora")
    void buscarConFiltrosOpcionales() {
        citas.save(cita("C0910", pago("P0910"), "11:00", EstadoCita.PENDIENTE));
        citas.saveAndFlush(cita("C0909", pago("P0909"), "09:00", EstadoCita.CONFIRMADA));

        assertThat(citas.buscar(null, "NUT001", null, DIA, DIA)).extracting(Cita::getId)
                .containsExactly("C0909", "C0910");
        assertThat(citas.buscar(null, null, EstadoCita.CONFIRMADA, null, null)).extracting(Cita::getId)
                .containsExactly("C0909");
    }

    @Test
    @DisplayName("§5: el candado de agenda se crea la primera vez y se reutiliza después")
    void candadoDeAgenda() {
        agenda.bloquear("NUT001", DIA);
        agenda.bloquear("NUT001", DIA);
        agenda.bloquear("NUT002", DIA);

        assertThat(agenda.count()).isEqualTo(2);
    }

    @Test
    @DisplayName("el contador entrega correlativos seguidos")
    void contadorCorrelativo() {
        contadores.saveAndFlush(new Contador(Contador.CITA, 5));

        assertThat(contadores.bloquear(Contador.CITA).orElseThrow().siguiente()).isEqualTo(6);
        assertThat(contadores.bloquear(Contador.CITA).orElseThrow().siguiente()).isEqualTo(7);
    }
}
