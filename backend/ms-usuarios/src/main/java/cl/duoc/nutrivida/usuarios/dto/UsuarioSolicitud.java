package cl.duoc.nutrivida.usuarios.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** POST /api/usuarios (ADMIN). Mismas reglas que validarUsuario de EP2. */
public record UsuarioSolicitud(
        @Schema(example = "Ignacio")
        @NotBlank(message = "El nombre es obligatorio.")
        @Size(min = 2, max = 50, message = "El nombre debe tener entre 2 y 50 caracteres.")
        @Pattern(regexp = Formatos.SOLO_LETRAS, message = "El nombre solo puede tener letras.") String nombre,
        @Schema(example = "Vera")
        @NotBlank(message = "El apellido es obligatorio.")
        @Size(min = 2, max = 50, message = "El apellido debe tener entre 2 y 50 caracteres.")
        @Pattern(regexp = Formatos.SOLO_LETRAS, message = "El apellido solo puede tener letras.") String apellido,
        @Schema(example = "11.111.111-1")
        @NotBlank(message = "Ingresa el RUT.") String rut,
        @Schema(example = "ivera@nutrivida.cl")
        @NotBlank(message = "Ingresa el correo.")
        @Size(max = 120, message = Formatos.MSJ_CORREO)
        @Pattern(regexp = Formatos.CORREO, message = Formatos.MSJ_CORREO) String correo,
        @Schema(example = "+56 9 1111 0020")
        @NotBlank(message = "Ingresa el teléfono.")
        @Pattern(regexp = Formatos.TELEFONO, message = Formatos.MSJ_TELEFONO) String telefono,
        @Schema(example = "1995-02-10")
        @Past(message = "La fecha de nacimiento no puede ser futura.") LocalDate fechaNacimiento,
        @Schema(example = "SECRETARIA", allowableValues = {"ADMIN", "SECRETARIA", "NUTRICIONISTA", "PACIENTE"})
        @NotBlank(message = "Selecciona un rol.")
        @Pattern(regexp = Formatos.ROL, message = "El rol no es válido.") String rol,
        @Schema(example = "NUT004", description = "Solo si el rol es NUTRICIONISTA.") String nutricionistaId,
        @Schema(example = "true", description = "Por defecto true.") Boolean activo,
        @Schema(example = "Clave2026!")
        @NotBlank(message = "Ingresa una contraseña.")
        @Pattern(regexp = Formatos.CLAVE, message = Formatos.MSJ_CLAVE) String clave) {
}
