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
                description = """
                        Identidad, inicio de sesión, emisión del JWT, roles y perfil. Errores con el formato común: \
                        timestamp, status, error, mensaje, ruta y errores.

                        **Cómo probar:** 1) POST /api/auth/login con una cuenta demo; 2) copiar el token en \
                        **Authorize** (sin la palabra Bearer); 3) probar los endpoints protegidos.

                        | Rol | Correo | Contraseña |
                        | --- | --- | --- |
                        | ADMIN | admin@nutrivida.cl | Admin2026! |
                        | SECRETARIA | recepcion@nutrivida.cl | Recepcion2026! |
                        | NUTRICIONISTA | cfuentes@nutrivida.cl | Nutri2026! |
                        | PACIENTE | javiera.soto@correo.cl | Paciente2026! |
                        | PACIENTE desactivado (403) | pedro.lagos@correo.cl | Paciente2026! |

                        Credenciales ficticias de las semillas (database/01_usuarios.sql)."""),
        security = @SecurityRequirement(name = "bearer"))
@SecurityScheme(name = "bearer", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class OpenApiConfig {
}
