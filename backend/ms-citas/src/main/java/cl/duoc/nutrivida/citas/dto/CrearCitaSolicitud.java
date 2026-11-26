package cl.duoc.nutrivida.citas.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Cuerpo de POST /api/citas: la reserva y la tarjeta en una sola petición (decisión 6: pago y
 * cita en una transacción). El paciente sale del token, no del cuerpo: nadie puede agendar a
 * nombre de otro. @Valid solo exige que los datos vengan; las reglas con los mensajes de EP2
 * (motivo, 60 días, Luhn, vencimiento) las aplica el service con ReglasCita y ReglasPago.
 */
@Schema(description = "Reserva más tarjeta. Tarjeta de prueba rechazada: 4000 0000 0000 0002")
public record CrearCitaSolicitud(
        @NotBlank(message = "Elige un servicio.") @Schema(example = "CN002") String servicioCodigo,
        @NotBlank(message = "Elige un nutricionista.") @Schema(example = "NUT001") String nutricionistaId,
        @NotNull(message = "Elige una fecha.") @Schema(example = "2026-11-20") LocalDate fecha,
        @NotNull(message = "Elige una hora.") @JsonFormat(pattern = "HH:mm")
        @Schema(type = "string", example = "10:00") LocalTime hora,
        @Schema(example = "Control mensual de peso") String motivo,
        @NotNull(message = "Ingresa los datos de la tarjeta.") @Valid Tarjeta tarjeta) {
}
