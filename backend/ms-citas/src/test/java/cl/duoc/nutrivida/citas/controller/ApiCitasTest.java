package cl.duoc.nutrivida.citas.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import cl.duoc.nutrivida.citas.ApoyoApi;
import cl.duoc.nutrivida.citas.model.EstadoPago;
import cl.duoc.nutrivida.citas.repository.AgendaDiaRepository;
import cl.duoc.nutrivida.citas.repository.CitaRepository;
import cl.duoc.nutrivida.citas.repository.ContadorRepository;
import cl.duoc.nutrivida.citas.repository.PagoRepository;
import cl.duoc.nutrivida.citas.security.JwtService;
import cl.duoc.nutrivida.citas.security.UsuarioAutenticado;
import cl.duoc.nutrivida.citas.service.ReglasCita;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * R7 y R10: la API completa de ms-citas sobre H2, con las semillas de ms-clinica y ms-usuarios
 * (modo auto sin URL) y la seguridad real: JWT, @PreAuthorize y reglas de dueño. Cada prueba
 * parte con la base vacía. Hoy es lunes 16/11/2026 a las 08:00 (ApoyoApi).
 *
 * <p>Agendas de las semillas: NUT001 lunes, miércoles y viernes 09:00-17:00; NUT003 lunes a
 * viernes 08:00-13:00. CN002 dura 30 min y cuesta $25.000; CN004 es la teleconsulta.
 */
@SpringBootTest
@Import(ApoyoApi.class)
class ApiCitasTest {

    static final String MIERCOLES = "2026-11-18";
    static final String MANANA = "2026-11-17";
    static final String TARJETA_OK = """
            {"titular":"Ana Pérez","numero":"4242 4242 4242 4242","vencimiento":"12/28","cvv":"123"}""";
    static final String TARJETA_RECHAZADA = """
            {"titular":"Ana Pérez","numero":"4000 0000 0000 0002","vencimiento":"12/28","cvv":"123"}""";

    @Autowired WebApplicationContext contexto;
    @Autowired JwtService jwt;
    @Autowired CitaRepository citas;
    @Autowired PagoRepository pagos;
    @Autowired ContadorRepository contadores;
    @Autowired AgendaDiaRepository agendas;

    MockMvc mvc;

