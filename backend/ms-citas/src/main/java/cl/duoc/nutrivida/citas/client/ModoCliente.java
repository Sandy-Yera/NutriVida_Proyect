package cl.duoc.nutrivida.citas.client;

import java.util.Locale;

/**
 * Cómo obtiene ms-citas los datos de otro microservicio (NUTRIVIDA_CLINICA_MODO y
 * NUTRIVIDA_USUARIOS_MODO):
 * <ul>
 *   <li>AUTO: el microservicio y, si no responde o aún no tiene el endpoint, las semillas de EP2.</li>
 *   <li>HTTP: solo el microservicio; si no responde, 503.</li>
 *   <li>SIMULADO: solo las semillas de EP2.</li>
 * </ul>
 */
public enum ModoCliente {
    AUTO, HTTP, SIMULADO;

    /** variable: el nombre de la variable de entorno, para que el error diga cuál está mal. */
    public static ModoCliente leer(String texto, String variable) {
        String valor = texto == null || texto.isBlank() ? "auto" : texto.trim();
        try {
            return valueOf(valor.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(variable + "=" + valor + " no es válido: usa auto, http o simulado.", e);
        }
    }

    /** La URL sin espacios ni "/" final; vacía si no hay. */
    public static String limpiarUrl(String url) {
        return url == null ? "" : url.trim().replaceAll("/+$", "");
    }
}
