package cl.duoc.nutrivida.usuarios.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger en http://localhost:8081/swagger-ui.html. El botón "Authorize" recibe el token
 * (sin la palabra Bearer) y lo envía en cada prueba, igual que el frontend.
 */
@Configuration
@OpenAPIDefinition(
        info = @Info(title = "NutriVida · ms-usuarios", version = "1.0",
                description = "Identidad, inicio de sesión, emisión del JWT, roles y perfil. Errores con el formato común: timestamp, status, error, mensaje, ruta y errores."),
        security = @SecurityRequirement(name = "bearer"))
@SecurityScheme(name = "bearer", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class OpenApiConfig {
}
