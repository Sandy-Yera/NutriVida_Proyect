package cl.duoc.nutrivida.citas;

import cl.duoc.nutrivida.citas.service.ReglasCita;
import java.time.Clock;
import java.time.ZonedDateTime;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Apoyo de las pruebas de la API: un reloj fijo, así "hoy", "más de 24 h" y "60 días" no
 * dependen del día en que se corre la prueba. Lunes 16/11/2026 a las 08:00 en Santiago.
 * Los tokens se firman con el JwtService real (vencen según la hora real, no este reloj).
 */
@TestConfiguration
public class ApoyoApi {

    public static final ZonedDateTime AHORA = ZonedDateTime.of(2026, 11, 16, 8, 0, 0, 0, ReglasCita.ZONA);

    @Bean
    @Primary
    Clock relojFijo() {
        return Clock.fixed(AHORA.toInstant(), ReglasCita.ZONA);
    }
}
