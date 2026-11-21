package cl.duoc.nutrivida.clinica.dto;

import cl.duoc.nutrivida.clinica.model.PlanAlimentario;
import java.time.LocalDate;

/** Plan con la forma de planesSemilla de EP2 (las comidas anidadas en "comidas"). */
public record PlanRespuesta(String id, String pacienteId, String nutricionistaId, LocalDate vigenteDesde,
        String objetivo, Integer kcalDiarias, Comidas comidas, String indicaciones) {

    public static PlanRespuesta de(PlanAlimentario p) {
        return new PlanRespuesta(p.getId(), p.getPacienteId(), p.getNutricionistaId(), p.getVigenteDesde(),
                p.getObjetivo(), p.getKcalDiarias(),
                new Comidas(p.getDesayuno(), p.getColacion(), p.getAlmuerzo(), p.getOnce(), p.getCena()),
                p.getIndicaciones());
    }
}
