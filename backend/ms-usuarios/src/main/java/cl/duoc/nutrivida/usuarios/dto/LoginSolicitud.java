package cl.duoc.nutrivida.usuarios.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/** POST /api/auth/login. */
public record LoginSolicitud(
        @Schema(example = "javiera.soto@correo.cl")
        @NotBlank(message = "Ingresa el correo.") String correo,
        @Schema(example = "Paciente2026!")
        @NotBlank(message = "Ingresa la contraseña.") String clave) {
}
