package cl.duoc.nutrivida.usuarios.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** PATCH /api/usuarios/{id}/estado (ADMIN). */
public record EstadoSolicitud(
        @Schema(example = "false") @NotNull(message = "Indica si la cuenta queda activa.") Boolean activo) {
}
