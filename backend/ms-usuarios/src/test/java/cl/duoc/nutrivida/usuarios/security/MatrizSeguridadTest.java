package cl.duoc.nutrivida.usuarios.security;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import cl.duoc.nutrivida.usuarios.ApoyoApi;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * G-34: matriz 401/403/200/201 de ms-usuarios, al estilo de SecurityFlowTest de DoggySpa, pero con
 * el JwtFiltro y el @PreAuthorize reales. Cada fila: quién llama, a qué endpoint y qué responde.
 */
@SpringBootTest
class MatrizSeguridadTest extends ApoyoApi {

    static final String NUEVO = """
            {"nombre":"Ignacio","apellido":"Vera","rut":"11.111.111-1","correo":"ivera@nutrivida.cl",
             "telefono":"+56 9 1111 0020","rol":"SECRETARIA","clave":"Clave2026!"}""";

    String tokenDe(String quien) {
        return switch (quien) {
            case "ANONIMO" -> null;
            case "VENCIDO" -> vencido();
            case "PACIENTE" -> paciente();
            case "NUTRICIONISTA" -> nutricionista();
            case "SECRETARIA" -> secretaria();
            case "ADMIN" -> admin();
            default -> throw new IllegalArgumentException(quien);
        };
    }

    MockHttpServletRequestBuilder peticion(String metodo, String ruta, String cuerpo) {
        var p = request(HttpMethod.valueOf(metodo), ruta);
        if (!cuerpo.isEmpty()) p.contentType(MediaType.APPLICATION_JSON).content(cuerpo);
        return p;
    }

    @ParameterizedTest(name = "{0} {1} {2} como {3} → {4}")
    @CsvSource(delimiter = '|', textBlock = """
            # metodo | ruta                        | cuerpo   | quien         | status
            GET      | /api/usuarios               |          | ANONIMO       | 401
            GET      | /api/usuarios               |          | VENCIDO       | 401
            GET      | /api/usuarios               |          | PACIENTE      | 403
            GET      | /api/usuarios               |          | SECRETARIA    | 200
            GET      | /api/usuarios               |          | ADMIN         | 200
            GET      | /api/usuarios?rol=PACIENTE  |          | NUTRICIONISTA | 200
            GET      | /api/usuarios/U100          |          | ANONIMO       | 401
            GET      | /api/usuarios/U100          |          | PACIENTE      | 200
            GET      | /api/usuarios/U101          |          | PACIENTE      | 403
            GET      | /api/usuarios/U101          |          | SECRETARIA    | 200
            POST     | /api/usuarios               | NUEVO    | ANONIMO       | 401
            POST     | /api/usuarios               | NUEVO    | PACIENTE      | 403
            POST     | /api/usuarios               | NUEVO    | SECRETARIA    | 403
            POST     | /api/usuarios               | NUEVO    | NUTRICIONISTA | 403
            POST     | /api/usuarios               | NUEVO    | ADMIN         | 201
            PATCH    | /api/usuarios/U101/estado   | ESTADO   | SECRETARIA    | 403
            PATCH    | /api/usuarios/U101/estado   | ESTADO   | ADMIN         | 200
            PATCH    | /api/usuarios/U101/rol      | ROL      | PACIENTE      | 403
            PATCH    | /api/usuarios/U101/rol      | ROL      | ADMIN         | 200
            DELETE   | /api/usuarios/U103          |          | ANONIMO       | 401
            DELETE   | /api/usuarios/U103          |          | SECRETARIA    | 403
            DELETE   | /api/usuarios/U103          |          | ADMIN         | 204
            GET      | /api/auth/me                |          | ANONIMO       | 401
            GET      | /api/auth/me                |          | VENCIDO       | 401
            GET      | /api/auth/me                |          | NUTRICIONISTA | 200
            POST     | /api/auth/login             | LOGIN    | ANONIMO       | 200
            POST     | /api/auth/registro          | REGISTRO | ANONIMO       | 201
            GET      | /api/articulos              |          | ANONIMO       | 200
            """)
    void matriz(String metodo, String ruta, String cuerpo, String quien, int esperado) throws Exception {
        String json = switch (cuerpo == null ? "" : cuerpo) {
            case "NUEVO" -> NUEVO;
            case "ESTADO" -> "{\"activo\":false}";
            case "ROL" -> "{\"rol\":\"SECRETARIA\"}";
            case "LOGIN" -> "{\"correo\":\"admin@nutrivida.cl\",\"clave\":\"Admin2026!\"}";
            case "REGISTRO" -> NUEVO.replace(",\"rol\":\"SECRETARIA\"", "").replace("\"telefono\"", "\"fechaNacimiento\":\"1995-01-01\",\"telefono\"");
            default -> "";
        };
        con(tokenDe(quien), peticion(metodo, ruta, json)).andExpect(status().is(esperado));
    }

    @Test
    @DisplayName("El 401 del filtro sale con el formato común (aunque ningún controlador lo vio)")
    void formato401() throws Exception {
        con(null, peticion("GET", "/api/usuarios", "")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.timestamp").value(matchesPattern("\\d{4}-\\d{2}-\\d{2}T.*Z")))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.mensaje").value("Debes iniciar sesión para continuar."))
                .andExpect(jsonPath("$.ruta").value("/api/usuarios"))
                .andExpect(jsonPath("$.errores").doesNotExist());
    }

    @Test
    @DisplayName("El 403 de @PreAuthorize sale con el formato común")
    void formato403() throws Exception {
        con(paciente(), peticion("POST", "/api/usuarios", NUEVO)).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.mensaje").value("No tienes permiso para hacer esto."))
                .andExpect(jsonPath("$.ruta").value("/api/usuarios"));
    }

    @Test
    @DisplayName("JSON mal formado → 400 y método no soportado → 405, ambos con el formato común")
    void otrosErrores() throws Exception {
        con(admin(), request(HttpMethod.POST, "/api/usuarios").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("El cuerpo de la petición no es un JSON válido."));
        con(admin(), peticion("PUT", "/api/usuarios", "")).andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405));
    }
}
