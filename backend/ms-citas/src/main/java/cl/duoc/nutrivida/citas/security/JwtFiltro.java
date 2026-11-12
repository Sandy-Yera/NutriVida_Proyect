package cl.duoc.nutrivida.citas.security;

import cl.duoc.nutrivida.citas.client.ServicioNoDisponibleException;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

/**
 * Lee "Authorization: Bearer ..." en cada petición. Si el token es válido y la cuenta sigue
 * activa, deja al usuario en el SecurityContext con su rol como ROLE_X (lo que usan hasRole y
 * @PreAuthorize). Si no, no autentica y guarda el motivo para que el 401 diga "tu sesión expiró"
 * o "tu cuenta está desactivada" en vez de un texto genérico.
 */
@Component
public class JwtFiltro extends OncePerRequestFilter {

    public static final String ATRIBUTO_MOTIVO = "nutrivida.jwt.motivo";
    public static final String CUENTA_DESACTIVADA = "Tu cuenta está desactivada. Contacta a la clínica.";

    private final JwtService jwtService;
    private final VerificadorCuenta verificador;
    private final HandlerExceptionResolver resolver;

    public JwtFiltro(JwtService jwtService, VerificadorCuenta verificador,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver resolver) {
        this.jwtService = jwtService;
        this.verificador = verificador;
        this.resolver = resolver;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
            FilterChain cadena) throws ServletException, IOException {
        String cabecera = req.getHeader("Authorization");
        if (cabecera != null && cabecera.startsWith("Bearer ")) {
            try {
                UsuarioAutenticado usuario = jwtService.validar(cabecera.substring(7));
                if (verificador.puedeEntrar(usuario.id())) {
                    var autenticacion = new UsernamePasswordAuthenticationToken(
                            usuario, null, List.of(new SimpleGrantedAuthority("ROLE_" + usuario.rol())));
                    SecurityContextHolder.getContext().setAuthentication(autenticacion);
                } else {
                    req.setAttribute(ATRIBUTO_MOTIVO, CUENTA_DESACTIVADA);
                }
            } catch (ExpiredJwtException e) {
                req.setAttribute(ATRIBUTO_MOTIVO, "Tu sesión expiró. Inicia sesión nuevamente.");
            } catch (JwtException | IllegalArgumentException e) {
                req.setAttribute(ATRIBUTO_MOTIVO, "La sesión no es válida. Inicia sesión nuevamente.");
            } catch (ServicioNoDisponibleException e) {
                // ms-usuarios no pudo confirmar la cuenta (modo http): 503 con el JSON común.
                resolver.resolveException(req, res, null, e);
                return;
            }
        }
        cadena.doFilter(req, res);
    }
}
