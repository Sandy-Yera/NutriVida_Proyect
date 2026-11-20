package cl.duoc.nutrivida.clinica.repository;

import cl.duoc.nutrivida.clinica.model.Contador;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface ContadorRepository extends JpaRepository<Contador, String> {

    /** SELECT … FOR UPDATE: la fila queda tomada hasta el COMMIT. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Contador c where c.nombre = ?1")
    Optional<Contador> bloquear(String nombre);
}
