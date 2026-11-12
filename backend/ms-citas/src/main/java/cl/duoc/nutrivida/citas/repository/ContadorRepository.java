package cl.duoc.nutrivida.citas.repository;

import cl.duoc.nutrivida.citas.model.Contador;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ContadorRepository extends JpaRepository<Contador, String> {

    /** SELECT … FOR UPDATE: la fila queda bloqueada hasta el COMMIT de quien pidió el número. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Contador c where c.nombre = :nombre")
    Optional<Contador> bloquear(@Param("nombre") String nombre);
}
