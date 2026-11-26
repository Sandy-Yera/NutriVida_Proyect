package cl.duoc.nutrivida.clinica.controller;

import cl.duoc.nutrivida.clinica.dto.NutricionistaRespuesta;
import cl.duoc.nutrivida.clinica.model.FotoNutricionista;
import cl.duoc.nutrivida.clinica.service.NutricionistaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Duration;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

    @Operation(summary = "Foto de perfil (público)", description = "La URL con ?v= la entrega fotoUrl.")
    @ApiResponse(responseCode = "404", description = "No tiene foto")
    @GetMapping("/{id}/foto")
    public ResponseEntity<byte[]> foto(@Parameter(example = "NUT001") @PathVariable String id) {
        FotoNutricionista f = servicio.foto(id);
        // Cada versión tiene su propia URL (?v=), así que el navegador la puede guardar un buen rato.
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(f.getTipo()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic())
                .body(f.getDatos());
    }

    @Operation(summary = "Cambiar la foto (el propio nutricionista o el admin)",
            description = "multipart/form-data con la parte \"foto\": JPG, PNG o WebP de hasta 2 MB.")
    @ApiResponse(responseCode = "403", description = "Solo puedes cambiar tu propia foto")
    @ApiResponse(responseCode = "413", description = "Más de 2 MB")
    @ApiResponse(responseCode = "415", description = "No es JPG, PNG ni WebP")
    @PreAuthorize("hasAnyRole('NUTRICIONISTA','ADMIN')")
    @PutMapping(value = "/{id}/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public NutricionistaRespuesta actualizarFoto(@PathVariable String id,
            @RequestParam(value = "foto", required = false) MultipartFile foto) {
        return servicio.actualizarFoto(id, foto);
    }

    @Operation(summary = "Quitar la foto (el propio nutricionista o el admin)")
    @ApiResponse(responseCode = "204", description = "Sin foto: se muestran las iniciales")
    @PreAuthorize("hasAnyRole('NUTRICIONISTA','ADMIN')")
    @DeleteMapping("/{id}/foto")
    public ResponseEntity<Void> eliminarFoto(@PathVariable String id) {
        servicio.eliminarFoto(id);
        return ResponseEntity.noContent().build();
    }
}
