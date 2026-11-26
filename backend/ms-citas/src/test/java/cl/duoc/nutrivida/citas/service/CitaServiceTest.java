package cl.duoc.nutrivida.citas.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import cl.duoc.nutrivida.citas.client.ClinicaClient;
import cl.duoc.nutrivida.citas.client.ClinicaSimulada;
import cl.duoc.nutrivida.citas.dto.CrearCitaSolicitud;
import cl.duoc.nutrivida.citas.dto.Tarjeta;
import cl.duoc.nutrivida.citas.exception.ApiException;
import cl.duoc.nutrivida.citas.exception.PagoRechazadoException;
import cl.duoc.nutrivida.citas.model.Cita;
import cl.duoc.nutrivida.citas.model.Contador;
import cl.duoc.nutrivida.citas.model.EstadoCita;
import cl.duoc.nutrivida.citas.model.EstadoPago;
import cl.duoc.nutrivida.citas.model.Pago;
import cl.duoc.nutrivida.citas.repository.AgendaDiaRepository;
import cl.duoc.nutrivida.citas.repository.CitaRepository;
import cl.duoc.nutrivida.citas.repository.ContadorRepository;
import cl.duoc.nutrivida.citas.repository.PagoRepository;
import cl.duoc.nutrivida.citas.security.UsuarioActual;
import cl.duoc.nutrivida.citas.security.UsuarioAutenticado;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

/**
 * R10: CitaService con Mockito, sin base de datos ni Spring. Los repositorios y el usuario del
 * token son mocks; ms-clinica son las semillas. Así cada prueba aísla una regla del service:
 * transiciones, 24 h, pago rechazado o sin cita, y dueño.
 * Hoy es lunes 16/11/2026 a las 08:00 en Santiago.
 */
@ExtendWith(MockitoExtension.class)
class CitaServiceTest {

    static final Clock RELOJ = Clock.fixed(
            ZonedDateTime.of(2026, 11, 16, 8, 0, 0, 0, ReglasCita.ZONA).toInstant(), ReglasCita.ZONA);
    static final LocalDate MIERCOLES = LocalDate.of(2026, 11, 18);
    static final Tarjeta TARJETA_OK = new Tarjeta("Ana Pérez", "4242 4242 4242 4242", "12/28", "123");

    @Mock CitaRepository citas;
    @Mock PagoRepository pagos;
    @Mock ContadorRepository contadores;
    @Mock AgendaDiaRepository agendas;
    @Mock UsuarioActual usuarioActual;
    ClinicaClient clinica = new ClinicaSimulada();
    CitaService servicio;

    @BeforeEach
    void preparar() {
        servicio = new CitaService(citas, pagos, contadores, agendas, clinica, usuarioActual, RELOJ);
    }

    void comoUsuario(String id, String rol, String nutricionistaId) {
        given(usuarioActual.obtener()).willReturn(new UsuarioAutenticado(id, rol, id, nutricionistaId));
    }

    static Cita cita(String id, String pacienteId, LocalDate fecha, LocalTime hora, EstadoCita estado) {
        Pago pago = new Pago("P" + id.substring(1), pacienteId, 25000, "4242", EstadoPago.APROBADO, null, fecha);
        return new Cita(id, pacienteId, "NUT001", "CN002", fecha, hora, 30, "Control mensual de peso",
                estado, pago, LocalDate.of(2026, 11, 1));
    }

