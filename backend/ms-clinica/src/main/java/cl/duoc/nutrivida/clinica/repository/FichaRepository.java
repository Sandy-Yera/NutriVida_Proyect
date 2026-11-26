package cl.duoc.nutrivida.clinica.repository;

import cl.duoc.nutrivida.clinica.model.Ficha;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FichaRepository extends JpaRepository<Ficha, String> {

    List<Ficha> findByNutricionistaIdOrderByPacienteIdAsc(String nutricionistaId);

    List<Ficha> findAllByOrderByPacienteIdAsc();
}
