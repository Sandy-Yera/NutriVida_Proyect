package cl.duoc.nutrivida.citas.controller;

import cl.duoc.nutrivida.citas.dto.PagoRespuesta;
import cl.duoc.nutrivida.citas.service.PagoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Comprobantes. Los pagos se crean solo con POST /api/citas (pago y cita en una transacción). */
@RestController
@RequestMapping("/api/pagos")
@Tag(name = "Pagos", description = "Comprobantes de pago simulado (solo los 4 últimos dígitos)")
public class PagoController {

    private final PagoService servicio;

    public PagoController(PagoService servicio) {
        this.servicio = servicio;
    }

    @Operation(summary = "Comprobante", description = "Quien pagó o el admin.")
    @GetMapping("/{id}")
    public PagoRespuesta obtener(@PathVariable String id) {
        return servicio.obtener(id);
    }

    @Operation(summary = "Pagos (admin)", description = "Todos, o solo los de las citas indicadas: ?citaIds=C0001,C0002")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public List<PagoRespuesta> listar(@RequestParam(required = false) List<String> citaIds) {
        return servicio.listar(citaIds);
    }
}
