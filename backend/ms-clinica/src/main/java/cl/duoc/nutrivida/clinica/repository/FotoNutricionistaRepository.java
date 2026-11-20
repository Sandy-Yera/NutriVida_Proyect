package cl.duoc.nutrivida.clinica.repository;

import cl.duoc.nutrivida.clinica.model.FotoNutricionista;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FotoNutricionistaRepository extends JpaRepository<FotoNutricionista, String> {

    /** Solo id y fecha, sin la imagen: para armar fotoUrl al listar. */
    @Query("select f.nutricionistaId, f.actualizadaEn from FotoNutricionista f")
    List<Object[]> versiones();

    @Query("select f.actualizadaEn from FotoNutricionista f where f.nutricionistaId = ?1")
    Instant version(String nutricionistaId);
}
