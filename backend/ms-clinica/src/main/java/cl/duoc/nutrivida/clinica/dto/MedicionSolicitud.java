package cl.duoc.nutrivida.clinica.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Cuerpo de POST /api/pacientes/{id}/mediciones. Rangos y mensajes de validarMedicion (EP2). */
public record MedicionSolicitud(
        @Schema(example = "2026-11-20") LocalDate fecha,
        @Schema(example = "71.8") BigDecimal pesoKg,
        @Schema(example = "170") BigDecimal tallaCm,
        @Schema(example = "83") BigDecimal cinturaCm,
        @Schema(example = "null") BigDecimal caderaCm,
        @Schema(example = "29.1") BigDecimal grasaPct,
        @Schema(example = "Buena adherencia al plan.") String notas) {
}
