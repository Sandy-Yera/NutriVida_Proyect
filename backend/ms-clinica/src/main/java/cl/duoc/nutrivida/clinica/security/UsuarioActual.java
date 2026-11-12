package cl.duoc.nutrivida.clinica.security;

import cl.duoc.nutrivida.clinica.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Acceso al usuario del token desde los services, sin pasar el id por parámetro. */
@Component
public class UsuarioActual {

    public UsuarioAutenticado obtener() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || !(a.getPrincipal() instanceof UsuarioAutenticado usuario)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Debes iniciar sesión para continuar.");
        }
        return usuario;
    }
}
