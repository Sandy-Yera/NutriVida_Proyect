package cl.duoc.nutrivida.clinica;

import cl.duoc.nutrivida.clinica.security.JwtService;
import cl.duoc.nutrivida.clinica.security.UsuarioAutenticado;
import java.time.Clock;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Apoyo de las pruebas de la API: reloj fijo (lunes 16/11/2026 a las 08:00 en Santiago) y
 * tokens firmados con el JwtService real, con los usuarios de las semillas de EP2.
 */
@TestConfiguration
public class ApoyoApi {

    public static final ZonedDateTime AHORA = ZonedDateTime.of(2026, 11, 16, 8, 0, 0, 0, ZoneId.of("America/Santiago"));

    @Bean
    @Primary
    Clock relojFijo() {
        return Clock.fixed(AHORA.toInstant(), AHORA.getZone());
    }

    public static String token(JwtService jwt, String id, String rol, String nutricionistaId) {
        return "Bearer " + jwt.generar(new UsuarioAutenticado(id, rol, id, nutricionistaId));
    }

    public static String admin(JwtService jwt) { return token(jwt, "U001", "ADMIN", null); }
    public static String secretaria(JwtService jwt) { return token(jwt, "U002", "SECRETARIA", null); }
    public static String paciente(JwtService jwt, String id) { return token(jwt, id, "PACIENTE", null); }
    public static String nutricionista(JwtService jwt, String id, String nutId) { return token(jwt, id, "NUTRICIONISTA", nutId); }
}
