package cl.duoc.nutrivida.usuarios.controller;

import cl.duoc.nutrivida.usuarios.dto.ActualizarUsuarioSolicitud;
import cl.duoc.nutrivida.usuarios.dto.CambioClaveSolicitud;
import cl.duoc.nutrivida.usuarios.dto.EstadoSolicitud;
import cl.duoc.nutrivida.usuarios.dto.RolSolicitud;
import cl.duoc.nutrivida.usuarios.dto.UsuarioRespuesta;
import cl.duoc.nutrivida.usuarios.dto.UsuarioSolicitud;
import cl.duoc.nutrivida.usuarios.model.Rol;
import cl.duoc.nutrivida.usuarios.service.UsuarioService;
import cl.duoc.nutrivida.usuarios.service.UsuarioService.DatosCuenta;
import cl.duoc.nutrivida.usuarios.config.EjemplosApi;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * G-33. El rol grueso va con @PreAuthorize junto a cada endpoint; las reglas de dueño
 * ("tu propia cuenta") van en UsuarioService.
 */
@RestController
@RequestMapping("/api/usuarios")
@Tag(name = "Usuarios", description = "Cuentas, roles y estado. CRUD completo para ADMIN")
public class UsuarioController {

    private final UsuarioService servicio;

    public UsuarioController(UsuarioService servicio) {
        this.servicio = servicio;
    }

    @Operation(summary = "Buscar usuarios", description = "Filtros opcionales. El nutricionista solo puede pedir rol=PACIENTE.")
    @ApiResponse(responseCode = "200", description = "Lista ordenada por id, sin claves")
    @ApiResponse(responseCode = "403", description = "Paciente, o nutricionista pidiendo otro rol",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "rol", value = EjemplosApi.ERROR_403)))
    @PreAuthorize("hasAnyRole('NUTRICIONISTA','SECRETARIA','ADMIN')")
    @GetMapping
    public List<UsuarioRespuesta> listar(@RequestParam(required = false) Rol rol,
            @RequestParam(required = false) Boolean activo,
            @RequestParam(required = false) String texto) {
        return servicio.listar(rol, activo, texto).stream().map(UsuarioRespuesta::de).toList();
    }

    @Operation(summary = "Una cuenta", description = "La propia (cualquier rol), cualquiera para secretaria y admin, "
            + "pacientes para el nutricionista. ms-citas la usa para saber si la cuenta sigue activa.")
    @ApiResponse(responseCode = "200", description = "Cuenta con id y activo",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "cuenta", value = EjemplosApi.USUARIO)))
    @ApiResponse(responseCode = "403", description = "La cuenta no es tuya")
    @ApiResponse(responseCode = "404", description = "El usuario no existe")
    @GetMapping("/{id}")
    public UsuarioRespuesta obtener(@PathVariable String id) {
        return UsuarioRespuesta.de(servicio.obtener(id));
    }

    @Operation(summary = "Crear un usuario (admin)", description = "Cualquier rol. NUTRICIONISTA exige nutricionistaId.")
    @ApiResponse(responseCode = "201", description = "Creado con el siguiente id (U104…)")
    @ApiResponse(responseCode = "400", description = "Datos inválidos (errores por campo)")
    @ApiResponse(responseCode = "409", description = "Correo, RUT o nutricionista ya usados",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "duplicado", value = EjemplosApi.ERROR_409)))
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<UsuarioRespuesta> crear(@Valid @RequestBody UsuarioSolicitud s) {
        var creado = UsuarioRespuesta.de(servicio.crear(new DatosCuenta(s.nombre(), s.apellido(), s.rut(),
                s.correo(), s.telefono(), s.fechaNacimiento(), s.clave(), Rol.valueOf(s.rol()), s.nutricionistaId(),
                s.activo() == null || s.activo())));
        return ResponseEntity.created(URI.create("/api/usuarios/" + creado.id())).body(creado);
    }

    @Operation(summary = "Editar una cuenta", description = "Admin: todo, menos su propio rol y estado. "
            + "Otros roles: solo nombre, apellido y teléfono de su cuenta. Campo ausente = sin cambio.")
    @ApiResponse(responseCode = "200", description = "Cuenta actualizada")
    @ApiResponse(responseCode = "403", description = "Cuenta ajena o campo reservado al admin")
    @ApiResponse(responseCode = "409", description = "Correo o RUT ya usados por otra cuenta")
    @PatchMapping("/{id}")
    public UsuarioRespuesta actualizar(@PathVariable String id, @Valid @RequestBody ActualizarUsuarioSolicitud cambios) {
        return UsuarioRespuesta.de(servicio.actualizar(id, cambios));
    }

    @Operation(summary = "Activar o desactivar (admin)", description = "Una cuenta desactivada no puede iniciar sesión "
            + "y pierde el acceso en ms-citas aunque su token siga vigente.")
    @ApiResponse(responseCode = "403", description = "No puedes desactivar tu propia cuenta")
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/estado")
    public UsuarioRespuesta cambiarEstado(@PathVariable String id, @Valid @RequestBody EstadoSolicitud s) {
        return UsuarioRespuesta.de(servicio.cambiarEstado(id, s.activo()));
    }

    @Operation(summary = "Cambiar el rol (admin)")
    @ApiResponse(responseCode = "403", description = "No puedes cambiar tu propio rol")
    @ApiResponse(responseCode = "409", description = "Ese nutricionista ya está vinculado a otra cuenta")
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/rol")
    public UsuarioRespuesta cambiarRol(@PathVariable String id, @Valid @RequestBody RolSolicitud s) {
        return UsuarioRespuesta.de(servicio.cambiarRol(id, Rol.valueOf(s.rol()), s.nutricionistaId()));
    }

    @Operation(summary = "Cambiar mi contraseña", description = "Solo el propio usuario y con su contraseña actual.")
    @ApiResponse(responseCode = "400", description = "La contraseña actual no es correcta, o la nueva es débil")
    @ApiResponse(responseCode = "403", description = "No es tu cuenta")
    @PutMapping("/{id}/clave")
    public UsuarioRespuesta cambiarClave(@PathVariable String id, @Valid @RequestBody CambioClaveSolicitud s) {
        return UsuarioRespuesta.de(servicio.cambiarClave(id, s.claveActual(), s.claveNueva()));
    }

    @Operation(summary = "Eliminar una cuenta desactivada (admin)",
            description = "Las cuentas con historial se desactivan; solo se borra una que ya está desactivada.")
    @ApiResponse(responseCode = "204", description = "Eliminada")
    @ApiResponse(responseCode = "403", description = "No puedes eliminar tu propia cuenta")
    @ApiResponse(responseCode = "409", description = "Desactiva la cuenta antes de eliminarla")
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        servicio.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
