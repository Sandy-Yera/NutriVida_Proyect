package cl.duoc.nutrivida.usuarios.config;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import cl.duoc.nutrivida.usuarios.ApoyoApi;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/** G-34: Swagger es público, tiene el esquema bearer (Authorize) y los ejemplos de login. */
@SpringBootTest
class SwaggerTest extends ApoyoApi {

    @Test
    @DisplayName("/v3/api-docs sin token: esquema bearer, login público y ejemplos")
    void documentacion() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andExpect(jsonPath("$.components.securitySchemes.bearer.scheme").value("bearer"))
                .andExpect(jsonPath("$.paths['/api/auth/login'].post.security").isEmpty())
                .andExpect(jsonPath("$.paths['/api/usuarios/{id}'].get").exists())
                .andExpect(content().string(containsString("Correo o contraseña incorrectos.")))
                .andExpect(content().string(containsString("admin@nutrivida.cl")));
    }
}
