package cl.duoc.nutrivida.usuarios.repository;

import cl.duoc.nutrivida.usuarios.model.Articulo;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArticuloRepository extends JpaRepository<Articulo, String> {

    /** Del más reciente al más antiguo, como en EP2. */
    List<Articulo> findAllByOrderByFechaDesc();
}
