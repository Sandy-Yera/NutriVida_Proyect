package cl.duoc.nutrivida.usuarios.controller;

import cl.duoc.nutrivida.usuarios.dto.ArticuloRespuesta;
import cl.duoc.nutrivida.usuarios.service.ArticuloService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** GET públicos (SecurityConfig.GET_PUBLICAS): la página Consejos no exige sesión. */
@RestController
@RequestMapping("/api/articulos")
@Tag(name = "Consejos", description = "Artículos nutricionales públicos (RF-ACC-09)")
@SecurityRequirements
public class ArticuloController {

    private final ArticuloService servicio;

    public ArticuloController(ArticuloService servicio) {
        this.servicio = servicio;
    }

    @Operation(summary = "Consejos", description = "Del más reciente al más antiguo.")
    @GetMapping
    public List<ArticuloRespuesta> listar() {
        return servicio.listar();
    }

    @Operation(summary = "Un consejo")
    @ApiResponse(responseCode = "404", description = "El consejo no existe")
    @GetMapping("/{id}")
    public ArticuloRespuesta obtener(@PathVariable String id) {
        return servicio.obtener(id);
    }
}
