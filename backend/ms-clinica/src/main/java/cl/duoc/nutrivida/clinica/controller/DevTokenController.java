package cl.duoc.nutrivida.clinica.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import cl.duoc.nutrivida.clinica.security.JwtService;
import cl.duoc.nutrivida.clinica.security.UsuarioAutenticado;

/**
 * SOLO perfil "dev". Genera un token firmado con el mismo JWT_SECRET para probar este
 * microservicio con reglas y roles reales mientras ms-usuarios no está listo.
 * Sin el perfil "dev" esta ruta no existe (404).
 */
@Profile("dev")
@RestController
@RequestMapping("/api/dev")
@Tag(name = "Desarrollo", description = "Solo perfil dev: tokens de prueba")
public class DevTokenController {

    private final JwtService jwtService;

    public DevTokenController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    public record SolicitudToken(
            @NotBlank String id,
            @NotBlank @Pattern(regexp = "ADMIN|SECRETARIA|NUTRICIONISTA|PACIENTE") String rol,
            String nombre,
            String nutricionistaId) {
    }

    @Operation(summary = "Token de prueba", description = "Ejemplo: {\"id\":\"U102\",\"rol\":\"PACIENTE\",\"nombre\":\"Ana\"}")
    @PostMapping("/token")
    public Map<String, String> token(@Valid @RequestBody SolicitudToken s) {
        var usuario = new UsuarioAutenticado(s.id(), s.rol(), s.nombre() == null ? s.id() : s.nombre(), s.nutricionistaId());
        return Map.of("token", jwtService.generar(usuario));
    }
}
