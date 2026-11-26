package cl.duoc.nutrivida.clinica.controller;

import cl.duoc.nutrivida.clinica.dto.ContactoRespuesta;
import cl.duoc.nutrivida.clinica.dto.ContactoSolicitud;
import cl.duoc.nutrivida.clinica.service.ContactoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Formulario de contacto. El POST es para cualquier visitante: mientras SecurityConfig no lo
 * declare público (tarea de integración), pide token.
 */
@RestController
@RequestMapping("/api/contactos")
@Tag(name = "Contactos", description = "Mensajes del formulario de contacto")
public class ContactoController {

    private final ContactoService servicio;

    public ContactoController(ContactoService servicio) {
        this.servicio = servicio;
    }

    @Operation(summary = "Enviar un mensaje", description = "Teléfono opcional: celular chileno +56 9 y 8 dígitos.")
    @ApiResponse(responseCode = "201", description = "Mensaje guardado")
    @ApiResponse(responseCode = "400", description = "Datos inválidos (errores por campo, mismos mensajes de EP2)")
    @PostMapping
    public ResponseEntity<ContactoRespuesta> registrar(@RequestBody ContactoSolicitud solicitud) {
        ContactoRespuesta c = servicio.registrar(solicitud);
        return ResponseEntity.created(URI.create("/api/contactos/" + c.id())).body(c);
    }

    @Operation(summary = "Bandeja de mensajes (admin y secretaria)")
    @PreAuthorize("hasAnyRole('ADMIN','SECRETARIA')")
    @GetMapping
    public List<ContactoRespuesta> listar() {
        return servicio.listar();
    }

    @Operation(summary = "Eliminar un mensaje atendido (admin)")
    @ApiResponse(responseCode = "204", description = "Eliminado")
    @ApiResponse(responseCode = "404", description = "El mensaje no existe")
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@Parameter(example = "CT001") @PathVariable String id) {
        servicio.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
