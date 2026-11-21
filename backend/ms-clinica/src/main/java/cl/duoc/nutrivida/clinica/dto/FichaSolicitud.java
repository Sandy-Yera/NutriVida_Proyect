package cl.duoc.nutrivida.clinica.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Cuerpo de POST /api/pacientes. id es el del paciente en ms-usuarios. nutricionistaId es
 * opcional: si viene, debe ser el del token (nadie crea fichas a nombre de otro).
 */
public record FichaSolicitud(
        @Schema(example = "U102") String id,
        @Schema(example = "NUT003") String nutricionistaId,
        @Schema(example = "VEGETARIANA", allowableValues = {"PERDIDA_PESO", "METABOLICO", "DEPORTIVA", "VEGETARIANA", "INFANTIL"}) String objetivo,
        @Schema(example = "Vegana hace 2 años. Sin patologías informadas.") String antecedentes) {
}
