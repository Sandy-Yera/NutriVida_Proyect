package cl.duoc.nutrivida.clinica.dto;

import cl.duoc.nutrivida.clinica.model.Contacto;
import java.time.LocalDate;

/** Mensaje de contacto con los campos de EP2 (nv_contactos). */
public record ContactoRespuesta(String id, String nombre, String correo, String telefono, String motivo,
        String mensaje, LocalDate fecha) {

    public static ContactoRespuesta de(Contacto c) {
        return new ContactoRespuesta(c.getId(), c.getNombre(), c.getCorreo(), c.getTelefono(), c.getMotivo(),
                c.getMensaje(), c.getFecha());
    }
}
