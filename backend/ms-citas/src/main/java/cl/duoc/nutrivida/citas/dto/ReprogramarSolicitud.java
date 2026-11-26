package cl.duoc.nutrivida.citas.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

/** Cuerpo de PATCH /api/citas/{id}/reprogramar (RN-05). */
public record ReprogramarSolicitud(
        @NotNull(message = "Elige una fecha.") @Schema(example = "2026-11-23") LocalDate fecha,
        @NotNull(message = "Elige una hora.") @JsonFormat(pattern = "HH:mm")
        @Schema(type = "string", example = "11:00") LocalTime hora) {
}
