package cl.duoc.nutrivida.citas.config;

import cl.duoc.nutrivida.citas.client.ModoCliente;
import cl.duoc.nutrivida.citas.client.UsuariosClient;
import cl.duoc.nutrivida.citas.client.UsuariosConRespaldo;
import cl.duoc.nutrivida.citas.client.UsuariosHttp;
import cl.duoc.nutrivida.citas.client.UsuariosSimulado;
import java.time.Clock;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Elige el cliente de ms-usuarios (R8) con NUTRIVIDA_USUARIOS_URL (en Docker,
 * http://ms-usuarios:8081; vacía = semillas) y NUTRIVIDA_USUARIOS_MODO (auto, http o simulado).
 * También define el reloj de la clínica: los services leen "ahora" de aquí, así las pruebas
 * pueden fijar la fecha.
 */
@Configuration
public class UsuariosConfig {

    private static final Logger log = LoggerFactory.getLogger(UsuariosConfig.class);

    @Bean
    public UsuariosClient usuariosClient(@Value("${nutrivida.usuarios.url:}") String url,
            @Value("${nutrivida.usuarios.modo:auto}") String modo,
            @Value("${nutrivida.usuarios.espera-ms:3000}") long esperaMs) {
        return crear(url, modo, Duration.ofMillis(esperaMs));
    }

    @Bean
    public Clock reloj() {
        return Clock.system(cl.duoc.nutrivida.citas.service.ReglasCita.ZONA);
    }

    static UsuariosClient crear(String url, String modoTexto, Duration espera) {
        ModoCliente modo = ModoCliente.leer(modoTexto, "NUTRIVIDA_USUARIOS_MODO");
        String base = ModoCliente.limpiarUrl(url);
        if (modo == ModoCliente.HTTP && base.isEmpty()) {
            throw new IllegalStateException(
                    "NUTRIVIDA_USUARIOS_MODO=http necesita NUTRIVIDA_USUARIOS_URL (por ejemplo http://ms-usuarios:8081).");
        }
        UsuariosClient cliente;
        String descripcion;
        if (modo == ModoCliente.SIMULADO || base.isEmpty()) {
            cliente = new UsuariosSimulado();
            descripcion = "SIMULADO (semillas de EP2)";
        } else if (modo == ModoCliente.HTTP) {
            cliente = new UsuariosHttp(base, espera);
            descripcion = "HTTP " + base;
        } else {
            cliente = new UsuariosConRespaldo(new UsuariosHttp(base, espera), new UsuariosSimulado());
            descripcion = "AUTO " + base + " (semillas de EP2 si no responde)";
        }
        log.info("ms-usuarios: modo {}", descripcion);
        return cliente;
    }
}
