package cl.duoc.nutrivida.clinica.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** "Hoy" en la zona de la clínica. Las pruebas lo cambian por un reloj fijo. */
@Configuration
public class RelojConfig {

    @Bean
    public Clock reloj() {
        return Clock.system(ZoneId.of("America/Santiago"));
    }
}
