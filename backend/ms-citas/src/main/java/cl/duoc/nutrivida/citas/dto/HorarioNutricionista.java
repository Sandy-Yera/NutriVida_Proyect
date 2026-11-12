package cl.duoc.nutrivida.citas.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalTime;
import java.util.List;

/**
 * Jornada de un nutricionista, tal como la entrega ms-clinica (GET /api/nutricionistas). Del
 * JSON solo se leen estos cuatro campos; nombre, especialidad, fotoUrl… se ignoran.
 * dias usa la convención de EP2: 0 = domingo … 6 = sábado. La jornada va de horaInicio a
 * horaFin; el último bloque de 30 min termina a más tardar en horaFin (RN-09).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record HorarioNutricionista(String id, List<Integer> dias, LocalTime horaInicio, LocalTime horaFin) { }
