package cl.duoc.nutrivida.clinica.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** Cuerpo de PATCH /api/servicios/{codigo}/estado. */
public record EstadoSolicitud(@NotNull(message = "Indica si el servicio queda activo.") @Schema(example = "false") Boolean activo) {
}
