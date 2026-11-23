package cl.duoc.nutrivida.usuarios.service;

import cl.duoc.nutrivida.usuarios.dto.LoginRespuesta;
import cl.duoc.nutrivida.usuarios.dto.LoginSolicitud;
import cl.duoc.nutrivida.usuarios.dto.UsuarioRespuesta;
import cl.duoc.nutrivida.usuarios.exception.ApiException;
import cl.duoc.nutrivida.usuarios.model.Usuario;
import cl.duoc.nutrivida.usuarios.repository.UsuarioRepository;
import cl.duoc.nutrivida.usuarios.security.JwtFiltro;
import cl.duoc.nutrivida.usuarios.security.JwtService;
import cl.duoc.nutrivida.usuarios.security.UsuarioAutenticado;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

/**
 * G-32: login, registro y /me. Solo este microservicio emite el JWT (contrato §3);
 * ms-citas y ms-clinica lo validan con el mismo JWT_SECRET.
 */
@Service
public class AuthService {

    static final String CREDENCIALES = "Correo o contraseña incorrectos.";
    static final String DESACTIVADA = "Tu cuenta está desactivada. Contacta a la clínica.";

    private final UsuarioRepository usuarios;
    private final PasswordEncoder codificador;
    private final JwtService jwt;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder codificador, JwtService jwt) {
        this.usuarios = usuarios;
        this.codificador = codificador;
        this.jwt = jwt;
    }

    /** 401 si el correo o la clave no calzan (mismo mensaje en ambos casos); 403 si está desactivada. */
    @Transactional(readOnly = true)
    public LoginRespuesta login(LoginSolicitud s) {
        Usuario u = usuarios.findByCorreo(ReglasUsuario.normalizarCorreo(s.correo()))
                .filter(c -> codificador.matches(s.clave(), c.getClave()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, CREDENCIALES));
        if (!u.isActivo()) throw ApiException.prohibido(DESACTIVADA);
        String token = jwt.generar(new UsuarioAutenticado(u.getId(), u.getRol().name(), u.getNombre(),
                u.getNutricionistaId()));
        return new LoginRespuesta(token, "Bearer", jwt.getVigencia().toSeconds(), UsuarioRespuesta.de(u));
    }

    /**
     * La cuenta del token, leída de la base: si la desactivaron o la borraron, 401 y el frontend
     * cierra la sesión. Así una recarga (F5) confirma que la sesión guardada sigue valiendo.
     */
    @Transactional(readOnly = true)
    public UsuarioRespuesta yo() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || !(a.getPrincipal() instanceof UsuarioAutenticado actual)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, motivoDelFiltro());
        }
        Usuario u = usuarios.findById(actual.id())
                .filter(Usuario::isActivo)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, DESACTIVADA));
        return UsuarioRespuesta.de(u);
    }

    // /api/auth/** es pública en SecurityConfig, así que el 401 se arma aquí con el motivo de JwtFiltro.
    private static String motivoDelFiltro() {
        RequestAttributes atributos = RequestContextHolder.getRequestAttributes();
        Object motivo = atributos == null ? null
                : atributos.getAttribute(JwtFiltro.ATRIBUTO_MOTIVO, RequestAttributes.SCOPE_REQUEST);
        return motivo != null ? motivo.toString() : "Debes iniciar sesión para continuar.";
    }
}
