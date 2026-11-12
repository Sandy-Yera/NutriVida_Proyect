package cl.duoc.nutrivida.citas.repository;

import cl.duoc.nutrivida.citas.model.Cita;
import cl.duoc.nutrivida.citas.model.EstadoCita;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CitaRepository extends JpaRepository<Cita, String> {

    /** RN-10: citas del nutricionista ese día que ocupan agenda (para choques y disponibilidad). */
    List<Cita> findByNutricionistaIdAndFechaAndEstadoIn(String nutricionistaId, LocalDate fecha,
            Collection<EstadoCita> estados);

    /** GET /api/citas/mias. También sirve para RN-16 (teleconsulta tras una presencial). */
    List<Cita> findByPacienteIdOrderByFechaAscHoraAsc(String pacienteId);

    /** GET /api/citas/agenda: solo las del nutricionista del token. */
    List<Cita> findByNutricionistaIdAndFechaBetweenOrderByFechaAscHoraAsc(String nutricionistaId,
            LocalDate desde, LocalDate hasta);

    /** GET /api/citas/estadisticas. */
    List<Cita> findByFechaBetween(LocalDate desde, LocalDate hasta);

    /** Para el citaId del comprobante: el enlace vive en cita.pago_id. */
    Optional<Cita> findByPago_Id(String pagoId);

    List<Cita> findByPago_IdIn(Collection<String> pagoIds);

    /**
     * GET /api/citas (SECRETARIA, ADMIN). Cada filtro es opcional: null no restringe, como
     * filtrarCitas de EP2. Ordenadas por fecha y hora.
     */
    @Query("""
            select c from Cita c
            where (:pacienteId is null or c.pacienteId = :pacienteId)
              and (:nutricionistaId is null or c.nutricionistaId = :nutricionistaId)
              and (:estado is null or c.estado = :estado)
              and (:desde is null or c.fecha >= :desde)
              and (:hasta is null or c.fecha <= :hasta)
            order by c.fecha, c.hora
            """)
    List<Cita> buscar(@Param("pacienteId") String pacienteId,
            @Param("nutricionistaId") String nutricionistaId,
            @Param("estado") EstadoCita estado,
            @Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta);
}
