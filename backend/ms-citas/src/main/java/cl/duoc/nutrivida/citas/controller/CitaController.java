package cl.duoc.nutrivida.citas.controller;

import cl.duoc.nutrivida.citas.dto.CambioEstadoSolicitud;
import cl.duoc.nutrivida.citas.dto.CitaRespuesta;
import cl.duoc.nutrivida.citas.dto.CrearCitaSolicitud;
import cl.duoc.nutrivida.citas.dto.Estadisticas;
import cl.duoc.nutrivida.citas.dto.ReprogramarSolicitud;
import cl.duoc.nutrivida.citas.model.EstadoCita;
import cl.duoc.nutrivida.citas.service.CitaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Contrato §6. El rol grueso va aquí con @PreAuthorize (a la vista junto al endpoint); las
 * reglas de dueño y de negocio, en CitaService. El controlador no decide nada más.
 */
@RestController
@RequestMapping("/api/citas")
@Tag(name = "Citas", description = "Reserva con pago, agenda, cambios de estado y estadísticas")
public class CitaController {

    private final CitaService servicio;

    public CitaController(CitaService servicio) {
        this.servicio = servicio;
    }

    @Operation(summary = "Agendar y pagar en una sola transacción",
            description = "El paciente sale del token. Tarjeta aprobada: 4242 4242 4242 4242; rechazada: 4000 0000 0000 0002.")
    @ApiResponse(responseCode = "201", description = "Cita creada en PENDIENTE con su pago APROBADO")
    @ApiResponse(responseCode = "400", description = "Datos de la cita o de la tarjeta inválidos (errores por campo)")
    @ApiResponse(responseCode = "402", description = "El banco rechazó la tarjeta: el pago RECHAZADO queda guardado y la cita no se crea")
    @ApiResponse(responseCode = "409", description = "La hora ya no está libre, o teleconsulta sin atención presencial previa")
    @PreAuthorize("hasRole('PACIENTE')")
    @PostMapping
    public ResponseEntity<CitaRespuesta> crear(@Valid @RequestBody CrearCitaSolicitud solicitud) {
        CitaRespuesta cita = servicio.crear(solicitud);
        return ResponseEntity.created(URI.create("/api/citas/" + cita.id())).body(cita);
    }

    @Operation(summary = "Mis citas (paciente)")
    @PreAuthorize("hasRole('PACIENTE')")
    @GetMapping("/mias")
    public List<CitaRespuesta> mias() {
        return servicio.mias();
    }

    @Operation(summary = "Mi agenda (nutricionista)", description = "Solo las citas del nutricionistaId del token. Sin fechas, todas.")
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @GetMapping("/agenda")
    public List<CitaRespuesta> agenda(@RequestParam(required = false) LocalDate desde,
            @RequestParam(required = false) LocalDate hasta) {
        return servicio.agenda(desde, hasta);
    }

    @Operation(summary = "Buscar citas (secretaria y admin)", description = "Todos los filtros son opcionales.")
    @PreAuthorize("hasAnyRole('SECRETARIA','ADMIN')")
    @GetMapping
    public List<CitaRespuesta> listar(@RequestParam(required = false) String pacienteId,
            @RequestParam(required = false) String nutricionistaId,
            @RequestParam(required = false) EstadoCita estado,
            @RequestParam(required = false) LocalDate desde,
            @RequestParam(required = false) LocalDate hasta) {
        return servicio.listar(pacienteId, nutricionistaId, estado, desde, hasta);
    }

    @Operation(summary = "Estadísticas del período (admin, RN-27)")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/estadisticas")
    public Estadisticas estadisticas(@RequestParam LocalDate desde, @RequestParam LocalDate hasta) {
        return servicio.estadisticas(desde, hasta);
    }

    @Operation(summary = "Una cita", description = "El paciente dueño, el nutricionista que la atiende, secretaria o admin.")
    @ApiResponse(responseCode = "403", description = "La cita no es tuya")
    @ApiResponse(responseCode = "404", description = "La cita no existe")
    @GetMapping("/{id}")
    public CitaRespuesta obtener(@PathVariable String id) {
        return servicio.obtener(id);
    }

    @Operation(summary = "Cambiar el estado (RN-02 a RN-08, RN-24 a RN-26)",
            description = "PACIENTE: CANCELADA con más de 24 h. NUTRICIONISTA: ATENDIDA o INASISTENCIA. "
                    + "SECRETARIA: CONFIRMADA, CANCELADA o INASISTENCIA. ADMIN: todas. Al cancelar, el pago pasa a REEMBOLSADO.")
    @ApiResponse(responseCode = "403", description = "La cita no es tuya o tu rol no puede hacer ese cambio")
    @ApiResponse(responseCode = "409", description = "Transición no permitida, o menos de 24 h para el paciente")
    @PatchMapping("/{id}/estado")
    public CitaRespuesta cambiarEstado(@PathVariable String id, @Valid @RequestBody CambioEstadoSolicitud solicitud) {
        return servicio.cambiarEstado(id, solicitud.estado());
    }

    @Operation(summary = "Reprogramar (RN-05)", description = "La cita vuelve a PENDIENTE. El paciente, solo con más de 24 h.")
    @ApiResponse(responseCode = "409", description = "Hora no libre, cita ya terminada o menos de 24 h")
    @PreAuthorize("hasAnyRole('PACIENTE','SECRETARIA','ADMIN')")
    @PatchMapping("/{id}/reprogramar")
    public CitaRespuesta reprogramar(@PathVariable String id, @Valid @RequestBody ReprogramarSolicitud solicitud) {
        return servicio.reprogramar(id, solicitud.fecha(), solicitud.hora());
    }

    @Operation(summary = "Eliminar una cita cancelada (admin, contrato §6.1)", description = "El pago se conserva como registro.")
    @ApiResponse(responseCode = "204", description = "Eliminada junto con su historial y recordatorios")
    @ApiResponse(responseCode = "409", description = "Solo se puede eliminar una cita cancelada")
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        servicio.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
