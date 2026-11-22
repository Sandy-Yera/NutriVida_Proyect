package cl.duoc.nutrivida.usuarios.repository;

import cl.duoc.nutrivida.usuarios.model.Usuario;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, String> {

    Optional<Usuario> findByCorreo(String correo);

    // Duplicados (409). Al editar se excluye la propia cuenta.
    boolean existsByCorreo(String correo);
    boolean existsByCorreoAndIdNot(String correo, String id);
    boolean existsByRut(String rut);
    boolean existsByRutAndIdNot(String rut, String id);
    boolean existsByNutricionistaId(String nutricionistaId);
    boolean existsByNutricionistaIdAndIdNot(String nutricionistaId, String id);
}
