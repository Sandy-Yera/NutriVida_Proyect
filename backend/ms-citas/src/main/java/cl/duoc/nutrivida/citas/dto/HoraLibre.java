package cl.duoc.nutrivida.citas.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.LocalTime;

/** Una hora libre de la agenda rápida del Inicio (GET /api/disponibilidad/proximas). */
public record HoraLibre(
        @Schema(example = "NUT003") String nutricionistaId,
        @Schema(example = "2026-11-16") LocalDate fecha,
        @JsonFormat(pattern = "HH:mm") @Schema(type = "string", example = "08:00") LocalTime hora) {
}
