package cl.duoc.nutrivida.clinica.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

/**
 * Cuerpo de POST y PATCH /api/servicios. Los números llegan como BigDecimal para poder decir
 * "el precio va en pesos, sin decimales" en vez de truncarlos. Las reglas y los mensajes son los
 * de validarServicio de EP2 (ReglasClinica). En el PATCH, lo que viene null no cambia.
 */
@Schema(description = "Servicio del catálogo. duracionMin vacío en los planes; cupoMax solo en talleres.")
public record ServicioSolicitud(
        @Schema(example = "CN006") String codigo,
        @Schema(example = "CONSULTA", allowableValues = {"CONSULTA", "PLAN", "EVALUACION", "TALLER"}) String tipo,
        @Schema(example = "Consulta de nutrición geriátrica") String nombre,
        @Schema(example = "40") BigDecimal duracionMin,
        @Schema(example = "Presencial", allowableValues = {"Presencial", "Online (video)", "Presencial (grupo)"}) String modalidad,
        @Schema(example = "30000") BigDecimal precio,
        @Schema(example = "Evaluación y plan adaptado a personas mayores de 65 años.") String descripcion,
        @Schema(example = "false") Boolean destacado,
        @Schema(example = "null") BigDecimal cupoMax,
        @Schema(example = "true") Boolean activo) {
}
