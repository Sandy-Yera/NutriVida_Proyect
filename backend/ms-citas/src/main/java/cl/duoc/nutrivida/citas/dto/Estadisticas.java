package cl.duoc.nutrivida.citas.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * GET /api/citas/estadisticas (RN-27, S-09). Misma forma que en EP2: el panel del admin
 * no cambia entre modo local y modo API.
 */
public record Estadisticas(
        int total,
        int atendidas,
        int inasistencias,
        double tasaInasistencia,
        List<PorNutricionista> porNutricionista,
        List<PorSemana> porSemana) {

    public record PorNutricionista(String nutricionistaId, int total) { }

    /** semana es el lunes de esa semana. */
    public record PorSemana(LocalDate semana, int total) { }
}
