package cl.duoc.nutrivida.clinica.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Cuerpo de PUT /api/pacientes/{id}/plan. Con id de un plan del paciente, lo corrige; sin id,
 * crea uno nuevo que queda vigente desde vigenteDesde (o desde hoy). Igual que guardarPlan de EP2.
 */
public record PlanSolicitud(
        @Schema(example = "null") String id,
        @Schema(example = "2026-11-20") LocalDate vigenteDesde,
        @Schema(example = "Pérdida de peso gradual") String objetivo,
        @Schema(example = "1700") BigDecimal kcalDiarias,
        Comidas comidas,
        @Schema(example = "2 litros de agua al día.") String indicaciones) {
}
