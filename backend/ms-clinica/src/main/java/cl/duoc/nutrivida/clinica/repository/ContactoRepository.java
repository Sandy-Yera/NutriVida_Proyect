package cl.duoc.nutrivida.clinica.repository;

import cl.duoc.nutrivida.clinica.model.Contacto;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactoRepository extends JpaRepository<Contacto, String> {

    List<Contacto> findAllByOrderByIdAsc();
}
