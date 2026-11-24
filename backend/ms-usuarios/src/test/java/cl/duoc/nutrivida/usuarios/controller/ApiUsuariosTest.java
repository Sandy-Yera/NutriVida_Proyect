package cl.duoc.nutrivida.usuarios.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import cl.duoc.nutrivida.usuarios.ApoyoApi;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** G-33: lectura con regla de dueño, CRUD del admin y consejos, sobre H2 y con la seguridad real. */
@SpringBootTest
class ApiUsuariosTest extends ApoyoApi {

    static final String NUEVO = """
            {"nombre":"Ignacio","apellido":"Vera","rut":"11.111.111-1","correo":"ivera@nutrivida.cl",
             "telefono":"+56 9 1111 0020","rol":"SECRETARIA","clave":"Clave2026!"}""";

    static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder p, String cuerpo) {
        return p.contentType(MediaType.APPLICATION_JSON).content(cuerpo);
    }

    ResultActions crear(String cuerpo) throws Exception {
        return con(admin(), json(post("/api/usuarios"), cuerpo));
    }

    // ------------------------------------------------------------------ lectura

    @Test
    @DisplayName("GET /{id}: el paciente lee su propia cuenta con id y activo (lo que pide ms-citas)")
    void pacienteLeeSuCuenta() throws Exception {
        con(paciente(), get("/api/usuarios/U100")).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("U100"))
                .andExpect(jsonPath("$.activo").value(true))
                .andExpect(jsonPath("$.clave").doesNotExist());
    }

    @Test
    @DisplayName("GET /{id}: un paciente no lee la cuenta de otro → 403")
    void pacienteNoLeeAjena() throws Exception {
        con(paciente(), get("/api/usuarios/U101")).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("Solo puedes ver tu propia cuenta."));
    }

    @Test
    @DisplayName("GET /{id}: el nutricionista lee pacientes, no al personal")
    void nutricionistaSoloPacientes() throws Exception {
        con(nutricionista(), get("/api/usuarios/U101")).andExpect(status().isOk());
        con(nutricionista(), get("/api/usuarios/U002")).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /{id}: inexistente → 404 con un mensaje distinto al de ruta inexistente")
    void usuarioInexistente() throws Exception {
        con(secretaria(), get("/api/usuarios/U999")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value("El usuario no existe."));
    }

    @Test
    @DisplayName("GET lista: filtros rol, activo y texto sin tildes (nombre, correo o RUT)")
    void listarConFiltros() throws Exception {
        con(admin(), get("/api/usuarios")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(10)));
        con(admin(), get("/api/usuarios").param("rol", "PACIENTE").param("activo", "true"))
                .andExpect(jsonPath("$", hasSize(3)));
        con(secretaria(), get("/api/usuarios").param("texto", "huenchullan"))
                .andExpect(jsonPath("$[0].id").value("U101"));
        con(secretaria(), get("/api/usuarios").param("texto", "16222333")).andExpect(jsonPath("$[0].id").value("U010"));
    }

    @Test
    @DisplayName("GET lista: el nutricionista solo pide pacientes; un rol desconocido → 400")
    void listarNutricionista() throws Exception {
        con(nutricionista(), get("/api/usuarios").param("rol", "PACIENTE")).andExpect(status().isOk());
        con(nutricionista(), get("/api/usuarios")).andExpect(status().isForbidden());
        con(admin(), get("/api/usuarios").param("rol", "JEFE")).andExpect(status().isBadRequest());
    }

    // ------------------------------------------------------------------ crear

    @Test
    @DisplayName("POST: el admin crea una cuenta → 201 con Location y el siguiente id")
    void adminCrea() throws Exception {
        crear(NUEVO).andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/usuarios/U104"))
                .andExpect(jsonPath("$.rol").value("SECRETARIA"))
                .andExpect(jsonPath("$.activo").value(true));
    }

    @Test
    @DisplayName("POST: correo repetido → 409 con errores.correo")
    void correoDuplicado() throws Exception {
        crear(NUEVO.replace("ivera@nutrivida.cl", "recepcion@nutrivida.cl")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.correo").value("Ya existe un usuario con ese correo."));
    }

    @Test
    @DisplayName("POST: NUTRICIONISTA sin nutricionistaId → 400; con uno ya vinculado → 409")
    void vinculoNutricionista() throws Exception {
        crear(NUEVO.replace("SECRETARIA", "NUTRICIONISTA")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.nutricionistaId").value("Selecciona el nutricionista vinculado."));
        crear(NUEVO.replace("\"SECRETARIA\"", "\"NUTRICIONISTA\",\"nutricionistaId\":\"NUT001\""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.nutricionistaId").exists());
    }

    // ------------------------------------------------------------------ editar

    @Test
    @DisplayName("PATCH: el paciente edita nombre y teléfono de su cuenta")
    void pacienteEditaPerfil() throws Exception {
        con(paciente(), json(patch("/api/usuarios/U100"), "{\"nombre\":\"Javi\",\"telefono\":\"+56922220199\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Javi"))
                .andExpect(jsonPath("$.telefono").value("+56 9 2222 0199"));
    }

    @Test
    @DisplayName("PATCH: el paciente no cambia su correo ni edita otra cuenta → 403")
    void pacienteNoEditaReservado() throws Exception {
        con(paciente(), json(patch("/api/usuarios/U100"), "{\"correo\":\"otro@correo.cl\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errores.correo").value("Ese dato solo lo puede cambiar el administrador."));
        con(paciente(), json(patch("/api/usuarios/U101"), "{\"nombre\":\"Otro\"}")).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PATCH: el admin edita el correo de otra cuenta; repetido → 409")
    void adminEditaCorreo() throws Exception {
        con(admin(), json(patch("/api/usuarios/U101"), "{\"correo\":\"Tomas.Nuevo@correo.cl\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.correo").value("tomas.nuevo@correo.cl"));
        con(admin(), json(patch("/api/usuarios/U101"), "{\"correo\":\"ana.perez@correo.cl\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Admin sobre sí mismo: no se desactiva ni cambia su rol → 403")
    void adminSeProtege() throws Exception {
        con(admin(), json(patch("/api/usuarios/U001/estado"), "{\"activo\":false}")).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errores.activo").value("No puedes desactivar tu propia cuenta."));
        con(admin(), json(patch("/api/usuarios/U001/rol"), "{\"rol\":\"SECRETARIA\"}")).andExpect(status().isForbidden());
        con(admin(), json(patch("/api/usuarios/U001"), "{\"nombre\":\"Admin\",\"rol\":\"ADMIN\",\"activo\":true}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PATCH /estado y /rol: el admin desactiva y cambia el rol (el vínculo se borra)")
    void estadoYRol() throws Exception {
        con(admin(), json(patch("/api/usuarios/U101/estado"), "{\"activo\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.activo").value(false));
        con(admin(), json(patch("/api/usuarios/U013/rol"), "{\"rol\":\"SECRETARIA\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nutricionistaId").doesNotExist());
    }

    // ------------------------------------------------------------------ clave

    @Test
    @DisplayName("PUT /clave: con la actual correcta cambia; incorrecta → 400; ajena → 403")
    void cambiarClave() throws Exception {
        con(paciente(), json(put("/api/usuarios/U100/clave"), "{\"claveActual\":\"Mala2026!\",\"claveNueva\":\"Nueva2026!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.claveActual").value("La contraseña actual no es correcta."));
        con(paciente(), json(put("/api/usuarios/U101/clave"), "{\"claveActual\":\"Paciente2026!\",\"claveNueva\":\"Nueva2026!\"}"))
                .andExpect(status().isForbidden());
        con(paciente(), json(put("/api/usuarios/U100/clave"), "{\"claveActual\":\"Paciente2026!\",\"claveNueva\":\"Nueva2026!\"}"))
                .andExpect(status().isOk());
        mvc.perform(json(post("/api/auth/login"), "{\"correo\":\"javiera.soto@correo.cl\",\"clave\":\"Nueva2026!\"}"))
                .andExpect(status().isOk());
    }

    // ------------------------------------------------------------------ eliminar

    @Test
    @DisplayName("DELETE: solo cuentas desactivadas (409 si está activa); luego 404")
    void eliminarDesactivada() throws Exception {
        con(admin(), delete("/api/usuarios/U102")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Desactiva la cuenta antes de eliminarla."));
        con(admin(), delete("/api/usuarios/U103")).andExpect(status().isNoContent());
        con(admin(), get("/api/usuarios/U103")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("DELETE: el admin no se elimina a sí mismo → 403")
    void noEliminaPropia() throws Exception {
        con(admin(), delete("/api/usuarios/U001")).andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------------ consejos

    @Test
    @DisplayName("GET /api/articulos: público, del más reciente al más antiguo; inexistente → 404")
    void articulosPublicos() throws Exception {
        mvc.perform(get("/api/articulos")).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").value("hidratacion-antes-de-entrenar"))
                .andExpect(jsonPath("$[0].autorNutricionistaId").value("NUT002"));
        mvc.perform(get("/api/articulos/colaciones-jornada-laboral")).andExpect(status().isOk())
                .andExpect(jsonPath("$.fecha").value("2026-09-15"));
        mvc.perform(get("/api/articulos/no-existe")).andExpect(status().isNotFound());
    }
}