    @Test
    @DisplayName("transición no permitida: 409 con el mensaje de EP2 y la cita queda igual")
    void transicionNoPermitida() {
        Cita atendida = cita("C0001", "U100", MIERCOLES, LocalTime.of(10, 0), EstadoCita.ATENDIDA);
        given(citas.bloquear("C0001")).willReturn(Optional.of(atendida));
        comoUsuario("U002", "SECRETARIA", null);

        ApiException e = catchThrowableOfType(ApiException.class,
                () -> servicio.cambiarEstado("C0001", EstadoCita.CONFIRMADA));

        assertThat(e.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(e.getMessage()).isEqualTo("No se puede pasar una cita atendida a confirmada.");
        assertThat(atendida.getEstado()).isEqualTo(EstadoCita.ATENDIDA);
        assertThat(atendida.getHistorial()).isEmpty();
    }

    @Test
    @DisplayName("RN-06: el paciente no cancela con 24 h o menos; con más, cancela y se reembolsa")
    void reglaDe24Horas() {
        comoUsuario("U100", "PACIENTE", null);
        Cita manana = cita("C0001", "U100", LocalDate.of(2026, 11, 17), LocalTime.of(8, 0), EstadoCita.CONFIRMADA);
        Cita pasado = cita("C0002", "U100", LocalDate.of(2026, 11, 17), LocalTime.of(8, 30), EstadoCita.CONFIRMADA);
        given(citas.bloquear("C0001")).willReturn(Optional.of(manana));
        given(citas.bloquear("C0002")).willReturn(Optional.of(pasado));

        ApiException e = catchThrowableOfType(ApiException.class,
                () -> servicio.cambiarEstado("C0001", EstadoCita.CANCELADA));
        assertThat(e.getMessage()).isEqualTo(ReglasCita.MENSAJE_24H);
        assertThat(manana.getEstado()).isEqualTo(EstadoCita.CONFIRMADA);

        assertThat(servicio.cambiarEstado("C0002", EstadoCita.CANCELADA).estado()).isEqualTo(EstadoCita.CANCELADA);
        assertThat(pasado.getPago().getEstado()).isEqualTo(EstadoPago.REEMBOLSADO);
        assertThat(pasado.getHistorial()).singleElement()
                .satisfies(h -> assertThat(h.getUsuarioId()).isEqualTo("U100"));
    }

    @Test
    @DisplayName("pago: rechazado se guarda sin cita (402); y si la hora está tomada, no se cobra nada")
    void pagoRechazadoYSinCobroDoble() {
        comoUsuario("U100", "PACIENTE", null);
        given(contadores.bloquear(Contador.PAGO)).willReturn(Optional.of(new Contador(Contador.PAGO, 5)));
        given(pagos.save(any(Pago.class))).willAnswer(i -> i.getArgument(0));
        Tarjeta rechazada = new Tarjeta("Ana Pérez", "4000 0000 0000 0002", "12/28", "123");

        PagoRechazadoException e = catchThrowableOfType(PagoRechazadoException.class, () -> servicio.crear(
                new CrearCitaSolicitud("CN002", "NUT001", MIERCOLES, LocalTime.of(10, 0), "Control mensual de peso", rechazada)));

        assertThat(e.getStatus()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
        assertThat(e.getPagoId()).isEqualTo("P0006");
        ArgumentCaptor<Pago> guardado = ArgumentCaptor.forClass(Pago.class);
        verify(pagos).save(guardado.capture());
        assertThat(guardado.getValue().getEstado()).isEqualTo(EstadoPago.RECHAZADO);
        assertThat(guardado.getValue().getUltimos4()).isEqualTo("0002");
        verify(citas, never()).save(any());

        // Otra reserva a la misma hora de una cita existente: 409 antes de cobrar.
        given(citas.findByNutricionistaIdAndFechaAndEstadoIn(eq("NUT001"), eq(MIERCOLES), anyCollection()))
                .willReturn(List.of(cita("C0001", "U101", MIERCOLES, LocalTime.of(10, 0), EstadoCita.PENDIENTE)));
        ApiException tomada = catchThrowableOfType(ApiException.class, () -> servicio.crear(
                new CrearCitaSolicitud("CN002", "NUT001", MIERCOLES, LocalTime.of(10, 0), "Control mensual de peso", TARJETA_OK)));
        assertThat(tomada.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(tomada.getErrores()).containsKey("hora");
        verify(pagos).save(any());   // sigue siendo solo el rechazado
        verify(agendas, times(2)).bloquear("NUT001", MIERCOLES);   // ambas reservas tomaron el candado
    }

    @Test
    @DisplayName("dueño: un paciente no ve ni cancela la cita de otro (403) y nada se escribe")
    void soloElDueno() {
        Cita deOtro = cita("C0001", "U101", MIERCOLES, LocalTime.of(10, 0), EstadoCita.PENDIENTE);
        given(citas.findById("C0001")).willReturn(Optional.of(deOtro));
        given(citas.bloquear("C0001")).willReturn(Optional.of(deOtro));
        comoUsuario("U100", "PACIENTE", null);

        assertThat(catchThrowableOfType(ApiException.class, () -> servicio.obtener("C0001")).getMessage())
                .isEqualTo("Esa cita no es tuya.");
        ApiException e = catchThrowableOfType(ApiException.class,
                () -> servicio.cambiarEstado("C0001", EstadoCita.CANCELADA));
        assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(deOtro.getEstado()).isEqualTo(EstadoCita.PENDIENTE);
        assertThat(deOtro.getPago().getEstado()).isEqualTo(EstadoPago.APROBADO);
        verify(pagos, never()).save(any());
        verify(citas, never()).findByPacienteIdOrderByFechaAscHoraAsc(anyString());
    }
}
