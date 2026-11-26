package cl.duoc.nutrivida.clinica.controller;

import cl.duoc.nutrivida.clinica.dto.FichaRespuesta;
import cl.duoc.nutrivida.clinica.dto.FichaSolicitud;
import cl.duoc.nutrivida.clinica.dto.MedicionRespuesta;
import cl.duoc.nutrivida.clinica.dto.MedicionSolicitud;
import cl.duoc.nutrivida.clinica.dto.PlanRespuesta;
import cl.duoc.nutrivida.clinica.dto.PlanSolicitud;
import cl.duoc.nutrivida.clinica.service.FichaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Pacientes de la clínica: ficha, mediciones y plan. El rol grueso va aquí; quién es dueño de
 * cada ficha (a cargo, el propio paciente) se revisa en FichaService con el usuario del token.
 */
@RestController
@RequestMapping("/api/pacientes")
@Tag(name = "Pacientes", description = "Ficha clínica, mediciones y plan alimentario")
public class PacienteController {

    private final FichaService servicio;

    public PacienteController(FichaService servicio) {
        this.servicio = servicio;
    }

    @Operation(summary = "Mis pacientes (nutricionista) o todos (admin)",
            description = "El nutricionista solo puede pedir su propio nutricionistaId (o no enviarlo).")
    @ApiResponse(responseCode = "403", description = "Pacientes de otro nutricionista, o un rol sin acceso")
    @PreAuthorize("hasAnyRole('NUTRICIONISTA','ADMIN')")
    @GetMapping
    public List<FichaRespuesta> listar(@Parameter(example = "NUT001") @RequestParam(required = false) String nutricionistaId) {
        return servicio.listar(nutricionistaId);
    }

    @Operation(summary = "Ficha de un paciente",
            description = "A cargo, admin o el propio paciente: completa. Otro nutricionista: solo { id, nutricionistaId }.")
    @ApiResponse(responseCode = "403", description = "Secretaria, o un paciente que pide otra ficha")
    @ApiResponse(responseCode = "404", description = "El paciente no tiene ficha")
    @GetMapping("/{pacienteId}")
    public FichaRespuesta obtener(@Parameter(example = "U100") @PathVariable String pacienteId) {
        return servicio.obtener(pacienteId);
    }

    @Operation(summary = "Crear ficha (nutricionista)", description = "Queda a cargo del nutricionista del token.")
    @ApiResponse(responseCode = "201", description = "Ficha creada")
    @ApiResponse(responseCode = "400", description = "Falta el paciente, el objetivo o los antecedentes")
    @ApiResponse(responseCode = "403", description = "nutricionistaId distinto al del token")
    @ApiResponse(responseCode = "409", description = "El paciente ya tiene ficha")
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @PostMapping
    public ResponseEntity<FichaRespuesta> crear(@RequestBody FichaSolicitud solicitud) {
        FichaRespuesta ficha = servicio.crear(solicitud);
        return ResponseEntity.created(URI.create("/api/pacientes/" + ficha.id())).body(ficha);
    }

    @Operation(summary = "Mediciones del paciente", description = "A cargo, admin o el propio paciente. En orden de fecha.")
    @ApiResponse(responseCode = "403", description = "No tienes acceso a la ficha de este paciente")
    @GetMapping("/{pacienteId}/mediciones")
    public List<MedicionRespuesta> mediciones(@Parameter(example = "U100") @PathVariable String pacienteId) {
        return servicio.listarMediciones(pacienteId);
    }

    @Operation(summary = "Registrar una medición (nutricionista a cargo)")
    @ApiResponse(responseCode = "201", description = "Medición guardada")
    @ApiResponse(responseCode = "400", description = "Datos fuera de rango o fecha futura (errores por campo)")
    @ApiResponse(responseCode = "403", description = "Solo el nutricionista a cargo")
    @ApiResponse(responseCode = "404", description = "El paciente no tiene ficha")
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @PostMapping("/{pacienteId}/mediciones")
    public ResponseEntity<MedicionRespuesta> registrarMedicion(@Parameter(example = "U100") @PathVariable String pacienteId,
            @RequestBody MedicionSolicitud solicitud) {
        MedicionRespuesta m = servicio.registrarMedicion(pacienteId, solicitud);
        return ResponseEntity.created(URI.create("/api/pacientes/" + pacienteId + "/mediciones")).body(m);
    }

    @Operation(summary = "Plan vigente del paciente", description = "A cargo, admin o el propio paciente.")
    @ApiResponse(responseCode = "404", description = "El paciente aún no tiene plan")
    @GetMapping("/{pacienteId}/plan")
    public PlanRespuesta plan(@Parameter(example = "U100") @PathVariable String pacienteId) {
        return servicio.planVigente(pacienteId);
    }

    @Operation(summary = "Guardar el plan (nutricionista a cargo)",
            description = "Sin id crea un plan nuevo, vigente desde hoy; con el id de uno del paciente lo corrige.")
    @ApiResponse(responseCode = "400", description = "Faltan comidas, objetivo o kcal fuera de 800-5000")
    @ApiResponse(responseCode = "403", description = "Solo el nutricionista a cargo")
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @PutMapping("/{pacienteId}/plan")
    public PlanRespuesta guardarPlan(@Parameter(example = "U100") @PathVariable String pacienteId,
            @RequestBody PlanSolicitud solicitud) {
        return servicio.guardarPlan(pacienteId, solicitud);
    }
}
