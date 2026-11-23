package cl.duoc.nutrivida.usuarios.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** POST /api/auth/registro (RF-ACC-01). Siempre crea un PACIENTE activo. */
public record RegistroSolicitud(
        @Schema(example = "Camila")
        @NotBlank(message = "El nombre es obligatorio.")
        @Size(min = 2, max = 50, message = "El nombre debe tener entre 2 y 50 caracteres.")
        @Pattern(regexp = Formatos.SOLO_LETRAS, message = "El nombre solo puede tener letras.") String nombre,
        @Schema(example = "Rojas")
        @NotBlank(message = "El apellido es obligatorio.")
        @Size(min = 2, max = 50, message = "El apellido debe tener entre 2 y 50 caracteres.")
        @Pattern(regexp = Formatos.SOLO_LETRAS, message = "El apellido solo puede tener letras.") String apellido,
        @Schema(example = "12.345.678-5", description = "Con o sin puntos y guion; se valida el dígito verificador.")
        @NotBlank(message = "Ingresa el RUT.") String rut,
        @Schema(example = "camila.rojas@correo.cl")
        @NotBlank(message = "Ingresa el correo.")
        @Size(max = 120, message = Formatos.MSJ_CORREO)
        @Pattern(regexp = Formatos.CORREO, message = Formatos.MSJ_CORREO) String correo,
        @Schema(example = "+56 9 5555 1234")
        @NotBlank(message = "Ingresa el teléfono.")
        @Pattern(regexp = Formatos.TELEFONO, message = Formatos.MSJ_TELEFONO) String telefono,
        @Schema(example = "1998-03-21")
        @NotNull(message = "Ingresa la fecha de nacimiento.")
        @Past(message = "La fecha de nacimiento no puede ser futura.") LocalDate fechaNacimiento,
        @Schema(example = "Clave2026!")
        @NotBlank(message = "Ingresa una contraseña.")
        @Pattern(regexp = Formatos.CLAVE, message = Formatos.MSJ_CLAVE) String clave) {
}
