package cl.duoc.nutrivida.clinica.controller;

import static cl.duoc.nutrivida.clinica.ApoyoApi.admin;
import static cl.duoc.nutrivida.clinica.ApoyoApi.nutricionista;
import static cl.duoc.nutrivida.clinica.ApoyoApi.paciente;
import static cl.duoc.nutrivida.clinica.ApoyoApi.secretaria;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import cl.duoc.nutrivida.clinica.ApoyoApi;
import cl.duoc.nutrivida.clinica.repository.MedicionRepository;
import cl.duoc.nutrivida.clinica.repository.ServicioRepository;
import cl.duoc.nutrivida.clinica.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/**
 * C-32: CRUD de servicios, foto, fichas, mediciones, planes y contactos sobre H2 con las
 * semillas de EP2 y la seguridad real. Cada prueba se deshace al terminar (@Transactional).
 * Hoy es lunes 16/11/2026 (ApoyoApi). U100 es de NUT001 (U010) y U101 de NUT002 (U011).
 */
@SpringBootTest
@Import(ApoyoApi.class)
@Transactional
class ApiClinicaTest {

    static final String SERVICIO_NUEVO = """
            {"codigo":"cn006","tipo":"CONSULTA","nombre":"Consulta geriátrica","duracionMin":40,
             "modalidad":"Presencial","precio":30000,"descripcion":"Plan adaptado a mayores de 65 años."}""";
    static final String MEDICION = """
            {"fecha":"2026-11-16","pesoKg":71.84,"tallaCm":170,"cinturaCm":83,"grasaPct":29.1,"notas":" Bien "}""";
    static final String PLAN = """
            {"objetivo":"Mantención","kcalDiarias":1900,"indicaciones":"Agua",
             "comidas":{"desayuno":"Avena","colacion":"Fruta","almuerzo":"Pescado","once":"Pan","cena":"Sopa"}}""";
    static final String CONTACTO = """
            {"nombre":"Ana Pérez","correo":"ANA@Correo.cl","telefono":"+56 9 1234 5678",
             "motivo":"Planes y precios","mensaje":"¿Tienen planes para deportistas?"}""";

    @Autowired WebApplicationContext contexto;
    @Autowired JwtService jwt;
    @Autowired ServicioRepository servicios;
    @Autowired MedicionRepository mediciones;

    MockMvc mvc;

