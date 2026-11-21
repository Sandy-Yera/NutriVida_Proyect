package cl.duoc.nutrivida.clinica.controller;

import cl.duoc.nutrivida.clinica.dto.ServicioRespuesta;
import cl.duoc.nutrivida.clinica.service.ServicioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Catálogo de servicios. Los GET son públicos (SecurityConfig); el rol fino va con @PreAuthorize. */
@RestController
@RequestMapping("/api/servicios")
@Tag(name = "Servicios", description = "Catálogo de consultas, planes, evaluaciones y talleres")
public class ServicioController {

    private final ServicioService servicio;

    public ServicioController(ServicioService servicio) {
        this.servicio = servicio;
    }

    @Operation(summary = "Listar servicios (público)",
            description = "Lista completa, sin paginar (la usa ms-citas). Con soloActivos=false también los desactivados: solo ADMIN.")
    @ApiResponse(responseCode = "200", description = "Servicios en el orden del catálogo")
    @ApiResponse(responseCode = "403", description = "soloActivos=false sin ser ADMIN")
    @GetMapping
    public List<ServicioRespuesta> listar(
            @Parameter(example = "CONSULTA") @RequestParam(required = false) String tipo,
            @Parameter(example = "nutricion") @RequestParam(required = false) String texto,
            @RequestParam(defaultValue = "true") boolean soloActivos) {
        return servicio.listar(tipo, texto, soloActivos);
    }

    @Operation(summary = "Un servicio (público)")
    @ApiResponse(responseCode = "404", description = "El servicio no existe")
    @GetMapping("/{codigo}")
    public ServicioRespuesta obtener(@Parameter(example = "CN001") @PathVariable String codigo) {
        return servicio.obtener(codigo);
    }
}
