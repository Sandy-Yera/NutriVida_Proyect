package cl.duoc.nutrivida.citas.controller;

import cl.duoc.nutrivida.citas.dto.HoraLibre;
import cl.duoc.nutrivida.citas.service.DisponibilidadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Público (Forma D): el asistente de reserva y la agenda rápida del Inicio, sin sesión. */
@RestController
@RequestMapping("/api/disponibilidad")
@Tag(name = "Disponibilidad", description = "Horas libres; público, sin token")
@SecurityRequirements
public class DisponibilidadController {

    private final DisponibilidadService servicio;

    public DisponibilidadController(DisponibilidadService servicio) {
        this.servicio = servicio;
    }

    @Operation(summary = "Horas libres de un nutricionista en una fecha",
            description = "Bloques de 30 min donde cabe completa una cita de 'duracion' minutos. "
                    + "'excluir' es la cita que se está reprogramando: no ocupa su propio horario.")
    @GetMapping
    public List<String> horasLibres(@RequestParam String nutricionistaId, @RequestParam LocalDate fecha,
            @RequestParam(defaultValue = "30") Integer duracion, @RequestParam(required = false) String excluir) {
        return servicio.horasLibres(nutricionistaId, fecha, duracion, excluir);
    }

    @Operation(summary = "Próximas horas libres de toda la clínica",
            description = "Agenda rápida del Inicio: hasta 14 días adelante, entre 1 y 20 horas.")
    @GetMapping("/proximas")
    public List<HoraLibre> proximas(@RequestParam(defaultValue = "6") int cantidad) {
        return servicio.proximas(cantidad);
    }
}
