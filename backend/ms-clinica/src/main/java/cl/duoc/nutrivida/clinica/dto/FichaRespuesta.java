package cl.duoc.nutrivida.clinica.dto;

import cl.duoc.nutrivida.clinica.model.Ficha;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDate;

/**
 * Ficha con los campos de EP2. A un nutricionista que no está a cargo solo le llega
 * { id, nutricionistaId } (para el aviso "Ficha de otro nutricionista"): el resto no viaja.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record FichaRespuesta(String id, String nutricionistaId, String objetivo, String antecedentes, LocalDate creadaEn) {

    public static FichaRespuesta de(Ficha f) {
        return new FichaRespuesta(f.getPacienteId(), f.getNutricionistaId(), f.getObjetivo(), f.getAntecedentes(),
                f.getCreadaEn());
    }

    public static FichaRespuesta soloDuenio(Ficha f) {
        return new FichaRespuesta(f.getPacienteId(), f.getNutricionistaId(), null, null, null);
    }
}
