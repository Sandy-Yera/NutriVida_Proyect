package cl.duoc.nutrivida.clinica.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger en http://localhost:8083/swagger-ui.html. El botón "Authorize" recibe el token
 * (sin la palabra Bearer) y lo envía en cada prueba, igual que el frontend.
 */
@Configuration
@OpenAPIDefinition(
        info = @Info(title = "NutriVida · ms-clinica", version = "1.0",
                description = """
                        Servicios, nutricionistas, fichas, mediciones, planes y contactos (dueña: Catalina).

                        **Público:** GET de /api/servicios y /api/nutricionistas (también la foto).
                        **Con token:** lo demás. Pide el token con POST /api/auth/login en ms-usuarios (8081) \
                        y pégalo en Authorize, sin la palabra Bearer.

                        Roles: ADMIN administra servicios; NUTRICIONISTA escribe solo las fichas a su cargo; \
                        PACIENTE lee su propia ficha; SECRETARIA lee los contactos.

                        Errores con el formato común: timestamp, status, error, mensaje, ruta y errores."""),
        security = @SecurityRequirement(name = "bearer"))
@SecurityScheme(name = "bearer", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT",
        description = "JWT HS256 emitido por ms-usuarios. Claims: sub, rol, nombre, nutricionistaId.")
public class OpenApiConfig {
}
