package cl.duoc.nutrivida.clinica.controller;

import static org.hamcrest.Matchers.hasKey;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import cl.duoc.nutrivida.clinica.ApoyoApi;
import cl.duoc.nutrivida.clinica.security.JwtService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/**
 * C-33: matriz de acceso de ms-clinica con la seguridad real (estilo SecurityFlowTest de
 * DoggySpa): sin token 401, rol que no corresponde 403 y rol correcto 200/201/204. Cada fila
 * es un endpoint con un rol; el JSON de error siempre trae status, mensaje y ruta.
 */
@SpringBootTest
@Import(ApoyoApi.class)
@Transactional
class SeguridadClinicaTest {

    static final String SERVICIO = """
            {"codigo":"EV005","tipo":"EVALUACION","nombre":"Test de hidratación","duracionMin":15,
             "modalidad":"Presencial","precio":9000,"descripcion":"Medición de agua corporal y consejos."}""";
    static final String FICHA = "{\"id\":\"U102\",\"objetivo\":\"VEGETARIANA\",\"antecedentes\":\"Sin antecedentes\"}";
    static final String MEDICION = "{\"fecha\":\"2026-11-16\",\"pesoKg\":72,\"tallaCm\":170}";
    static final String PLAN = """
            {"objetivo":"Mantención","kcalDiarias":1900,
             "comidas":{"desayuno":"A","colacion":"B","almuerzo":"C","once":"D","cena":"E"}}""";
    static final String CONTACTO = """
            {"nombre":"Ana","correo":"ana@correo.cl","motivo":"Otro","mensaje":"Necesito más información."}""";

    @Autowired WebApplicationContext contexto;
    @Autowired JwtService jwt;
    @Value("${nutrivida.jwt.secreto}") String secreto;

    MockMvc mvc;

