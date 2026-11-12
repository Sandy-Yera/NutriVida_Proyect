package cl.duoc.nutrivida.clinica.security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Lee "Authorization: Bearer ..." en cada petición. Si el token es válido, deja al usuario en el
 * SecurityContext con su rol como ROLE_X (lo que usan hasRole y @PreAuthorize). Si no es válido,
 * no autentica y guarda el motivo para que el 401 diga "tu sesión expiró" en vez de un texto genérico.
 */
@Component
public class JwtFiltro extends OncePerRequestFilter {

    public static final String ATRIBUTO_MOTIVO = "nutrivida.jwt.motivo";

    private final JwtService jwtService;

    public JwtFiltro(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
            FilterChain cadena) throws ServletException, IOException {
        String cabecera = req.getHeader("Authorization");
        if (cabecera != null && cabecera.startsWith("Bearer ")) {
            try {
                UsuarioAutenticado usuario = jwtService.validar(cabecera.substring(7));
                var autenticacion = new UsernamePasswordAuthenticationToken(
                        usuario, null, List.of(new SimpleGrantedAuthority("ROLE_" + usuario.rol())));
                SecurityContextHolder.getContext().setAuthentication(autenticacion);
            } catch (ExpiredJwtException e) {
                req.setAttribute(ATRIBUTO_MOTIVO, "Tu sesión expiró. Inicia sesión nuevamente.");
            } catch (JwtException | IllegalArgumentException e) {
                req.setAttribute(ATRIBUTO_MOTIVO, "La sesión no es válida. Inicia sesión nuevamente.");
            }
        }
        cadena.doFilter(req, res);
    }
}
