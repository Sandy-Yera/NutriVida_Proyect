package cl.duoc.nutrivida.usuarios.dto;

import cl.duoc.nutrivida.usuarios.model.Usuario;
import java.time.LocalDate;

/**
 * Una cuenta con los mismos campos de EP2, sin la clave. ms-citas (UsuariosHttp) lee id y activo.
 */
public record UsuarioRespuesta(
        String id,
        String nombre,
        String apellido,
        String rut,
        String correo,
        String telefono,
        LocalDate fechaNacimiento,
        String rol,
        String nutricionistaId,
        boolean activo,
        LocalDate creadoEn) {

    public static UsuarioRespuesta de(Usuario u) {
        return new UsuarioRespuesta(u.getId(), u.getNombre(), u.getApellido(), u.getRut(), u.getCorreo(),
                u.getTelefono(), u.getFechaNacimiento(), u.getRol().name(), u.getNutricionistaId(), u.isActivo(),
                u.getCreadoEn());
    }
}
