package cl.duoc.nutrivida.clinica.controller;

import cl.duoc.nutrivida.clinica.dto.NutricionistaRespuesta;
import cl.duoc.nutrivida.clinica.service.NutricionistaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Equipo de nutricionistas. ms-citas lee id, dias, horaInicio y horaFin para la agenda. */
@RestController
@RequestMapping("/api/nutricionistas")
@Tag(name = "Nutricionistas", description = "Equipo, jornada y foto de perfil")
public class NutricionistaController {

    private final NutricionistaService servicio;

    public NutricionistaController(NutricionistaService servicio) {
        this.servicio = servicio;
    }

    @Operation(summary = "Listar nutricionistas (público)", description = "dias: 0 = domingo … 6 = sábado. Horas en HH:mm.")
    @GetMapping
    public List<NutricionistaRespuesta> listar() {
        return servicio.listar();
    }

    @Operation(summary = "Un nutricionista (público)")
    @ApiResponse(responseCode = "404", description = "El nutricionista no existe")
    @GetMapping("/{id}")
    public NutricionistaRespuesta obtener(@Parameter(example = "NUT001") @PathVariable String id) {
        return servicio.obtener(id);
    }
}