    @BeforeEach
    void preparar() {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity()).build();
        citas.deleteAll();
        pagos.deleteAll();
        contadores.deleteAll();
        agendas.deleteAll();
    }

    // ------------------------------------------------------------------ apoyo

    String token(String id, String rol, String nutricionistaId) {
        return "Bearer " + jwt.generar(new UsuarioAutenticado(id, rol, id, nutricionistaId));
    }

    String paciente(String id) { return token(id, "PACIENTE", null); }
    String secretaria() { return token("U002", "SECRETARIA", null); }
    String admin() { return token("U001", "ADMIN", null); }
    String nutricionista(String id, String nutricionistaId) { return token(id, "NUTRICIONISTA", nutricionistaId); }

    ResultActions con(String token, MockHttpServletRequestBuilder peticion) throws Exception {
        if (token != null) peticion.header("Authorization", token);
        return mvc.perform(peticion);
    }

    static String reserva(String servicio, String nutricionista, String fecha, String hora, String tarjeta) {
        return """
                {"servicioCodigo":"%s","nutricionistaId":"%s","fecha":"%s","hora":"%s",
                 "motivo":"Control mensual de peso","tarjeta":%s}""".formatted(servicio, nutricionista, fecha, hora, tarjeta);
    }

    ResultActions reservar(String token, String nutricionista, String fecha, String hora) throws Exception {
        return con(token, post("/api/citas").contentType(MediaType.APPLICATION_JSON)
                .content(reserva("CN002", nutricionista, fecha, hora, TARJETA_OK)));
    }

    ResultActions cambiarEstado(String token, String id, String estado) throws Exception {
        return con(token, patch("/api/citas/" + id + "/estado").contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"" + estado + "\"}"));
    }

    // ------------------------------------------------------------------ crear (pago + cita)

    @Test
    @DisplayName("POST /api/citas: crea el pago APROBADO y la cita PENDIENTE en una transacción")
    void creaPagoYCita() throws Exception {
        reservar(paciente("U100"), "NUT001", MIERCOLES, "10:00")
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/citas/C0001"))
                .andExpect(jsonPath("$.id").value("C0001"))
                .andExpect(jsonPath("$.pacienteId").value("U100"))
                .andExpect(jsonPath("$.hora").value("10:00"))
                .andExpect(jsonPath("$.duracionMin").value(30))
                .andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.pagoId").value("P0001"))
                .andExpect(jsonPath("$.historial", hasSize(0)));

        con(paciente("U100"), get("/api/pagos/P0001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.citaId").value("C0001"))
                .andExpect(jsonPath("$.monto").value(25000))
                .andExpect(jsonPath("$.ultimos4").value("4242"))
                .andExpect(jsonPath("$.estado").value("APROBADO"));
    }

    @Test
    @DisplayName("la misma hora dos veces: la segunda es 409 en 'hora' y no se cobra")
    void horaTomada() throws Exception {
        reservar(paciente("U100"), "NUT001", MIERCOLES, "10:00").andExpect(status().isCreated());
        reservar(paciente("U101"), "NUT001", MIERCOLES, "10:00")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.hora").value("Esa hora no está disponible con este nutricionista. Elige otra."));
        assertThat(pagos.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("tarjeta rechazada: 402, el pago RECHAZADO queda guardado y la cita no se crea")
    void tarjetaRechazada() throws Exception {
        con(paciente("U100"), post("/api/citas").contentType(MediaType.APPLICATION_JSON)
                .content(reserva("CN002", "NUT001", MIERCOLES, "10:00", TARJETA_RECHAZADA)))
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.mensaje").value("El banco rechazó la tarjeta."));
        assertThat(citas.count()).isZero();
        assertThat(pagos.findAll()).singleElement()
                .satisfies(p -> assertThat(p.getEstado()).isEqualTo(EstadoPago.RECHAZADO))
                .satisfies(p -> assertThat(p.getUltimos4()).isEqualTo("0002"));
    }

    @Test
    @DisplayName("tarjeta inválida: 400 con un mensaje por campo y sin pago")
    void tarjetaInvalida() throws Exception {
        con(paciente("U100"), post("/api/citas").contentType(MediaType.APPLICATION_JSON)
                .content(reserva("CN002", "NUT001", MIERCOLES, "10:00",
                        "{\"titular\":\"\",\"numero\":\"4242 4242 4242 4241\",\"vencimiento\":\"01/20\",\"cvv\":\"12\"}")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Revisa los datos de la tarjeta."))
                .andExpect(jsonPath("$.errores.titular").exists())
                .andExpect(jsonPath("$.errores.numero").exists())
                .andExpect(jsonPath("$.errores.vencimiento").exists())
                .andExpect(jsonPath("$.errores.cvv").exists());
        assertThat(pagos.count()).isZero();
    }

    @Test
    @DisplayName("RN-16: teleconsulta sin una atención presencial previa es 409")
    void teleconsultaSinPresencial() throws Exception {
        con(paciente("U100"), post("/api/citas").contentType(MediaType.APPLICATION_JSON)
                .content(reserva("CN004", "NUT001", MIERCOLES, "10:00", TARJETA_OK)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("La teleconsulta requiere haber tenido antes una consulta presencial."));
    }

    @Test
    @DisplayName("RN-13 y RN-14: fecha pasada y motivo corto se rechazan con el campo")
    void fechaYMotivo() throws Exception {
        con(paciente("U100"), post("/api/citas").contentType(MediaType.APPLICATION_JSON)
                .content(reserva("CN002", "NUT001", "2026-11-13", "10:00", TARJETA_OK)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.fecha").value("Esa fecha ya pasó. Elige una desde hoy."));
        con(paciente("U100"), post("/api/citas").contentType(MediaType.APPLICATION_JSON)
                .content(reserva("CN002", "NUT001", MIERCOLES, "10:00", TARJETA_OK).replace("Control mensual de peso", "corto")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.motivo").value("El motivo debe tener al menos 10 caracteres."));
    }

    @Test
    @DisplayName("solo un PACIENTE agenda: la secretaria recibe 403")
    void soloPacienteAgenda() throws Exception {
        reservar(secretaria(), "NUT001", MIERCOLES, "10:00").andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------------ consultas y dueño

    @Test
    @DisplayName("cada rol ve lo suyo: mias, agenda del nutricionista y búsqueda de la secretaria")
    void consultasPorRol() throws Exception {
        reservar(paciente("U100"), "NUT001", MIERCOLES, "10:00").andExpect(status().isCreated());
        reservar(paciente("U101"), "NUT003", MANANA, "10:00").andExpect(status().isCreated());

        con(paciente("U100"), get("/api/citas/mias"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value("C0001"));
        con(nutricionista("U012", "NUT003"), get("/api/citas/agenda"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value("C0002"));
        con(secretaria(), get("/api/citas").param("nutricionistaId", "NUT001"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        con(secretaria(), get("/api/citas")).andExpect(jsonPath("$", hasSize(2)));
        con(paciente("U100"), get("/api/citas")).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("reglas de dueño: otro paciente o un nutricionista ajeno reciben 403")
    void reglasDeDueno() throws Exception {
        reservar(paciente("U100"), "NUT001", MIERCOLES, "10:00").andExpect(status().isCreated());

        con(paciente("U101"), get("/api/citas/C0001"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.mensaje").value("Esa cita no es tuya."));
        con(nutricionista("U011", "NUT002"), get("/api/citas/C0001"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.mensaje").value("Esa cita no está en tu agenda."));
        con(paciente("U101"), get("/api/pagos/P0001"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.mensaje").value("Ese pago no es tuyo."));
        con(paciente("U100"), get("/api/citas/C0001")).andExpect(status().isOk());
        con(nutricionista("U010", "NUT001"), get("/api/citas/C0001")).andExpect(status().isOk());
        con(admin(), get("/api/pagos/P0001")).andExpect(status().isOk());
        con(admin(), get("/api/citas/C9999"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.mensaje").value("La cita C9999 no existe."));
    }

    // ------------------------------------------------------------------ estados

    @Test
    @DisplayName("ciclo de vida: la secretaria confirma, el nutricionista atiende y ya no se cancela")
    void cicloDeVida() throws Exception {
        reservar(paciente("U100"), "NUT001", MIERCOLES, "10:00").andExpect(status().isCreated());

        cambiarEstado(nutricionista("U010", "NUT001"), "C0001", "CONFIRMADA")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("Tu rol no puede hacer ese cambio en la cita."));
        cambiarEstado(secretaria(), "C0001", "CONFIRMADA")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CONFIRMADA"))
                .andExpect(jsonPath("$.historial[0].de").value("PENDIENTE"))
                .andExpect(jsonPath("$.historial[0].a").value("CONFIRMADA"))
                .andExpect(jsonPath("$.historial[0].por").value("U002"));
        cambiarEstado(nutricionista("U010", "NUT001"), "C0001", "ATENDIDA")
                .andExpect(status().isOk()).andExpect(jsonPath("$.historial", hasSize(2)));
        cambiarEstado(paciente("U100"), "C0001", "CANCELADA")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("No se puede pasar una cita atendida a cancelada."));
    }

    @Test
    @DisplayName("RN-08 y §6.1: el paciente cancela con más de 24 h, se reembolsa y el admin la elimina")
    void cancelarReembolsarYEliminar() throws Exception {
        reservar(paciente("U100"), "NUT001", MIERCOLES, "10:00").andExpect(status().isCreated());

        con(admin(), delete("/api/citas/C0001"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Solo se puede eliminar una cita cancelada."));
        cambiarEstado(paciente("U100"), "C0001", "CANCELADA")
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("CANCELADA"));
        assertThat(pagos.findById("P0001")).get().extracting(p -> p.getEstado()).isEqualTo(EstadoPago.REEMBOLSADO);

        con(paciente("U100"), delete("/api/citas/C0001")).andExpect(status().isForbidden());
        con(admin(), delete("/api/citas/C0001")).andExpect(status().isNoContent());
        assertThat(citas.existsById("C0001")).isFalse();
        assertThat(pagos.existsById("P0001")).as("el pago queda como registro contable").isTrue();
        con(admin(), get("/api/pagos/P0001")).andExpect(jsonPath("$.citaId").doesNotExist());
    }

    @Test
    @DisplayName("RN-06: con 24 h justas el paciente ya no cancela ni reprograma; la secretaria sí")
    void reglaDe24Horas() throws Exception {
        reservar(paciente("U100"), "NUT003", MANANA, "08:00").andExpect(status().isCreated());

        cambiarEstado(paciente("U100"), "C0001", "CANCELADA")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.mensaje").value(ReglasCita.MENSAJE_24H));
        con(paciente("U100"), patch("/api/citas/C0001/reprogramar").contentType(MediaType.APPLICATION_JSON)
                .content("{\"fecha\":\"" + MANANA + "\",\"hora\":\"11:00\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.mensaje").value(ReglasCita.MENSAJE_24H));
        cambiarEstado(secretaria(), "C0001", "CANCELADA").andExpect(status().isOk());
    }

    @Test
    @DisplayName("RN-05: reprogramar a una hora libre deja la cita PENDIENTE; a una tomada es 409")
    void reprogramar() throws Exception {
        reservar(paciente("U100"), "NUT001", MIERCOLES, "10:00").andExpect(status().isCreated());
        reservar(paciente("U101"), "NUT001", MIERCOLES, "11:00").andExpect(status().isCreated());
        cambiarEstado(secretaria(), "C0001", "CONFIRMADA").andExpect(status().isOk());

        con(paciente("U100"), patch("/api/citas/C0001/reprogramar").contentType(MediaType.APPLICATION_JSON)
                .content("{\"fecha\":\"" + MIERCOLES + "\",\"hora\":\"11:00\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.errores.hora").exists());
        con(paciente("U100"), patch("/api/citas/C0001/reprogramar").contentType(MediaType.APPLICATION_JSON)
                .content("{\"fecha\":\"2026-11-20\",\"hora\":\"15:30\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fecha").value("2026-11-20"))
                .andExpect(jsonPath("$.hora").value("15:30"))
                .andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.historial[1].de").value("CONFIRMADA"))
                .andExpect(jsonPath("$.historial[1].a").value("PENDIENTE"));
        con(nutricionista("U010", "NUT001"), patch("/api/citas/C0001/reprogramar").contentType(MediaType.APPLICATION_JSON)
                .content("{\"fecha\":\"2026-11-20\",\"hora\":\"16:00\"}"))
                .andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------------ públicos y admin

    @Test
    @DisplayName("disponibilidad pública: sin token, y la hora reservada deja de ofrecerse")
    void disponibilidadPublica() throws Exception {
        mvc.perform(get("/api/disponibilidad").param("nutricionistaId", "NUT001").param("fecha", MIERCOLES))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(16)))
                .andExpect(jsonPath("$[0]").value("09:00"));
        reservar(paciente("U100"), "NUT001", MIERCOLES, "10:00").andExpect(status().isCreated());
        mvc.perform(get("/api/disponibilidad").param("nutricionistaId", "NUT001").param("fecha", MIERCOLES))
                .andExpect(jsonPath("$", hasSize(15)));
        mvc.perform(get("/api/disponibilidad").param("nutricionistaId", "NUT001").param("fecha", MIERCOLES)
                        .param("excluir", "C0001"))
                .andExpect(jsonPath("$", hasSize(16)));
        mvc.perform(get("/api/disponibilidad").param("nutricionistaId", "NUT999").param("fecha", MIERCOLES))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("decisión 3: /proximas entrega las siguientes horas libres de toda la clínica")
    void proximas() throws Exception {
        mvc.perform(get("/api/disponibilidad/proximas").param("cantidad", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].nutricionistaId").value("NUT003"))
                .andExpect(jsonPath("$[0].fecha").value("2026-11-16"))
                .andExpect(jsonPath("$[0].hora").value("08:30"))
                .andExpect(jsonPath("$[1].hora").value("09:00"))
                .andExpect(jsonPath("$[1].nutricionistaId").value("NUT001"));
        mvc.perform(get("/api/disponibilidad/proximas").param("cantidad", "500"))
                .andExpect(jsonPath("$", hasSize(20)));
    }

    @Test
    @DisplayName("RN-27: estadísticas solo para el admin, con todos los nutricionistas")
    void estadisticas() throws Exception {
        reservar(paciente("U100"), "NUT001", MIERCOLES, "10:00").andExpect(status().isCreated());
        con(admin(), get("/api/citas/estadisticas").param("desde", "2026-11-16").param("hasta", "2026-11-22"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.porNutricionista", hasSize(4)))
                .andExpect(jsonPath("$.porSemana[0].semana").value("2026-11-16"));
        con(secretaria(), get("/api/citas/estadisticas").param("desde", "2026-11-16").param("hasta", "2026-11-22"))
                .andExpect(status().isForbidden());
        con(admin(), get("/api/pagos")).andExpect(status().isOk()).andExpect(jsonPath("$[0].citaId").value("C0001"));
        con(admin(), get("/api/pagos").param("citaIds", "C0001,C0404")).andExpect(jsonPath("$", hasSize(1)));
    }
}
