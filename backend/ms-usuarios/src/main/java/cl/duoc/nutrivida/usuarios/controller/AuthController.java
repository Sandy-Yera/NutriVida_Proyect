package cl.duoc.nutrivida.usuarios.controller;

import cl.duoc.nutrivida.usuarios.dto.LoginRespuesta;
import cl.duoc.nutrivida.usuarios.dto.LoginSolicitud;
import cl.duoc.nutrivida.usuarios.dto.RegistroSolicitud;
import cl.duoc.nutrivida.usuarios.dto.UsuarioRespuesta;
import cl.duoc.nutrivida.usuarios.service.AuthService;
import cl.duoc.nutrivida.usuarios.service.UsuarioService;
import cl.duoc.nutrivida.usuarios.service.UsuarioService.DatosCuenta;
import cl.duoc.nutrivida.usuarios.config.EjemplosApi;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** G-32. Login y registro son públicos (contrato §3); /me exige token. */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticación", description = "Login con JWT, registro de pacientes y sesión actual")
public class AuthController {

    private final AuthService auth;
    private final UsuarioService usuarios;

    public AuthController(AuthService auth, UsuarioService usuarios) {
        this.auth = auth;
        this.usuarios = usuarios;
    }

    @Operation(summary = "Iniciar sesión",
            description = "Devuelve el JWT (8 h) con los claims sub, rol, nombre y nutricionistaId. "
                    + "Copia el token en Authorize (sin la palabra Bearer).")
    @ApiResponse(responseCode = "200", description = "Token y datos de la cuenta",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "paciente", value = EjemplosApi.LOGIN_OK)))
    @ApiResponse(responseCode = "400", description = "Falta el correo o la contraseña")
    @ApiResponse(responseCode = "401", description = "Correo o contraseña incorrectos",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "credenciales", value = EjemplosApi.ERROR_401)))
    @ApiResponse(responseCode = "403", description = "La cuenta está desactivada")
    @SecurityRequirements
    @PostMapping("/login")
    public LoginRespuesta login(@Valid @RequestBody LoginSolicitud solicitud) {
        return auth.login(solicitud);
    }

    @Operation(summary = "Registrarse como paciente (RF-ACC-01)", description = "Siempre crea un PACIENTE activo.")
    @ApiResponse(responseCode = "201", description = "Cuenta creada")
    @ApiResponse(responseCode = "400", description = "Datos inválidos (errores por campo)",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "campos", value = EjemplosApi.ERROR_400)))
    @ApiResponse(responseCode = "409", description = "El correo o el RUT ya existen",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "duplicado", value = EjemplosApi.ERROR_409)))
    @SecurityRequirements
    @PostMapping("/registro")
    public ResponseEntity<UsuarioRespuesta> registro(@Valid @RequestBody RegistroSolicitud s) {
        var creado = UsuarioRespuesta.de(usuarios.registrarPaciente(new DatosCuenta(s.nombre(), s.apellido(),
                s.rut(), s.correo(), s.telefono(), s.fechaNacimiento(), s.clave(), null, null, true)));
        return ResponseEntity.created(URI.create("/api/usuarios/" + creado.id())).body(creado);
    }

    @Operation(summary = "Mi cuenta", description = "La cuenta del token, leída de la base. El frontend la usa al recargar (F5).")
    @ApiResponse(responseCode = "200", description = "Cuenta activa",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "cuenta", value = EjemplosApi.USUARIO)))
    @ApiResponse(responseCode = "401", description = "Sin token, token vencido o cuenta desactivada")
    @GetMapping("/me")
    public UsuarioRespuesta me() {
        return auth.yo();
    }
}
