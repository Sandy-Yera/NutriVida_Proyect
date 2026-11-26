package cl.duoc.nutrivida.citas.exception;

import static org.hamcrest.Matchers.matchesPattern;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doThrow;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import cl.duoc.nutrivida.citas.ApoyoApi;
import cl.duoc.nutrivida.citas.client.ClinicaClient;
import cl.duoc.nutrivida.citas.client.UsuariosClient;
import cl.duoc.nutrivida.citas.client.UsuariosClient.EstadoCuenta;
import cl.duoc.nutrivida.citas.client.UsuariosNoDisponibleException;
import cl.duoc.nutrivida.citas.security.JwtFiltro;
import cl.duoc.nutrivida.citas.security.JwtService;
import cl.duoc.nutrivida.citas.security.UsuarioAutenticado;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.ResultMatcher;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * R4 y R8: cada código del contrato §2.3 sale con el formato común { timestamp, status, error,
 * mensaje, ruta, errores? }, incluidos los 401 y 403 que nacen en los filtros de seguridad,
 * antes de cualquier controlador. ms-usuarios es un mock: así se prueba la cuenta desactivada
 * con un token todavía vigente y el 503 cuando ms-usuarios no puede responder.
 */
@SpringBootTest
@Import(ApoyoApi.class)
class FormatoErrorTest {

    @Autowired WebApplicationContext contexto;
    @Autowired JwtService jwt;
    @Value("${nutrivida.jwt.secreto}") String secreto;

    @MockitoBean UsuariosClient usuarios;
    @MockitoSpyBean ClinicaClient clinica;

    MockMvc mvc;

