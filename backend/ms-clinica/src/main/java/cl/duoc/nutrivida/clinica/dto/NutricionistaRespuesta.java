package cl.duoc.nutrivida.clinica.dto;

import cl.duoc.nutrivida.clinica.model.Nutricionista;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalTime;
import java.util.List;

/**
 * Un nutricionista con los campos de nutricionistasSemilla de EP2. ms-citas lee id, dias,
 * horaInicio y horaFin. fotoUrl es null si no tiene foto; si tiene, apunta a GET …/{id}/foto
 * con ?v= para que el navegador no muestre una foto vieja de su caché.
 */
public record NutricionistaRespuesta(String id, String usuarioId, String nombre, String especialidad,
        @Schema(example = "[1, 3, 5]") List<Integer> dias,
        @JsonFormat(pattern = "HH:mm") @Schema(type = "string", example = "09:00") LocalTime horaInicio,
        @JsonFormat(pattern = "HH:mm") @Schema(type = "string", example = "17:00") LocalTime horaFin,
        String fotoUrl) {

    public static NutricionistaRespuesta de(Nutricionista n, String fotoUrl) {
        return new NutricionistaRespuesta(n.getId(), n.getUsuarioId(), n.getNombre(), n.getEspecialidad(),
                n.getDias().stream().sorted().toList(), n.getHoraInicio(), n.getHoraFin(), fotoUrl);
    }
}
