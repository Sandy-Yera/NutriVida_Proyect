package cl.duoc.nutrivida.clinica.repository;

import cl.duoc.nutrivida.clinica.model.Medicion;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicionRepository extends JpaRepository<Medicion, String> {

    List<Medicion> findByPacienteIdOrderByFechaAscIdAsc(String pacienteId);
}
