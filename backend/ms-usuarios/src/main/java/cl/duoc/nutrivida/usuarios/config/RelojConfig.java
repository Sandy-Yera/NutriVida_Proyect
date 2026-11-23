package cl.duoc.nutrivida.usuarios.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Hora de la clínica (America/Santiago). Las pruebas pueden reemplazarlo por un reloj fijo. */
@Configuration
public class RelojConfig {

    @Bean
    public Clock reloj() {
        return Clock.system(ZoneId.of("America/Santiago"));
    }
}
