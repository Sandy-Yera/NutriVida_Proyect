package cl.duoc.nutrivida.usuarios.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * PATCH /api/usuarios/{id}: solo cambia lo que viene (null = sin cambio). El admin puede todo,
 * salvo su propio rol y estado; los demás, solo nombre, apellido y teléfono de su cuenta.
 */
public record ActualizarUsuarioSolicitud(
        @Schema(example = "Javiera")
        @Size(min = 2, max = 50, message = "El nombre debe tener entre 2 y 50 caracteres.")
        @Pattern(regexp = Formatos.SOLO_LETRAS, message = "El nombre solo puede tener letras.") String nombre,
        @Schema(example = "Soto Muñoz")
        @Size(min = 2, max = 50, message = "El apellido debe tener entre 2 y 50 caracteres.")
        @Pattern(regexp = Formatos.SOLO_LETRAS, message = "El apellido solo puede tener letras.") String apellido,
        String rut,
        @Size(max = 120, message = Formatos.MSJ_CORREO)
        @Pattern(regexp = Formatos.CORREO, message = Formatos.MSJ_CORREO) String correo,
        @Schema(example = "+56 9 2222 0199")
        @Pattern(regexp = Formatos.TELEFONO, message = Formatos.MSJ_TELEFONO) String telefono,
        @Past(message = "La fecha de nacimiento no puede ser futura.") LocalDate fechaNacimiento,
        @Pattern(regexp = Formatos.ROL, message = "El rol no es válido.") String rol,
        String nutricionistaId,
        Boolean activo) {
}
