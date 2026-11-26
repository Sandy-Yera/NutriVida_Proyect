package cl.duoc.nutrivida.usuarios.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** PUT /api/usuarios/{id}/clave: solo el propio usuario, con su clave actual. */
public record CambioClaveSolicitud(
        @Schema(example = "Paciente2026!")
        @NotBlank(message = "Ingresa tu contraseña actual.") String claveActual,
        @Schema(example = "Nueva2026!")
        @NotBlank(message = "Ingresa una contraseña.")
        @Pattern(regexp = Formatos.CLAVE, message = Formatos.MSJ_CLAVE) String claveNueva) {
}
