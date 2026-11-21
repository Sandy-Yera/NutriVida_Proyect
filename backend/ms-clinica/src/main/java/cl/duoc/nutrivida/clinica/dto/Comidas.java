package cl.duoc.nutrivida.clinica.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Las 5 comidas del plan, como en EP2 (COMIDAS_PLAN). */
public record Comidas(
        @Schema(example = "Avena con fruta y yogur natural.") String desayuno,
        @Schema(example = "Una fruta y 10 almendras.") String colacion,
        @Schema(example = "Legumbres con ensalada y arroz integral.") String almuerzo,
        @Schema(example = "Pan integral con palta y té.") String once,
        @Schema(example = "Verduras salteadas con huevo.") String cena) {
}
