package cl.duoc.nutrivida.clinica.controller;

import cl.duoc.nutrivida.clinica.dto.EstadoSolicitud;
import cl.duoc.nutrivida.clinica.dto.ServicioRespuesta;
import cl.duoc.nutrivida.clinica.dto.ServicioSolicitud;
import cl.duoc.nutrivida.clinica.service.ServicioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Catálogo de servicios. Los GET son públicos (SecurityConfig); crear, editar y desactivar son
 * del ADMIN. El controlador no decide nada más: las reglas están en ServicioService.
 */
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

    @Operation(summary = "Crear un servicio (admin)", description = "El código va en mayúsculas: 2 letras y 3 números.")
    @ApiResponse(responseCode = "201", description = "Servicio creado y activo")
    @ApiResponse(responseCode = "400", description = "Datos inválidos (errores por campo, mismos mensajes de EP2)")
    @ApiResponse(responseCode = "409", description = "Ya existe un servicio con ese código")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ServicioRespuesta> crear(@RequestBody ServicioSolicitud solicitud) {
        ServicioRespuesta creado = servicio.crear(solicitud);
        return ResponseEntity.created(URI.create("/api/servicios/" + creado.codigo())).body(creado);
    }

    @Operation(summary = "Editar un servicio (admin)", description = "Solo cambia lo que viene; el código no se edita.")
    @ApiResponse(responseCode = "400", description = "El resultado no es válido")
    @ApiResponse(responseCode = "404", description = "El servicio no existe")
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{codigo}")
    public ServicioRespuesta actualizar(@Parameter(example = "CN002") @PathVariable String codigo,
            @RequestBody ServicioSolicitud cambios) {
        return servicio.actualizar(codigo, cambios);
    }

    @Operation(summary = "Activar o desactivar (admin)",
            description = "No hay DELETE: las citas guardan el código. Desactivado, sale del catálogo y de Solicitar cita.")
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{codigo}/estado")
    public ServicioRespuesta cambiarEstado(@Parameter(example = "TG002") @PathVariable String codigo,
            @Valid @RequestBody EstadoSolicitud solicitud) {
        return servicio.cambiarEstado(codigo, solicitud.activo());
    }
}
