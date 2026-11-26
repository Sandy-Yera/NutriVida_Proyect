package cl.duoc.nutrivida.citas.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import cl.duoc.nutrivida.citas.dto.HorarioNutricionista;
import cl.duoc.nutrivida.citas.dto.ServicioClinica;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * R6: ClinicaHttp contra un ms-clinica falso (un servidor HTTP real del JDK, en un puerto libre).
 * Prueba lo que de verdad viaja por la red: JSON, códigos HTTP, conexión rechazada y tiempo agotado.
 */
class ClinicaHttpTest {

    /** Como lo entregaría ms-clinica: con más campos de los que ms-citas usa. */
    static final String NUTRICIONISTAS = """
            [{"id":"NUT001","usuarioId":"U010","nombre":"Carolina Fuentes M.","especialidad":"Obesidad",
              "dias":[1,3,5],"horaInicio":"09:00","horaFin":"17:00","fotoUrl":null},
             {"id":"NUT002","nombre":"Rodrigo Sepúlveda A.","dias":[2,4,6],"horaInicio":"09:00","horaFin":"14:00"}]
            """;

    static final String SERVICIOS = """
            [{"codigo":"CN001","tipo":"CONSULTA","nombre":"Primera consulta","duracionMin":50,
              "modalidad":"Presencial","precio":35000,"descripcion":"…","destacado":false,"activo":true},
             {"codigo":"CN004","tipo":"CONSULTA","nombre":"Teleconsulta","duracionMin":30,
              "modalidad":"Online (video)","precio":20000,"activo":true},
             {"codigo":"PL001","tipo":"PLAN","nombre":"Plan 1 mes","duracionMin":null,
              "modalidad":"Presencial","precio":65000,"activo":false},
             {"codigo":"TG001","tipo":"TALLER","nombre":"Taller","duracionMin":90,
              "modalidad":"Presencial (grupo)","precio":15000,"cupoMax":10}]
            """;

    record Respuesta(int status, String cuerpo, long demoraMs) {
        Respuesta(int status, String cuerpo) { this(status, cuerpo, 0); }
    }

    final Map<String, Respuesta> respuestas = new ConcurrentHashMap<>();
    final AtomicReference<String> tokenRecibido = new AtomicReference<>();
    HttpServer servidor;
    String url;

    @BeforeEach
    void levantarClinicaFalsa() throws IOException {
        servidor = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        servidor.createContext("/", intercambio -> {
            tokenRecibido.set(intercambio.getRequestHeaders().getFirst("Authorization"));
            Respuesta r = respuestas.getOrDefault(intercambio.getRequestURI().getPath(),
                    new Respuesta(404, "{\"status\":404,\"mensaje\":\"La ruta solicitada no existe.\"}"));
            try {
                if (r.demoraMs() > 0) Thread.sleep(r.demoraMs());
                byte[] bytes = r.cuerpo().getBytes(StandardCharsets.UTF_8);
                intercambio.getResponseHeaders().set("Content-Type", "application/json");
                intercambio.sendResponseHeaders(r.status(), bytes.length);
                try (OutputStream salida = intercambio.getResponseBody()) { salida.write(bytes); }
            } catch (InterruptedException | IOException e) {
                intercambio.close();
            }
        });
        servidor.start();
        url = "http://" + servidor.getAddress().getHostString() + ":" + servidor.getAddress().getPort();
    }

    @AfterEach
    void bajar() {
        servidor.stop(0);
        RequestContextHolder.resetRequestAttributes();
    }

    ClinicaHttp cliente() {
        return new ClinicaHttp(url, Duration.ofSeconds(2));
    }

    ClinicaNoDisponibleException falloAlPedirNutricionistas(ClinicaHttp cliente) {
        return catchThrowableOfType(ClinicaNoDisponibleException.class, cliente::nutricionistas);
    }

    @Test
    @DisplayName("lee el horario de cada nutricionista e ignora los campos que ms-citas no usa")
    void nutricionistas() {
        respuestas.put("/api/nutricionistas", new Respuesta(200, NUTRICIONISTAS));
        ClinicaHttp cliente = cliente();

        assertThat(cliente.nutricionistas()).containsExactly(
                new HorarioNutricionista("NUT001", List.of(1, 3, 5), LocalTime.of(9, 0), LocalTime.of(17, 0)),
                new HorarioNutricionista("NUT002", List.of(2, 4, 6), LocalTime.of(9, 0), LocalTime.of(14, 0)));
        assertThat(cliente.nutricionista("NUT002")).map(HorarioNutricionista::horaFin).hasValue(LocalTime.of(14, 0));
        assertThat(cliente.nutricionista("NUT999")).isEmpty();
    }

