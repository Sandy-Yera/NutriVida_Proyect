package cl.duoc.nutrivida.usuarios.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** PATCH /api/usuarios/{id}/rol (ADMIN). nutricionistaId solo para NUTRICIONISTA. */
public record RolSolicitud(
        @Schema(example = "NUTRICIONISTA")
        @NotBlank(message = "Selecciona un rol.")
        @Pattern(regexp = Formatos.ROL, message = "El rol no es válido.") String rol,
        @Schema(example = "NUT004") String nutricionistaId) {
}
