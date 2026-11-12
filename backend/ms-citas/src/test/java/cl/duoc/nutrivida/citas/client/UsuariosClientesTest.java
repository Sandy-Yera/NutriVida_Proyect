package cl.duoc.nutrivida.citas.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import cl.duoc.nutrivida.citas.client.UsuariosClient.EstadoCuenta;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** R8: los tres clientes de ms-usuarios (http, semillas y auto). */
class UsuariosClientesTest {

    @Nested
    @DisplayName("UsuariosHttp contra un ms-usuarios falso")
    class Http {

        record Respuesta(int status, String cuerpo) { }

        final Map<String, Respuesta> respuestas = new ConcurrentHashMap<>();
        final AtomicReference<String> tokenRecibido = new AtomicReference<>();
        HttpServer servidor;
        UsuariosHttp cliente;

        @BeforeEach
        void levantar() throws IOException {
            servidor = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            servidor.createContext("/", intercambio -> {
                tokenRecibido.set(intercambio.getRequestHeaders().getFirst("Authorization"));
                Respuesta r = respuestas.getOrDefault(intercambio.getRequestURI().getPath(),
                        new Respuesta(404, "{\"status\":404,\"mensaje\":\"La ruta solicitada no existe.\"}"));
                byte[] bytes = r.cuerpo().getBytes(StandardCharsets.UTF_8);
                intercambio.getResponseHeaders().set("Content-Type", "application/json");
                intercambio.sendResponseHeaders(r.status(), bytes.length);
                try (OutputStream salida = intercambio.getResponseBody()) { salida.write(bytes); }
            });
            servidor.start();
            cliente = new UsuariosHttp("http://" + servidor.getAddress().getHostString() + ":"
                    + servidor.getAddress().getPort(), Duration.ofSeconds(2));
        }

        @AfterEach
        void detener() {
            servidor.stop(0);
            RequestContextHolder.resetRequestAttributes();
        }

        @Test
        @DisplayName("200 con activo true o false, reenviando el token del usuario")
        void leeActivo() {
            MockHttpServletRequest peticion = new MockHttpServletRequest();
            peticion.addHeader("Authorization", "Bearer abc");
            RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(peticion));
            respuestas.put("/api/usuarios/U100", new Respuesta(200, "{\"id\":\"U100\",\"rol\":\"PACIENTE\",\"activo\":true}"));
            respuestas.put("/api/usuarios/U101", new Respuesta(200, "{\"id\":\"U101\",\"activo\":false}"));
            assertThat(cliente.estado("U100")).isEqualTo(EstadoCuenta.ACTIVA);
            assertThat(tokenRecibido.get()).isEqualTo("Bearer abc");
            assertThat(cliente.estado("U101")).isEqualTo(EstadoCuenta.DESACTIVADA);
        }

        @Test
        @DisplayName("401 o 404 del usuario: ms-usuarios no reconoce la cuenta, queda desactivada")
        void noReconoce() {
            respuestas.put("/api/usuarios/U100", new Respuesta(401, "{\"mensaje\":\"Tu cuenta está desactivada.\"}"));
            respuestas.put("/api/usuarios/U999", new Respuesta(404, "{\"mensaje\":\"El usuario U999 no existe.\"}"));
            assertThat(cliente.estado("U100")).isEqualTo(EstadoCuenta.DESACTIVADA);
            assertThat(cliente.estado("U999")).isEqualTo(EstadoCuenta.DESACTIVADA);
        }

        @Test
        @DisplayName("404 de ruta (endpoint aún no hecho) y 5xx permiten usar las semillas")
        void permitenRespaldo() {
            respuestas.put("/api/usuarios/U101", new Respuesta(502, "{}"));
            var sinRuta = catchThrowableOfType(UsuariosNoDisponibleException.class, () -> cliente.estado("U100"));
            var caido = catchThrowableOfType(UsuariosNoDisponibleException.class, () -> cliente.estado("U101"));
            assertThat(sinRuta.permiteRespaldo()).isTrue();
            assertThat(caido.permiteRespaldo()).isTrue();
            assertThat(caido.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        }

        @Test
        @DisplayName("403 o un JSON sin 'activo' son errores del contrato: 503 sin semillas")
        void errorDeContrato() {
            respuestas.put("/api/usuarios/U100", new Respuesta(403, "{}"));
            respuestas.put("/api/usuarios/U101", new Respuesta(200, "{\"id\":\"U101\"}"));
            assertThat(catchThrowableOfType(UsuariosNoDisponibleException.class, () -> cliente.estado("U100"))
                    .permiteRespaldo()).isFalse();
            assertThat(catchThrowableOfType(UsuariosNoDisponibleException.class, () -> cliente.estado("U101"))
                    .permiteRespaldo()).isFalse();
        }

        @Test
        @DisplayName("sin conexión: permite usar las semillas")
        void sinConexion() {
            servidor.stop(0);
            assertThat(catchThrowableOfType(UsuariosNoDisponibleException.class, () -> cliente.estado("U100"))
                    .permiteRespaldo()).isTrue();
        }
    }

    @Test
    @DisplayName("semillas: las 9 cuentas de EP2 activas; una que no está queda desconocida")
    void simulado() {
        UsuariosSimulado semillas = new UsuariosSimulado();
        for (String id : new String[] {"U001", "U002", "U010", "U011", "U012", "U013", "U100", "U101", "U102"}) {
            assertThat(semillas.estado(id)).as(id).isEqualTo(EstadoCuenta.ACTIVA);
        }
        assertThat(semillas.estado("U555")).isEqualTo(EstadoCuenta.DESCONOCIDA);
        assertThat(semillas.estado(null)).isEqualTo(EstadoCuenta.DESCONOCIDA);
    }

    @Test
    @DisplayName("auto: usa las semillas solo si ms-usuarios no está, y vuelve cuando responde")
    void conRespaldo() {
        UsuariosClient http = mock(UsuariosClient.class);
        UsuariosConRespaldo auto = new UsuariosConRespaldo(http, new UsuariosSimulado());
        given(http.estado("U100"))
                .willThrow(new UsuariosNoDisponibleException("caído", true, null))
                .willReturn(EstadoCuenta.DESACTIVADA);

        assertThat(auto.estado("U100")).isEqualTo(EstadoCuenta.ACTIVA);
        assertThat(auto.usandoRespaldo()).isTrue();
        assertThat(auto.estado("U100")).isEqualTo(EstadoCuenta.DESACTIVADA);
        assertThat(auto.usandoRespaldo()).isFalse();
    }

    @Test
    @DisplayName("auto: un error del contrato no se esconde con las semillas")
    void contratoNoSeEsconde() {
        UsuariosClient http = mock(UsuariosClient.class);
        given(http.estado("U100")).willThrow(new UsuariosNoDisponibleException("403", false, null));
        assertThatThrownBy(() -> new UsuariosConRespaldo(http, new UsuariosSimulado()).estado("U100"))
                .isInstanceOf(UsuariosNoDisponibleException.class);
    }
}