    @BeforeEach
    void preparar() {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity()).build();
    }

    ResultActions con(String token, AbstractMockHttpServletRequestBuilder<?> peticion) throws Exception {
        if (token != null) peticion.header("Authorization", token);
        return mvc.perform(peticion);
    }

    static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder p, String cuerpo) {
        return p.contentType(MediaType.APPLICATION_JSON).content(cuerpo);
    }

    String nut001() { return nutricionista(jwt, "U010", "NUT001"); }
    String nut002() { return nutricionista(jwt, "U011", "NUT002"); }
    String nut003() { return nutricionista(jwt, "U012", "NUT003"); }

    // ------------------------------------------------------------------ servicios

    @Test
    @DisplayName("POST /api/servicios: el admin crea (código en mayúsculas) y se ve en el catálogo")
    void creaServicio() throws Exception {
        con(admin(jwt), json(post("/api/servicios"), SERVICIO_NUEVO))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/servicios/CN006"))
                .andExpect(jsonPath("$.codigo").value("CN006"))
                .andExpect(jsonPath("$.activo").value(true))
                .andExpect(jsonPath("$", not(hasKey("cupoMax"))));
        mvc.perform(get("/api/servicios").param("tipo", "CONSULTA")).andExpect(jsonPath("$", hasSize(6)));
    }

    @Test
    @DisplayName("POST /api/servicios: 409 con código repetido y 400 con los mensajes de EP2")
    void creaServicioErrores() throws Exception {
        con(admin(jwt), json(post("/api/servicios"), SERVICIO_NUEVO.replace("cn006", "CN001")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.codigo").value("Ya existe un servicio con ese código."));
        con(admin(jwt), json(post("/api/servicios"), SERVICIO_NUEVO.replace("30000", "1500.5")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("El precio va en pesos, sin decimales."))
                .andExpect(jsonPath("$.errores.precio").value("El precio va en pesos, sin decimales."));
        con(admin(jwt), json(post("/api/servicios"), "{\"tipo\":\"TALLER\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Revisa los datos ingresados."))
                .andExpect(jsonPath("$.errores.cupoMax").value("El cupo debe ser un número entero de 1 a 50 personas."));
    }

    @Test
    @DisplayName("PATCH: edita solo lo enviado; un plan pierde la duración (ajustarPorTipo)")
    void editaServicio() throws Exception {
        con(admin(jwt), json(patch("/api/servicios/CN002"), "{\"precio\":26000}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.precio").value(26000))
                .andExpect(jsonPath("$.nombre").value("Control nutricional (seguimiento)"));
        con(admin(jwt), json(patch("/api/servicios/CN002"), "{\"tipo\":\"PLAN\"}"))
                .andExpect(jsonPath("$.duracionMin").doesNotExist());
        con(admin(jwt), json(patch("/api/servicios/XX999"), "{\"precio\":1}")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Desactivar: sale del catálogo público")
    void desactivaServicio() throws Exception {
        con(admin(jwt), json(patch("/api/servicios/TG002/estado"), "{\"activo\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activo").value(false));
        mvc.perform(get("/api/servicios")).andExpect(jsonPath("$", hasSize(17)));
        assertThat(servicios.findById("TG002").orElseThrow().getActivo()).isFalse();
        con(admin(jwt), json(patch("/api/servicios/TG002/estado"), "{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.activo").value("Indica si el servicio queda activo."));
    }

    // ------------------------------------------------------------------ foto

    @Test
    @DisplayName("Foto: el propio nutricionista la sube, se ve en fotoUrl y se descarga; luego la quita")
    void foto() throws Exception {
        var png = new MockMultipartFile("foto", "foto.png", "image/png", new byte[] {1, 2, 3});
        con(nut001(), multipart(HttpMethod.PUT, "/api/nutricionistas/NUT001/foto").file(png))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fotoUrl", startsWith("/api/nutricionistas/NUT001/foto?v=")));
        mvc.perform(get("/api/nutricionistas/NUT001/foto"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andExpect(content().bytes(new byte[] {1, 2, 3}));
        mvc.perform(get("/api/nutricionistas")).andExpect(jsonPath("$[0].fotoUrl", startsWith("/api/")));
        con(nut001(), delete("/api/nutricionistas/NUT001/foto")).andExpect(status().isNoContent());
        mvc.perform(get("/api/nutricionistas/NUT001/foto")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Foto: 403 la de otro nutricionista, 415 si no es imagen, 413 sobre 2 MB")
    void fotoErrores() throws Exception {
        var png = new MockMultipartFile("foto", "foto.png", "image/png", new byte[] {1});
        con(nut002(), multipart(HttpMethod.PUT, "/api/nutricionistas/NUT001/foto").file(png))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("Solo puedes cambiar tu propia foto."));
        var pdf = new MockMultipartFile("foto", "cv.pdf", "application/pdf", new byte[] {1});
        con(admin(jwt), multipart(HttpMethod.PUT, "/api/nutricionistas/NUT001/foto").file(pdf))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.errores.foto").value("La foto debe ser JPG, PNG o WebP."));
        var grande = new MockMultipartFile("foto", "g.jpg", "image/jpeg", new byte[2 * 1024 * 1024 + 1]);
        con(admin(jwt), multipart(HttpMethod.PUT, "/api/nutricionistas/NUT001/foto").file(grande))
                .andExpect(status().isPayloadTooLarge());
    }

    // ------------------------------------------------------------------ fichas

    @Test
    @DisplayName("GET /api/pacientes: el nutricionista ve los suyos; pedir los de otro es 403; el admin ve todos")
    void listaPacientes() throws Exception {
        con(nut001(), get("/api/pacientes")).andExpect(jsonPath("$[*].id", contains("U100")));
        con(nut001(), get("/api/pacientes").param("nutricionistaId", "NUT002"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("Solo puedes ver tus propios pacientes."));
        con(admin(jwt), get("/api/pacientes")).andExpect(jsonPath("$[*].id", contains("U100", "U101")));
        con(admin(jwt), get("/api/pacientes").param("nutricionistaId", "NUT002")).andExpect(jsonPath("$[*].id", contains("U101")));
    }

    @Test
    @DisplayName("GET /api/pacientes/{id}: completa a cargo, al paciente y al admin; otro nutricionista solo el dueño")
    void verFicha() throws Exception {
        con(nut001(), get("/api/pacientes/U100"))
                .andExpect(jsonPath("$.objetivo").value("PERDIDA_PESO"))
                .andExpect(jsonPath("$.creadaEn").value("2026-07-03"));
        con(paciente(jwt, "U100"), get("/api/pacientes/U100")).andExpect(jsonPath("$.antecedentes").exists());
        con(admin(jwt), get("/api/pacientes/U101")).andExpect(jsonPath("$.objetivo").value("DEPORTIVA"));
        con(nut002(), get("/api/pacientes/U100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("U100"))
                .andExpect(jsonPath("$.nutricionistaId").value("NUT001"))
                .andExpect(jsonPath("$", not(hasKey("objetivo"))))
                .andExpect(jsonPath("$", not(hasKey("antecedentes"))));
        con(paciente(jwt, "U101"), get("/api/pacientes/U100")).andExpect(status().isForbidden());
        con(secretaria(jwt), get("/api/pacientes/U100")).andExpect(status().isForbidden());
        con(nut001(), get("/api/pacientes/U102"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value("El paciente no tiene ficha."));
    }

    @Test
    @DisplayName("POST /api/pacientes: crea a nombre del token; 403 a nombre de otro; 409 si ya tiene; 400 sin datos")
    void creaFicha() throws Exception {
        con(nut003(), json(post("/api/pacientes"), """
                {"id":"U102","objetivo":"VEGETARIANA","antecedentes":"Vegana hace 2 años."}"""))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/pacientes/U102"))
                .andExpect(jsonPath("$.nutricionistaId").value("NUT003"))
                .andExpect(jsonPath("$.creadaEn").value("2026-11-16"));
        con(nut003(), json(post("/api/pacientes"), """
                {"id":"U900","nutricionistaId":"NUT001","objetivo":"VEGETARIANA","antecedentes":"X"}"""))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("Solo puedes crear fichas a tu nombre."));
        con(nut003(), json(post("/api/pacientes"), """
                {"id":"U100","objetivo":"DEPORTIVA","antecedentes":"X"}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Este paciente ya tiene ficha."));
        con(nut003(), json(post("/api/pacientes"), "{\"id\":\"U901\",\"objetivo\":\"OTRO\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.objetivo").value("Elige el objetivo del paciente."));
    }

    // ------------------------------------------------------------------ mediciones y planes

    @Test
    @DisplayName("Mediciones: el nutricionista a cargo registra M0008 (redondeada a 1 decimal) y el paciente la ve")
    void registraMedicion() throws Exception {
        con(nut001(), json(post("/api/pacientes/U100/mediciones"), MEDICION))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("M0008"))
                .andExpect(jsonPath("$.nutricionistaId").value("NUT001"))
                .andExpect(jsonPath("$.pesoKg").value(71.8))
                .andExpect(jsonPath("$.notas").value("Bien"));
        con(paciente(jwt, "U100"), get("/api/pacientes/U100/mediciones"))
                .andExpect(jsonPath("$", hasSize(6)))
                .andExpect(jsonPath("$[5].id").value("M0008"));
        assertThat(mediciones.findById("M0008")).isPresent();
    }

    @Test
    @DisplayName("Mediciones: 403 si no está a cargo, 404 sin ficha, 400 fuera de rango o futura")
    void medicionErrores() throws Exception {
        con(nut002(), json(post("/api/pacientes/U100/mediciones"), MEDICION))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("Solo el nutricionista a cargo puede modificar esta ficha."));
        con(nut001(), json(post("/api/pacientes/U102/mediciones"), MEDICION))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value("El paciente no tiene ficha: créala antes de continuar."));
        con(nut001(), json(post("/api/pacientes/U100/mediciones"), """
                {"fecha":"2026-11-17","pesoKg":350,"grasaPct":1}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("La medición tiene datos fuera de rango."))
                .andExpect(jsonPath("$.errores.pesoKg").value("El peso debe estar entre 2 y 300 kg."))
                .andExpect(jsonPath("$.errores.tallaCm").value("Ingresa la talla."))
                .andExpect(jsonPath("$.errores.fecha").value("La fecha de la medición no puede ser futura."));
        con(nut002(), get("/api/pacientes/U100/mediciones")).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Plan: guardar sin id crea PA003 vigente desde hoy; con id lo corrige; el paciente lo lee")
    void guardaPlan() throws Exception {
        con(paciente(jwt, "U100"), get("/api/pacientes/U100/plan")).andExpect(jsonPath("$.id").value("PA001"));
        con(nut001(), json(put("/api/pacientes/U100/plan"), PLAN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("PA003"))
                .andExpect(jsonPath("$.vigenteDesde").value("2026-11-16"))
                .andExpect(jsonPath("$.comidas.cena").value("Sopa"));
        con(nut001(), json(put("/api/pacientes/U100/plan"), PLAN.replace("{\"objetivo\"", "{\"id\":\"PA003\",\"objetivo\"")
                .replace("1900", "2000")))
                .andExpect(jsonPath("$.id").value("PA003"))
                .andExpect(jsonPath("$.kcalDiarias").value(2000));
        con(paciente(jwt, "U100"), get("/api/pacientes/U100/plan")).andExpect(jsonPath("$.id").value("PA003"));
        con(nut001(), json(put("/api/pacientes/U100/plan"), "{\"objetivo\":\"\",\"kcalDiarias\":100}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.kcalDiarias").value("Las kcal diarias deben ser un número entero entre 800 y 5000."))
                .andExpect(jsonPath("$.errores.desayuno").value("Indica el desayuno."));
        con(nut002(), json(put("/api/pacientes/U100/plan"), PLAN)).andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------------ contactos

    @Test
    @DisplayName("Contactos: se registra CT003 (correo en minúsculas), la secretaria lo lee y el admin lo elimina")
    void contactos() throws Exception {
        con(paciente(jwt, "U100"), json(post("/api/contactos"), CONTACTO))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("CT003"))
                .andExpect(jsonPath("$.correo").value("ana@correo.cl"))
                .andExpect(jsonPath("$.telefono").value("+56912345678"))
                .andExpect(jsonPath("$.fecha").value("2026-11-16"));
        con(secretaria(jwt), get("/api/contactos")).andExpect(jsonPath("$[*].id", contains("CT001", "CT002", "CT003")));
        con(admin(jwt), delete("/api/contactos/CT001")).andExpect(status().isNoContent());
        con(admin(jwt), delete("/api/contactos/CT001")).andExpect(status().isNotFound());
        con(paciente(jwt, "U100"), json(post("/api/contactos"), "{\"nombre\":\"A\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.nombre").value("El nombre debe tener al menos 2 caracteres."));
    }
}
