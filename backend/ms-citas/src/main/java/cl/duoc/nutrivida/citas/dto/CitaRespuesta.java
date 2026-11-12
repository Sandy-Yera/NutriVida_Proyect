package cl.duoc.nutrivida.citas.dto;

import cl.duoc.nutrivida.citas.model.Cita;
import cl.duoc.nutrivida.citas.model.EstadoCita;
import cl.duoc.nutrivida.citas.model.HistorialCita;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Una cita como la devuelve la API: los mismos campos que la cita de EP2 (citasSemilla), así el
 * frontend no cambia. La entidad JPA nunca sale por la API (contrato: dto separado del model).
 */
@Schema(description = "Cita con su historial de estados (RN-04)")
public record CitaRespuesta(
        @Schema(example = "C0006") String id,
        @Schema(example = "U100") String pacienteId,
        @Schema(example = "NUT001") String nutricionistaId,
        @Schema(example = "CN002") String servicioCodigo,
        @Schema(example = "2026-11-20") LocalDate fecha,
        @JsonFormat(pattern = "HH:mm") @Schema(type = "string", example = "10:00") LocalTime hora,
        @Schema(example = "30") Integer duracionMin,
        @Schema(example = "Control mensual de peso") String motivo,
        EstadoCita estado,
        @Schema(example = "P0006") String pagoId,
        List<Cambio> historial,
        LocalDate creadaEn) {

    /** Una fila del historial, con los nombres de EP2: de, a, por. */
    public record Cambio(Instant fecha, EstadoCita de, EstadoCita a, String por) {
        static Cambio desde(HistorialCita h) {
            return new Cambio(h.getFecha(), h.getEstadoAnterior(), h.getEstadoNuevo(), h.getUsuarioId());
        }
    }

    public static CitaRespuesta desde(Cita c) {
        return new CitaRespuesta(c.getId(), c.getPacienteId(), c.getNutricionistaId(), c.getServicioCodigo(),
                c.getFecha(), c.getHora(), c.getDuracionMin(), c.getMotivo(), c.getEstado(),
                c.getPago() == null ? null : c.getPago().getId(),
                c.getHistorial().stream().map(Cambio::desde).toList(),
                c.getCreadaEn());
    }
}
