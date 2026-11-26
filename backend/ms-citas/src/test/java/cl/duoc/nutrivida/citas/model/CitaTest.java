package cl.duoc.nutrivida.citas.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Cita.registrarCambio, sin base de datos: cada cambio de estado deja su fila en el historial (RN-03). */
class CitaTest {

    static Cita pendiente() {
        return new Cita("C0006", "U100", "NUT001", "CN002", LocalDate.of(2026, 10, 16), LocalTime.of(10, 0), 30,
                "Control mensual de peso", EstadoCita.PENDIENTE, null, LocalDate.of(2026, 10, 1));
    }

    @Test
    @DisplayName("registrarCambio cambia el estado y anota quién, cuándo, el estado anterior y el nuevo")
    void anotaElCambio() {
        Cita cita = pendiente();
        Instant cuando = Instant.parse("2026-10-02T13:00:00Z");

        HistorialCita entrada = cita.registrarCambio(EstadoCita.CONFIRMADA, "U020", cuando);

        assertThat(cita.getEstado()).isEqualTo(EstadoCita.CONFIRMADA);
        assertThat(entrada.getCita()).isSameAs(cita);
        assertThat(entrada.getEstadoAnterior()).isEqualTo(EstadoCita.PENDIENTE);
        assertThat(entrada.getEstadoNuevo()).isEqualTo(EstadoCita.CONFIRMADA);
        assertThat(entrada.getUsuarioId()).isEqualTo("U020");
        assertThat(entrada.getFecha()).isEqualTo(cuando);
        assertThat(cita.getHistorial()).containsExactly(entrada);
    }

    @Test
    @DisplayName("dos cambios seguidos encadenan los estados: el anterior del segundo es el nuevo del primero")
    void encadena() {
        Cita cita = pendiente();
        cita.registrarCambio(EstadoCita.CONFIRMADA, "U020", Instant.parse("2026-10-02T13:00:00Z"));
        HistorialCita segunda = cita.registrarCambio(EstadoCita.ATENDIDA, "U010", Instant.parse("2026-10-16T13:30:00Z"));

        assertThat(segunda.getEstadoAnterior()).isEqualTo(EstadoCita.CONFIRMADA);
        assertThat(cita.getHistorial()).extracting(HistorialCita::getEstadoNuevo)
                .containsExactly(EstadoCita.CONFIRMADA, EstadoCita.ATENDIDA);
        assertThat(cita.getEstado()).isEqualTo(EstadoCita.ATENDIDA);
    }
}
