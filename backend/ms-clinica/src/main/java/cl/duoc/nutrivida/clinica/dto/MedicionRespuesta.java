package cl.duoc.nutrivida.clinica.dto;

import cl.duoc.nutrivida.clinica.model.Medicion;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Medición con los campos de medicionesSemilla de EP2. */
public record MedicionRespuesta(String id, String pacienteId, String nutricionistaId, LocalDate fecha,
        BigDecimal pesoKg, BigDecimal tallaCm, BigDecimal cinturaCm, BigDecimal caderaCm, BigDecimal grasaPct,
        String notas) {

    public static MedicionRespuesta de(Medicion m) {
        return new MedicionRespuesta(m.getId(), m.getPacienteId(), m.getNutricionistaId(), m.getFecha(),
                m.getPesoKg(), m.getTallaCm(), m.getCinturaCm(), m.getCaderaCm(), m.getGrasaPct(), m.getNotas());
    }
}
