package cl.duoc.nutrivida.clinica.controller;

import static cl.duoc.nutrivida.clinica.ApoyoApi.admin;
import static cl.duoc.nutrivida.clinica.ApoyoApi.paciente;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import cl.duoc.nutrivida.clinica.ApoyoApi;
import cl.duoc.nutrivida.clinica.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/**
 * C-31: catálogos públicos con la forma que lee ms-citas (ClinicaHttp, ServicioClinica y
 * HorarioNutricionista): listas sin paginar, dias 0-6, horas "HH:mm", precio positivo.
 */
@SpringBootTest
@Import(ApoyoApi.class)
@Transactional
class CatalogoTest {

    @Autowired WebApplicationContext contexto;
    @Autowired JwtService jwt;

    MockMvc mvc;

    @BeforeEach
    void preparar() {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity()).build();
    }

    @Test
    @DisplayName("GET /api/servicios sin token: los 18 de EP2, en lista y con los campos de ms-citas")
    void serviciosPublicos() throws Exception {
        mvc.perform(get("/api/servicios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(18)))
                .andExpect(jsonPath("$[0].codigo").value("CN001"))
                .andExpect(jsonPath("$[0].tipo").value("CONSULTA"))
                .andExpect(jsonPath("$[0].duracionMin").value(50))
                .andExpect(jsonPath("$[0].modalidad").value("Presencial"))
                .andExpect(jsonPath("$[0].precio").value(35000))
                .andExpect(jsonPath("$[0].activo").value(true))
                .andExpect(jsonPath("$[0]", not(hasKey("cupoMax"))))
                .andExpect(jsonPath("$[5].codigo").value("PL001"))
                .andExpect(jsonPath("$[5].duracionMin").value(nullValue()))
                .andExpect(jsonPath("$[15].codigo").value("TG001"))
                .andExpect(jsonPath("$[15].cupoMax").value(10));
    }

    @Test
    @DisplayName("Filtros de EP2: por tipo y por texto sin tildes")
    void filtros() throws Exception {
        mvc.perform(get("/api/servicios").param("tipo", "TALLER"))
                .andExpect(jsonPath("$[*].codigo", contains("TG001", "TG002", "TG003")));
        mvc.perform(get("/api/servicios").param("texto", "NUTRICION DEPORTIVA"))
                .andExpect(jsonPath("$[*].codigo", contains("PL003")));
    }

    @Test
    @DisplayName("soloActivos=false: 401 sin token, 403 para un paciente, 200 para el admin")
    void inactivosSoloAdmin() throws Exception {
        mvc.perform(get("/api/servicios").param("soloActivos", "false")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/servicios").param("soloActivos", "false").header("Authorization", paciente(jwt, "U100")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("Solo el administrador ve los servicios desactivados."));
        mvc.perform(get("/api/servicios").param("soloActivos", "false").header("Authorization", admin(jwt)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(18)));
    }

    @Test
    @DisplayName("GET /api/servicios/{codigo}: 200 y 404 con el JSON común")
    void unServicio() throws Exception {
        mvc.perform(get("/api/servicios/CN004"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modalidad").value("Online (video)"));
        mvc.perform(get("/api/servicios/XX999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.mensaje").value("El servicio no existe."))
                .andExpect(jsonPath("$.ruta").value("/api/servicios/XX999"));
    }

    @Test
    @DisplayName("GET /api/nutricionistas sin token: jornada con dias 0-6 y horas HH:mm")
    void nutricionistasPublicos() throws Exception {
        mvc.perform(get("/api/nutricionistas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].id").value("NUT001"))
                .andExpect(jsonPath("$[0].usuarioId").value("U010"))
                .andExpect(jsonPath("$[0].dias", contains(1, 3, 5)))
                .andExpect(jsonPath("$[0].horaInicio").value("09:00"))
                .andExpect(jsonPath("$[0].horaFin").value("17:00"))
                .andExpect(jsonPath("$[0].fotoUrl").value(nullValue()))
                .andExpect(jsonPath("$[*].horaInicio", everyItem(matchesPattern("\\d{2}:\\d{2}"))))
                .andExpect(jsonPath("$[2].dias", contains(1, 2, 3, 4, 5)));
    }

    @Test
    @DisplayName("GET /api/nutricionistas/{id}: 200 y 404")
    void unNutricionista() throws Exception {
        mvc.perform(get("/api/nutricionistas/NUT004"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Felipe Araya R."));
        mvc.perform(get("/api/nutricionistas/NUT009"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value("El nutricionista no existe."));
    }
}
