package cl.duoc.nutrivida.citas.security;

import cl.duoc.nutrivida.citas.client.UsuariosClient;
import cl.duoc.nutrivida.citas.client.UsuariosClient.EstadoCuenta;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * R8 · decisión del equipo (13/11): un usuario desactivado pierde el acceso aunque su token siga
 * vigente. JwtFiltro llama a {@link #puedeEntrar} en cada petición con un token válido.
 *
 * <p>La respuesta de ms-usuarios se recuerda 30 s por usuario: así una página que hace cinco
 * peticiones no consulta cinco veces, y una cuenta desactivada pierde el acceso a más tardar
 * 30 s después (contra las 8 h de vigencia del token sin esta revisión).
 */
@Component
public class VerificadorCuenta {

    private record Recuerdo(boolean puede, Instant vence) { }

    private final UsuariosClient usuarios;
    private final Clock reloj;
    private final Duration memoria;
    private final Map<String, Recuerdo> recuerdos = new ConcurrentHashMap<>();

    public VerificadorCuenta(UsuariosClient usuarios, Clock reloj,
            @Value("${nutrivida.usuarios.cache-segundos:30}") long segundos) {
        this.usuarios = usuarios;
        this.reloj = reloj;
        this.memoria = Duration.ofSeconds(segundos);
    }

    /** false si ms-usuarios dice que la cuenta está desactivada (o ya no existe). */
    public boolean puedeEntrar(String usuarioId) {
        Instant ahora = reloj.instant();
        Recuerdo recuerdo = recuerdos.get(usuarioId);
        if (recuerdo != null && ahora.isBefore(recuerdo.vence())) return recuerdo.puede();
        boolean puede = usuarios.estado(usuarioId) != EstadoCuenta.DESACTIVADA;
        recuerdos.put(usuarioId, new Recuerdo(puede, ahora.plus(memoria)));
        return puede;
    }
}
