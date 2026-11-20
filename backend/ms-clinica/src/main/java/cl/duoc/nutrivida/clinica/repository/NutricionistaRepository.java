package cl.duoc.nutrivida.clinica.repository;

import cl.duoc.nutrivida.clinica.model.Nutricionista;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NutricionistaRepository extends JpaRepository<Nutricionista, String> {

    List<Nutricionista> findAllByOrderByIdAsc();
}