    @BeforeEach
    void preparar() {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity()).build();
    }

    String token(String id, String rol) {
        return "Bearer " + jwt.generar(new UsuarioAutenticado(id, rol, id, null));
    }

    /** Los cinco campos que siempre trae un error, con el status y la ruta esperados. */
    static ResultMatcher formatoComun(int codigo, String ruta) {
        return todos(
                status().is(codigo),
                jsonPath("$.timestamp").value(matchesPattern("\\d{4}-\\d{2}-\\d{2}T.*Z")),
                jsonPath("$.status").value(codigo),
                jsonPath("$.error").isNotEmpty(),
                jsonPath("$.mensaje").isNotEmpty(),
                jsonPath("$.ruta").value(ruta));
    }

    static ResultMatcher todos(ResultMatcher... comprobaciones) {
        return resultado -> {
            for (ResultMatcher c : comprobaciones) c.match(resultado);
        };
    }

    ResultActions pedir(String token, String ruta) throws Exception {
        var peticion = get(ruta);
        if (token != null) peticion.header("Authorization", token);
        return mvc.perform(peticion);
    }

    // ------------------------------------------------------------------ 400

    @Test
    @DisplayName("400 de @Valid: un mensaje por campo en 'errores'")
    void validacion() throws Exception {
        mvc.perform(post("/api/citas").header("Authorization", token("U100", "PACIENTE"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"Control mensual\"}"))
                .andExpect(formatoComun(400, "/api/citas"))
                .andExpect(jsonPath("$.mensaje").value("Revisa los datos ingresados."))
                .andExpect(jsonPath("$.errores.servicioCodigo").value("Elige un servicio."))
                .andExpect(jsonPath("$.errores.tarjeta").value("Ingresa los datos de la tarjeta."));
    }

    @Test
    @DisplayName("400 por JSON mal formado y por un parámetro con formato inválido, sin 'errores'")
    void jsonYParametro() throws Exception {
        mvc.perform(post("/api/citas").header("Authorization", token("U100", "PACIENTE"))
                        .contentType(MediaType.APPLICATION_JSON).content("{malo"))
                .andExpect(formatoComun(400, "/api/citas"))
                .andExpect(jsonPath("$.mensaje").value("El cuerpo de la petición no es un JSON válido."))
                .andExpect(jsonPath("$.errores").doesNotExist());
        pedir(null, "/api/disponibilidad?nutricionistaId=NUT001&fecha=20-11-2026")
                .andExpect(formatoComun(400, "/api/disponibilidad"))
                .andExpect(jsonPath("$.mensaje").value("Falta un parámetro o tiene un formato inválido."));
    }

    // ------------------------------------------------------------------ 401

    @Test
    @DisplayName("401 sin token, con token vencido y con firma inválida, cada uno con su mensaje")
    void noAutenticado() throws Exception {
        pedir(null, "/api/citas/mias")
                .andExpect(formatoComun(401, "/api/citas/mias"))
                .andExpect(jsonPath("$.mensaje").value("Debes iniciar sesión para continuar."));

        Instant hace9Horas = Instant.now().minusSeconds(9 * 3600);
        String vencido = Jwts.builder().subject("U100").claim("rol", "PACIENTE")
                .issuedAt(Date.from(hace9Horas)).expiration(Date.from(hace9Horas.plusSeconds(8 * 3600)))
                .signWith(Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8))).compact();
        pedir("Bearer " + vencido, "/api/citas/mias")
                .andExpect(formatoComun(401, "/api/citas/mias"))
                .andExpect(jsonPath("$.mensaje").value("Tu sesión expiró. Inicia sesión nuevamente."));

        pedir("Bearer esto.no.es-un-jwt", "/api/citas/mias")
                .andExpect(formatoComun(401, "/api/citas/mias"))
                .andExpect(jsonPath("$.mensaje").value("La sesión no es válida. Inicia sesión nuevamente."));
    }

    @Test
    @DisplayName("R8: un usuario desactivado pierde el acceso aunque su token siga vigente")
    void cuentaDesactivada() throws Exception {
        given(usuarios.estado("U900")).willReturn(EstadoCuenta.DESACTIVADA);
        pedir(token("U900", "PACIENTE"), "/api/citas/mias")
                .andExpect(formatoComun(401, "/api/citas/mias"))
                .andExpect(jsonPath("$.mensaje").value(JwtFiltro.CUENTA_DESACTIVADA));
    }

    @Test
    @DisplayName("R8: una ruta pública sigue abierta aunque la cuenta del token esté desactivada")
    void desactivadaEnRutaPublica() throws Exception {
        given(usuarios.estado("U902")).willReturn(EstadoCuenta.DESACTIVADA);
        pedir(token("U902", "PACIENTE"), "/api/disponibilidad/proximas").andExpect(status().isOk());
    }

    @Test
    @DisplayName("503: ms-usuarios no puede confirmar la cuenta (modo http), con el formato común")
    void msUsuariosNoResponde() throws Exception {
        given(usuarios.estado("U901")).willThrow(new UsuariosNoDisponibleException("caído", false, null));
        pedir(token("U901", "PACIENTE"), "/api/citas/mias")
                .andExpect(formatoComun(503, "/api/citas/mias"))
                .andExpect(jsonPath("$.mensaje").value(UsuariosNoDisponibleException.MENSAJE));
    }

    // ------------------------------------------------------------------ 403, 404, 405

    @Test
    @DisplayName("403 de @PreAuthorize: hay sesión, pero el rol no alcanza")
    void prohibido() throws Exception {
        pedir(token("U100", "PACIENTE"), "/api/citas/estadisticas?desde=2026-11-01&hasta=2026-11-30")
                .andExpect(formatoComun(403, "/api/citas/estadisticas"))
                .andExpect(jsonPath("$.mensaje").value("No tienes permiso para hacer esto."));
    }

    @Test
    @DisplayName("404 de negocio y 404 de una ruta que no existe")
    void noEncontrado() throws Exception {
        pedir(token("U002", "SECRETARIA"), "/api/citas/C4040")
                .andExpect(formatoComun(404, "/api/citas/C4040"))
                .andExpect(jsonPath("$.mensaje").value("La cita C4040 no existe."));
        pedir(token("U002", "SECRETARIA"), "/api/no-existe")
                .andExpect(formatoComun(404, "/api/no-existe"))
                .andExpect(jsonPath("$.mensaje").value("La ruta solicitada no existe."));
    }

    @Test
    @DisplayName("405: método HTTP que la ruta no acepta")
    void metodoNoPermitido() throws Exception {
        mvc.perform(put("/api/citas/mias").header("Authorization", token("U100", "PACIENTE")))
                .andExpect(formatoComun(405, "/api/citas/mias"))
                .andExpect(jsonPath("$.mensaje").value("Ese método HTTP no está disponible en esta ruta."));
    }

    // ------------------------------------------------------------------ 409, 503, 500

    @Test
    @DisplayName("409 de negocio con el campo en 'errores'")
    void conflicto() throws Exception {
        mvc.perform(post("/api/citas").header("Authorization", token("U100", "PACIENTE"))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"servicioCodigo":"CN002","nutricionistaId":"NUT001","fecha":"2026-11-18","hora":"18:00",
                                 "motivo":"Control mensual de peso","tarjeta":{"titular":"Ana Pérez",
                                 "numero":"4242424242424242","vencimiento":"12/28","cvv":"123"}}"""))
                .andExpect(formatoComun(409, "/api/citas"))
                .andExpect(jsonPath("$.errores.hora").exists());
    }

    @Test
    @DisplayName("503 cuando ms-clinica no responde en modo http")
    void msClinicaNoResponde() throws Exception {
        doThrow(new cl.duoc.nutrivida.citas.client.ClinicaNoDisponibleException("caído", false, null))
                .when(clinica).nutricionistas();
        pedir(null, "/api/disponibilidad/proximas")
                .andExpect(formatoComun(503, "/api/disponibilidad/proximas"));
    }

    @Test
    @DisplayName("500: un error inesperado no muestra el detalle técnico")
    void inesperado() throws Exception {
        doThrow(new IllegalStateException("NullPointer en la línea 42")).when(clinica).nutricionista(anyString());
        pedir(null, "/api/disponibilidad?nutricionistaId=NUT001&fecha=2026-11-18")
                .andExpect(formatoComun(500, "/api/disponibilidad"))
                .andExpect(jsonPath("$.mensaje").value("Ocurrió un error inesperado. Intenta nuevamente."));
    }
}
