package cl.duoc.nutrivida.citas.client;

/**
 * Lo que ms-citas pregunta a ms-usuarios (Gabriel): si la cuenta del token sigue activa.
 * Decisión del equipo (13/11): un usuario desactivado pierde el acceso al instante, aunque su
 * JWT de 8 h siga vigente. El token solo dice quién es; si puede entrar lo dice ms-usuarios.
 *
 * <p>Implementaciones: {@link UsuariosHttp}, {@link UsuariosSimulado} (semillas de EP2) y
 * {@link UsuariosConRespaldo} (modo auto). UsuariosConfig elige con NUTRIVIDA_USUARIOS_MODO.
 */
public interface UsuariosClient {

    enum EstadoCuenta {
        ACTIVA,
        DESACTIVADA,
        /** Solo en las semillas: un usuario que no está en ellas (por ejemplo, uno recién registrado). */
        DESCONOCIDA
    }

    EstadoCuenta estado(String usuarioId);
}
