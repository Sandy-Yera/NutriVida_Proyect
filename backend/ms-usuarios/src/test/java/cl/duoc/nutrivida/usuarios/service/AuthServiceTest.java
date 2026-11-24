package cl.duoc.nutrivida.usuarios.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import cl.duoc.nutrivida.usuarios.dto.LoginRespuesta;
import cl.duoc.nutrivida.usuarios.dto.LoginSolicitud;
import cl.duoc.nutrivida.usuarios.exception.ApiException;
import cl.duoc.nutrivida.usuarios.model.Rol;
import cl.duoc.nutrivida.usuarios.model.Usuario;
import cl.duoc.nutrivida.usuarios.repository.UsuarioRepository;
import cl.duoc.nutrivida.usuarios.security.JwtService;
import cl.duoc.nutrivida.usuarios.security.UsuarioAutenticado;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

/** G-34: AuthService.login aislado con Mockito (repositorio, BCrypt y JwtService simulados). */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UsuarioRepository usuarios;
    @Mock PasswordEncoder codificador;
    @Mock JwtService jwt;
    @InjectMocks AuthService servicio;

    static Usuario cuenta(boolean activo) {
        return new Usuario("U010", "Carolina", "Fuentes M.", "16.222.333-K", "cfuentes@nutrivida.cl",
                "+56 9 1111 0010", null, "$2a$10$hash", Rol.NUTRICIONISTA, "NUT001", activo, LocalDate.of(2026, 8, 1));
    }

    @Test
    @DisplayName("Credenciales correctas: busca por correo normalizado y firma con los claims del contrato")
    void loginCorrecto() {
        given(usuarios.findByCorreo("cfuentes@nutrivida.cl")).willReturn(Optional.of(cuenta(true)));
        given(codificador.matches("Nutri2026!", "$2a$10$hash")).willReturn(true);
        given(jwt.generar(any())).willReturn("token");
        given(jwt.getVigencia()).willReturn(Duration.ofHours(8));

        LoginRespuesta r = servicio.login(new LoginSolicitud(" CFuentes@NutriVida.cl ", "Nutri2026!"));

        assertThat(r.token()).isEqualTo("token");
        assertThat(r.expiraEn()).isEqualTo(28800);
        verify(jwt).generar(new UsuarioAutenticado("U010", "NUTRICIONISTA", "Carolina", "NUT001"));
    }

    @Test
    @DisplayName("Clave incorrecta: 401 y no se emite token")
    void claveIncorrecta() {
        given(usuarios.findByCorreo("cfuentes@nutrivida.cl")).willReturn(Optional.of(cuenta(true)));
        given(codificador.matches("mala", "$2a$10$hash")).willReturn(false);

        assertThatThrownBy(() -> servicio.login(new LoginSolicitud("cfuentes@nutrivida.cl", "mala")))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(e.getMessage()).isEqualTo(AuthService.CREDENCIALES);
                });
        verify(jwt, never()).generar(any());
    }

    @Test
    @DisplayName("Cuenta desactivada: 403 aunque la clave sea correcta")
    void desactivada() {
        given(usuarios.findByCorreo("cfuentes@nutrivida.cl")).willReturn(Optional.of(cuenta(false)));
        given(codificador.matches("Nutri2026!", "$2a$10$hash")).willReturn(true);

        assertThatThrownBy(() -> servicio.login(new LoginSolicitud("cfuentes@nutrivida.cl", "Nutri2026!")))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(jwt, never()).generar(any());
    }
}