    @Test
    @DisplayName("lee el catálogo: duración, precio, modalidad y activo; solo la teleconsulta es no presencial")
    void servicios() {
        respuestas.put("/api/servicios", new Respuesta(200, SERVICIOS));
        ClinicaHttp cliente = cliente();

        assertThat(cliente.servicio("CN001")).hasValue(
                new ServicioClinica("CN001", "CONSULTA", "Primera consulta", 50, "Presencial", 35000, true));
        assertThat(cliente.servicio("PL001")).get().satisfies(plan -> {
            assertThat(plan.duracionMin()).isNull();
            assertThat(plan.estaActivo()).isFalse();
        });
        assertThat(cliente.servicio("TG001")).get().satisfies(taller -> {
            assertThat(taller.esPresencial()).isTrue();   // "Presencial (grupo)"
            assertThat(taller.estaActivo()).isTrue();     // sin "activo" en el JSON
        });
        assertThat(cliente.codigosNoPresenciales()).containsExactly("CN004");
    }

    @Test
    @DisplayName("404 en la lista: el endpoint aún no existe (C-31) y se permite usar las semillas")
    void endpointInexistente() {
        ClinicaNoDisponibleException e = falloAlPedirNutricionistas(cliente());

        assertThat(e.permiteRespaldo()).isTrue();
        assertThat(e.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(e.getMessage()).isEqualTo(ClinicaNoDisponibleException.MENSAJE);
        assertThat(e.getDetalle()).contains("/api/nutricionistas", "404");
    }

    @Test
    @DisplayName("500 de ms-clinica: se permite usar las semillas")
    void errorDelServidor() {
        respuestas.put("/api/nutricionistas", new Respuesta(500, "{}"));
        assertThat(falloAlPedirNutricionistas(cliente()).permiteRespaldo()).isTrue();
    }

    @Test
    @DisplayName("ms-clinica apagado (conexión rechazada): se permite usar las semillas")
    void apagado() {
        ClinicaHttp cliente = cliente();
        servidor.stop(0);
        ClinicaNoDisponibleException e = falloAlPedirNutricionistas(cliente);
        assertThat(e.permiteRespaldo()).isTrue();
        assertThat(e.getDetalle()).startsWith("sin respuesta de " + url);
    }

    @Test
    @DisplayName("ms-clinica colgado: corta a los pocos ms en vez de colgar la reserva")
    void tiempoAgotado() {
        respuestas.put("/api/nutricionistas", new Respuesta(200, NUTRICIONISTAS, 1500));
        long inicio = System.nanoTime();
        ClinicaNoDisponibleException e = falloAlPedirNutricionistas(new ClinicaHttp(url, Duration.ofMillis(300)));
        assertThat(e.permiteRespaldo()).isTrue();
        assertThat(Duration.ofNanos(System.nanoTime() - inicio)).isLessThan(Duration.ofMillis(1400));
    }

    @Test
    @DisplayName("401 de ms-clinica: no es una caída sino un desacuerdo de seguridad; no se esconde con las semillas")
    void sinPermiso() {
        respuestas.put("/api/nutricionistas", new Respuesta(401, "{\"status\":401}"));
        ClinicaNoDisponibleException e = falloAlPedirNutricionistas(cliente());
        assertThat(e.permiteRespaldo()).isFalse();
        assertThat(e.getDetalle()).contains("401");
    }

    @Test
    @DisplayName("JSON que no calza con el contrato: falla con el nombre del dato y sin semillas")
    void contratoRoto() {
        respuestas.put("/api/nutricionistas", new Respuesta(200, "[{\"id\":\"NUT001\",\"horaInicio\":\"09:00\",\"horaFin\":\"17:00\"}]"));
        ClinicaNoDisponibleException sinDias = falloAlPedirNutricionistas(cliente());
        assertThat(sinDias.permiteRespaldo()).isFalse();
        assertThat(sinDias.getDetalle()).contains("NUT001", "dias");

        respuestas.put("/api/nutricionistas", new Respuesta(200,
                "[{\"id\":\"NUT001\",\"dias\":[1,7],\"horaInicio\":\"09:00\",\"horaFin\":\"17:00\"}]"));
        assertThat(falloAlPedirNutricionistas(cliente()).getDetalle()).contains("0-6");

        respuestas.put("/api/nutricionistas", new Respuesta(200, "{\"content\":[]}"));   // paginado, no una lista
        assertThat(falloAlPedirNutricionistas(cliente()).permiteRespaldo()).isFalse();

        respuestas.put("/api/servicios", new Respuesta(200, "[{\"codigo\":\"CN001\",\"modalidad\":\"Presencial\"}]"));
        ClinicaNoDisponibleException sinPrecio =
                catchThrowableOfType(ClinicaNoDisponibleException.class, cliente()::servicios);
        assertThat(sinPrecio.getDetalle()).contains("CN001", "precio");
    }

    @Test
    @DisplayName("reenvía el token del usuario a ms-clinica, por si el catálogo deja de ser público")
    void reenviaToken() {
        respuestas.put("/api/nutricionistas", new Respuesta(200, NUTRICIONISTAS));
        ClinicaHttp cliente = cliente();

        cliente.nutricionistas();
        assertThat(tokenRecibido.get()).isNull();   // fuera de una petición (o sin sesión): sin token

        MockHttpServletRequest peticion = new MockHttpServletRequest();
        peticion.addHeader("Authorization", "Bearer abc.def.ghi");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(peticion));
        cliente.nutricionistas();
        assertThat(tokenRecibido.get()).isEqualTo("Bearer abc.def.ghi");
    }
}
