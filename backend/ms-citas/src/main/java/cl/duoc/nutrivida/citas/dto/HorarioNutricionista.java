package cl.duoc.nutrivida.citas.dto;

import java.time.LocalTime;
import java.util.List;

/**
 * Jornada de un nutricionista, tal como la entrega ms-clinica (GET /api/nutricionistas/{id}).
 * dias usa la convención de EP2: 0 = domingo … 6 = sábado. La jornada va de horaInicio a
 * horaFin; el último bloque de 30 min termina a más tardar en horaFin (RN-09).
 */
public record HorarioNutricionista(String id, List<Integer> dias, LocalTime horaInicio, LocalTime horaFin) { }
