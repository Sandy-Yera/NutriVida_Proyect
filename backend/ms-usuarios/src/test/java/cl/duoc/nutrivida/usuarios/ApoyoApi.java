package cl.duoc.nutrivida.usuarios;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import cl.duoc.nutrivida.usuarios.config.SemillasH2;
import cl.duoc.nutrivida.usuarios.security.JwtService;
import cl.duoc.nutrivida.usuarios.security.UsuarioAutenticado;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * Base de las pruebas de la API: H2 con las semillas de EP2 recargadas antes de cada caso y
 * tokens firmados con el JwtService real (mismas reglas que en producción).
 */
public abstract class ApoyoApi {

    @Autowired protected WebApplicationContext contexto;
    @Autowired protected JwtService jwt;
    @Autowired protected SemillasH2 semillas;
    @Value("${nutrivida.jwt.secreto}") protected String secreto;

    protected MockMvc mvc;

    @BeforeEach
    void prepararApi() {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity()).build();
        semillas.cargar();
    }

    protected String token(String id, String rol, String nutricionistaId) {
        return "Bearer " + jwt.generar(new UsuarioAutenticado(id, rol, id, nutricionistaId));
    }

    protected String admin() { return token("U001", "ADMIN", null); }
    protected String secretaria() { return token("U002", "SECRETARIA", null); }
    protected String nutricionista() { return token("U010", "NUTRICIONISTA", "NUT001"); }
    protected String paciente() { return token("U100", "PACIENTE", null); }

    /** Firmado con el secreto real pero vencido hace una hora. */
    protected String vencido() {
        return "Bearer " + new JwtService(secreto, -1).generar(new UsuarioAutenticado("U100", "PACIENTE", "Javiera", null));
    }

    protected ResultActions con(String token, MockHttpServletRequestBuilder peticion) throws Exception {
        if (token != null) peticion.header("Authorization", token);
        return mvc.perform(peticion);
    }
}
