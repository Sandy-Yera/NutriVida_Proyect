package cl.duoc.nutrivida.citas.dto;

import cl.duoc.nutrivida.citas.model.EstadoCita;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** Cuerpo de PATCH /api/citas/{id}/estado. */
public record CambioEstadoSolicitud(
        @NotNull(message = "Indica el nuevo estado.") @Schema(example = "CONFIRMADA") EstadoCita estado) {
}
