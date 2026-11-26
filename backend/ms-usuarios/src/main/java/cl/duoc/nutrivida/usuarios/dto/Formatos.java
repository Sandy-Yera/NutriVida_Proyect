package cl.duoc.nutrivida.usuarios.dto;

/** Expresiones y mensajes de validaciones.js de EP2, para que el backend responda igual. */
public final class Formatos {

    public static final String SOLO_LETRAS = "^[\\p{L}\\s'.-]+$";
    public static final String CORREO = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$";
    /** +56 9 y 8 dígitos, con o sin espacios. */
    public static final String TELEFONO = "^\\+56\\s*9(\\s*\\d){8}\\s*$";
    /** Mínimo 8, con una mayúscula y un número. */
    public static final String CLAVE = "^(?=.*[A-ZÁÉÍÓÚÑ])(?=.*\\d).{8,}$";
    public static final String ROL = "ADMIN|SECRETARIA|NUTRICIONISTA|PACIENTE";

    public static final String MSJ_CORREO = "El correo no es válido: usa el formato nombre@dominio.cl.";
    public static final String MSJ_TELEFONO = "El teléfono debe ser un celular chileno: +56 9 y 8 dígitos.";
    public static final String MSJ_CLAVE = "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.";

    private Formatos() { }
}
