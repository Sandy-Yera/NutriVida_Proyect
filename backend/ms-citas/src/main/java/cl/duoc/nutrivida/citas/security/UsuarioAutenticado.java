package cl.duoc.nutrivida.citas.security;

/**
 * Quién hace la petición, tal como viene en el JWT (claims sub, rol, nombre, nutricionistaId).
 * Los services lo usan para las reglas de dueño: "esta cita es tuya", "este paciente es tuyo".
 */
public record UsuarioAutenticado(String id, String rol, String nombre, String nutricionistaId) {

    public boolean tieneRol(String... roles) {
        for (String r : roles) {
            if (r.equals(rol)) return true;
        }
        return false;
    }
}