    @BeforeEach
    void preparar() {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity()).build();
    }

    /** Token del rol de la fila. NUT001 es U010, a cargo de U100; NUT002 (U011) no lo es. */
    String token(String quien) {
        return switch (quien) {
            case "ADMIN" -> ApoyoApi.admin(jwt);
            case "SECRETARIA" -> ApoyoApi.secretaria(jwt);
            case "PACIENTE" -> ApoyoApi.paciente(jwt, "U100");
            case "OTRO_PACIENTE" -> ApoyoApi.paciente(jwt, "U101");
            case "NUT001" -> ApoyoApi.nutricionista(jwt, "U010", "NUT001");
            case "NUT002" -> ApoyoApi.nutricionista(jwt, "U011", "NUT002");
            default -> null;
        };
    }

    static String cuerpo(String nombre) {
        return switch (nombre) {
            case "SERVICIO" -> SERVICIO;
            case "ESTADO" -> "{\"activo\":false}";
            case "PRECIO" -> "{\"precio\":26000}";
            case "FICHA" -> FICHA;
            case "MEDICION" -> MEDICION;
            case "PLAN" -> PLAN;
            case "CONTACTO" -> CONTACTO;
            default -> null;
        };
    }

    @ParameterizedTest(name = "{0} {1} como {3} → {4}")
    @CsvSource({
            // Catálogo público: sin token responde
            "GET,    /api/servicios,                 -,        ANONIMO,       200",
            "GET,    /api/servicios/CN001,           -,        ANONIMO,       200",
            "GET,    /api/nutricionistas,            -,        ANONIMO,       200",
            "GET,    /api/nutricionistas/NUT001,     -,        ANONIMO,       200",
            // Administración de servicios: solo ADMIN
            "POST,   /api/servicios,                 SERVICIO, ANONIMO,       401",
            "POST,   /api/servicios,                 SERVICIO, SECRETARIA,    403",
            "POST,   /api/servicios,                 SERVICIO, NUT001,        403",
            "POST,   /api/servicios,                 SERVICIO, ADMIN,         201",
            "PATCH,  /api/servicios/CN002,           PRECIO,   PACIENTE,      403",
            "PATCH,  /api/servicios/CN002,           PRECIO,   ADMIN,         200",
            "PATCH,  /api/servicios/CN002/estado,    ESTADO,   ANONIMO,       401",
            "PATCH,  /api/servicios/CN002/estado,    ESTADO,   SECRETARIA,    403",
            "PATCH,  /api/servicios/CN002/estado,    ESTADO,   ADMIN,         200",
            // Pacientes: listar es de NUTRICIONISTA y ADMIN
            "GET,    /api/pacientes,                 -,        ANONIMO,       401",
            "GET,    /api/pacientes,                 -,        PACIENTE,      403",
            "GET,    /api/pacientes,                 -,        SECRETARIA,    403",
            "GET,    /api/pacientes,                 -,        NUT001,        200",
            "GET,    /api/pacientes,                 -,        ADMIN,         200",
            // Ficha de U100: dueño (a cargo, el paciente, admin)
            "GET,    /api/pacientes/U100,            -,        ANONIMO,       401",
            "GET,    /api/pacientes/U100,            -,        OTRO_PACIENTE, 403",
            "GET,    /api/pacientes/U100,            -,        SECRETARIA,    403",
            "GET,    /api/pacientes/U100,            -,        PACIENTE,      200",
            "GET,    /api/pacientes/U100,            -,        NUT001,        200",
            "POST,   /api/pacientes,                 FICHA,    PACIENTE,      403",
            "POST,   /api/pacientes,                 FICHA,    ADMIN,         403",
            "POST,   /api/pacientes,                 FICHA,    NUT001,        201",
            // Mediciones y plan: escribe solo el nutricionista a cargo
            "GET,    /api/pacientes/U100/mediciones, -,        NUT002,        403",
            "GET,    /api/pacientes/U100/mediciones, -,        PACIENTE,      200",
            "POST,   /api/pacientes/U100/mediciones, MEDICION, ANONIMO,       401",
            "POST,   /api/pacientes/U100/mediciones, MEDICION, ADMIN,         403",
            "POST,   /api/pacientes/U100/mediciones, MEDICION, NUT002,        403",
            "POST,   /api/pacientes/U100/mediciones, MEDICION, NUT001,        201",
            "GET,    /api/pacientes/U100/plan,       -,        OTRO_PACIENTE, 403",
            "GET,    /api/pacientes/U100/plan,       -,        ADMIN,         200",
            "PUT,    /api/pacientes/U100/plan,       PLAN,     NUT002,        403",
            "PUT,    /api/pacientes/U100/plan,       PLAN,     NUT001,        200",
            // Contactos: bandeja de ADMIN y SECRETARIA, borrar solo ADMIN
            "GET,    /api/contactos,                 -,        ANONIMO,       401",
            "GET,    /api/contactos,                 -,        PACIENTE,      403",
            "GET,    /api/contactos,                 -,        SECRETARIA,    200",
            "GET,    /api/contactos,                 -,        ADMIN,         200",
            "POST,   /api/contactos,                 CONTACTO, PACIENTE,      201",
            "DELETE, /api/contactos/CT001,           -,        SECRETARIA,    403",
            "DELETE, /api/contactos/CT001,           -,        ADMIN,         204",
            // Foto: el propio nutricionista o el admin
            "DELETE, /api/nutricionistas/NUT001/foto, -,       ANONIMO,       401",
            "DELETE, /api/nutricionistas/NUT001/foto, -,       PACIENTE,      403",
            "DELETE, /api/nutricionistas/NUT001/foto, -,       NUT002,        403",
            "DELETE, /api/nutricionistas/NUT001/foto, -,       NUT001,        204",
    })
    void matriz(String metodo, String ruta, String cuerpo, String quien, int esperado) throws Exception {
        MockHttpServletRequestBuilder p = request(HttpMethod.valueOf(metodo), ruta);
        String json = cuerpo(cuerpo);
        if (json != null) p.contentType(MediaType.APPLICATION_JSON).content(json);
        String t = token(quien);
        if (t != null) p.header("Authorization", t);
        var resultado = mvc.perform(p).andExpect(status().is(esperado));
        if (esperado >= 400) {
            resultado.andExpect(jsonPath("$.status").value(esperado))
                    .andExpect(jsonPath("$.ruta").value(ruta))
                    .andExpect(jsonPath("$", hasKey("mensaje")))
                    .andExpect(jsonPath("$", hasKey("timestamp")));
        }
    }

    @Test
    @DisplayName("401: sin token, token vencido y firma inválida, cada uno con su mensaje")
    void motivosDel401() throws Exception {
        mvc.perform(get("/api/contactos"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Debes iniciar sesión para continuar."));

        // Mismo secreto, pero emitido hace 9 h con vigencia de 8 h.
        Instant hace9h = Instant.now().minus(9, ChronoUnit.HOURS);
        String vencido = Jwts.builder().subject("U001").claim("rol", "ADMIN").claim("nombre", "Admin")
                .issuedAt(Date.from(hace9h)).expiration(Date.from(hace9h.plus(8, ChronoUnit.HOURS)))
                .signWith(Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8))).compact();
        mvc.perform(get("/api/contactos").header("Authorization", "Bearer " + vencido))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Tu sesión expiró. Inicia sesión nuevamente."));

        String otraFirma = Jwts.builder().subject("U001").claim("rol", "ADMIN")
                .signWith(Keys.hmacShaKeyFor("otro-secreto-distinto-de-al-menos-32-caracteres".getBytes(StandardCharsets.UTF_8)))
                .compact();
        mvc.perform(get("/api/contactos").header("Authorization", "Bearer " + otraFirma))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("La sesión no es válida. Inicia sesión nuevamente."));
    }

    @Test
    @DisplayName("403 de @PreAuthorize: JSON común con el mensaje genérico")
    void prohibidoPorRol() throws Exception {
        mvc.perform(get("/api/pacientes").header("Authorization", token("SECRETARIA")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.mensaje").value("No tienes permiso para hacer esto."));
    }

    @Test
    @DisplayName("Swagger: público, con el esquema bearer (Authorize) y las rutas de ms-clinica")
    void swagger() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.components.securitySchemes.bearer.scheme").value("bearer"))
                .andExpect(jsonPath("$.paths", hasKey("/api/servicios")))
                .andExpect(jsonPath("$.paths", hasKey("/api/pacientes/{pacienteId}/mediciones")))
                .andExpect(jsonPath("$.paths", hasKey("/api/contactos")))
                .andExpect(jsonPath("$.components.schemas.ServicioSolicitud.properties.codigo.example").value("CN006"));
    }
}
