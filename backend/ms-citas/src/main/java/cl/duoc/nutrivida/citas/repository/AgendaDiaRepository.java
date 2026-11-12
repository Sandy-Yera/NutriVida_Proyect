package cl.duoc.nutrivida.citas.repository;

import cl.duoc.nutrivida.citas.model.AgendaDia;
import java.time.LocalDate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AgendaDiaRepository extends JpaRepository<AgendaDia, AgendaDia.Clave> {

    /**
     * Contrato §5: toma la agenda del nutricionista para ese día hasta el COMMIT. Debe llamarse
     * dentro de un @Transactional, antes de revisar choques y de guardar la cita.
     *
     * Una sola sentencia crea la fila si no existe o la toma si ya existe, y en ambos casos la
     * deja con bloqueo exclusivo. (Insertar si falta y luego SELECT … FOR UPDATE son dos bloqueos
     * y dos reservas simultáneas pueden quedar esperándose: deadlock.)
     */
    @Modifying(flushAutomatically = true)
    @Query(value = """
            INSERT INTO agenda_dia (nutricionista_id, fecha) VALUES (:nutricionistaId, :fecha)
            ON DUPLICATE KEY UPDATE fecha = fecha
            """, nativeQuery = true)
    int bloquear(@Param("nutricionistaId") String nutricionistaId, @Param("fecha") LocalDate fecha);
}
