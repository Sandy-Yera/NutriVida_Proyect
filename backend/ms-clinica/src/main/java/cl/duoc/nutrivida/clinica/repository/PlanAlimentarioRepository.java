package cl.duoc.nutrivida.clinica.repository;

import cl.duoc.nutrivida.clinica.model.PlanAlimentario;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanAlimentarioRepository extends JpaRepository<PlanAlimentario, String> {

    /** El vigente: el de vigenteDesde más reciente y, si empatan, el último creado (igual que EP2). */
    Optional<PlanAlimentario> findFirstByPacienteIdOrderByVigenteDesdeDescIdDesc(String pacienteId);
}
