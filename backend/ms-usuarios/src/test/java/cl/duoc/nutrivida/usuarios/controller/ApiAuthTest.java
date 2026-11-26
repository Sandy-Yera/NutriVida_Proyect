package cl.duoc.nutrivida.usuarios.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import cl.duoc.nutrivida.usuarios.ApoyoApi;
import cl.duoc.nutrivida.usuarios.repository.UsuarioRepository;
import cl.duoc.nutrivida.usuarios.security.UsuarioAutenticado;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/** G-32: login, registro y /me contra H2, con la seguridad real. */
@SpringBootTest
class ApiAuthTest extends ApoyoApi {

    @Autowired UsuarioRepository usuarios;

    static final String REGISTRO = """
            {"nombre":"Camila","apellido":"Rojas","rut":"12345678-5","correo":"Camila.Rojas@Correo.cl",
             "telefono":"+56955551234","fechaNacimiento":"1998-03-21","clave":"Clave2026!"}""";

    ResultActions login(String correo, String clave) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"correo\":\"%s\",\"clave\":\"%s\"}".formatted(correo, clave)));
    }

    ResultActions registrar(String cuerpo) throws Exception {
        return mvc.perform(post("/api/auth/registro").contentType(MediaType.APPLICATION_JSON).content(cuerpo));
    }

    // ------------------------------------------------------------------ login

    @Test
    @DisplayName("Login: 200 con el JWT del contrato (sub, rol, nombre, nutricionistaId) y la cuenta sin clave")
    void loginEmiteToken() throws Exception {
        String cuerpo = login("cfuentes@nutrivida.cl", "Nutri2026!")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipo").value("Bearer"))
                .andExpect(jsonPath("$.expiraEn").value(28800))
                .andExpect(jsonPath("$.usuario.id").value("U010"))
                .andExpect(jsonPath("$.usuario.rol").value("NUTRICIONISTA"))
                .andExpect(jsonPath("$.usuario.clave").doesNotExist())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String token = JsonPath.read(cuerpo, "$.token");
        UsuarioAutenticado u = jwt.validar(token);
        assertThat(u).isEqualTo(new UsuarioAutenticado("U010", "NUTRICIONISTA", "Carolina", "NUT001"));
    }

    @Test
    @DisplayName("Login: el algoritmo es HS256 con el secreto de desarrollo (contrato §3, ver integracion-ep3.md §8.4)")
    void algoritmoDelContrato() throws Exception {
        String cuerpo = login("admin@nutrivida.cl", "Admin2026!").andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        String cabecera = new String(Base64.getUrlDecoder().decode(((String) JsonPath.read(cuerpo, "$.token")).split("\\.")[0]),
                StandardCharsets.UTF_8);
        assertThat(cabecera).contains("\"alg\":\"HS256\"");
    }

    @Test
    @DisplayName("Login: el correo no distingue mayúsculas ni espacios")
    void correoSinMayusculas() throws Exception {
        login("  ADMIN@NutriVida.cl ", "Admin2026!").andExpect(status().isOk());
    }

    @Test
    @DisplayName("Login: clave incorrecta o correo inexistente dan el mismo 401")
    void credencialesIncorrectas() throws Exception {
        login("admin@nutrivida.cl", "otra").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Correo o contraseña incorrectos."))
                .andExpect(jsonPath("$.ruta").value("/api/auth/login"));
        login("nadie@nutrivida.cl", "Admin2026!").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Correo o contraseña incorrectos."));
    }

    @Test
    @DisplayName("Login: cuenta desactivada → 403 y sin token")
    void cuentaDesactivada() throws Exception {
        login("pedro.lagos@correo.cl", "Paciente2026!").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("Tu cuenta está desactivada. Contacta a la clínica."))
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    @DisplayName("Login: campos vacíos → 400 con errores por campo")
    void loginVacio() throws Exception {
        login("", "").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.correo").value("Ingresa el correo."))
                .andExpect(jsonPath("$.errores.clave").value("Ingresa la contraseña."));
    }

    // ------------------------------------------------------------------ registro

    @Test
    @DisplayName("Registro: 201, PACIENTE activo con U104, datos normalizados y luego puede iniciar sesión")
    void registroCreaPaciente() throws Exception {
        registrar(REGISTRO).andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/usuarios/U104"))
                .andExpect(jsonPath("$.id").value("U104"))
                .andExpect(jsonPath("$.rol").value("PACIENTE"))
                .andExpect(jsonPath("$.activo").value(true))
                .andExpect(jsonPath("$.rut").value("12.345.678-5"))
                .andExpect(jsonPath("$.correo").value("camila.rojas@correo.cl"))
                .andExpect(jsonPath("$.telefono").value("+56 9 5555 1234"))
                .andExpect(jsonPath("$.clave").doesNotExist());
        assertThat(usuarios.findById("U104").orElseThrow().getClave()).startsWith("$2a$");
        login("camila.rojas@correo.cl", "Clave2026!").andExpect(status().isOk());
    }

    @Test
    @DisplayName("Registro: no se puede elegir otro rol (el campo rol se ignora)")
    void registroIgnoraRol() throws Exception {
        registrar(REGISTRO.replace("\"clave\"", "\"rol\":\"ADMIN\",\"clave\"")).andExpect(status().isCreated())
                .andExpect(jsonPath("$.rol").value("PACIENTE"));
    }

    @Test
    @DisplayName("Registro: correo o RUT repetidos → 409 en el campo que choca")
    void registroDuplicado() throws Exception {
        registrar(REGISTRO.replace("Camila.Rojas@Correo.cl", "ADMIN@nutrivida.cl")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.correo").value("Ya existe un usuario con ese correo."));
        registrar(REGISTRO.replace("12345678-5", "19876543-0")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.rut").value("Ya existe un usuario con ese RUT."));
    }

    @Test
    @DisplayName("Registro: RUT con dígito verificador incorrecto, clave débil o teléfono inválido → 400")
    void registroInvalido() throws Exception {
        registrar(REGISTRO.replace("12345678-5", "12345678-9")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.rut").value("El RUT no es válido: revisa el dígito verificador."));
        registrar(REGISTRO.replace("Clave2026!", "clave")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.clave").exists());
        registrar(REGISTRO.replace("+56955551234", "22223333")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.telefono").value("El teléfono debe ser un celular chileno: +56 9 y 8 dígitos."));
    }

    // ------------------------------------------------------------------ /me

    @Test
    @DisplayName("/me: con token devuelve la cuenta leída de la base")
    void meConToken() throws Exception {
        con(paciente(), get("/api/auth/me")).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("U100"))
                .andExpect(jsonPath("$.nombre").value("Javiera"))
                .andExpect(jsonPath("$.activo").value(true));
    }

    @Test
    @DisplayName("/me: sin token → 401; token vencido → 401 con \"Tu sesión expiró\"")
    void meSinTokenOVencido() throws Exception {
        con(null, get("/api/auth/me")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Debes iniciar sesión para continuar."));
        con(vencido(), get("/api/auth/me")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Tu sesión expiró. Inicia sesión nuevamente."));
        con("Bearer abc.def.ghi", get("/api/auth/me")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("La sesión no es válida. Inicia sesión nuevamente."));
    }

    @Test
    @DisplayName("/me: cuenta desactivada después del login → 401 (el frontend cierra la sesión)")
    void meCuentaDesactivada() throws Exception {
        con(token("U103", "PACIENTE", null), get("/api/auth/me")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Tu cuenta está desactivada. Contacta a la clínica."));
    }
}
