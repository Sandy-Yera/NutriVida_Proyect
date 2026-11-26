package cl.duoc.nutrivida.citas.service;

import cl.duoc.nutrivida.citas.client.ClinicaClient;
import cl.duoc.nutrivida.citas.dto.HoraLibre;
import cl.duoc.nutrivida.citas.model.EstadoCita;
import cl.duoc.nutrivida.citas.repository.CitaRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * GET /api/disponibilidad y GET /api/disponibilidad/proximas (públicos). El horario sale de
 * ms-clinica y las citas de la base; la regla es ReglasCita.horariosDisponibles, la misma que
 * usa CitaService al crear o reprogramar: lo que se ofrece es exactamente lo que se acepta.
 */
@Service
public class DisponibilidadService {

    /** La agenda rápida mira a lo más dos semanas adelante, como EP2. */
    static final int DIAS_PROXIMAS = 14;
    static final int MAXIMO_PROXIMAS = 20;

    private final ClinicaClient clinica;
    private final CitaRepository citas;
    private final Clock reloj;

    public DisponibilidadService(ClinicaClient clinica, CitaRepository citas, Clock reloj) {
        this.clinica = clinica;
        this.citas = citas;
        this.reloj = reloj;
    }

    /**
     * Horas libres de un nutricionista en una fecha para un servicio de duracionMin. Un
     * nutricionista que no existe no tiene horas (lista vacía, como EP2). idExcluido: la cita que
     * se está reprogramando no ocupa su propio horario.
     */
    @Transactional(readOnly = true)
    public List<String> horasLibres(String nutricionistaId, LocalDate fecha, Integer duracionMin, String idExcluido) {
        return clinica.nutricionista(nutricionistaId)
                .map(horario -> ReglasCita.horariosDisponibles(horario, fecha,
                        citas.findByNutricionistaIdAndFechaAndEstadoIn(nutricionistaId, fecha,
                                        EnumSet.of(EstadoCita.PENDIENTE, EstadoCita.CONFIRMADA)).stream()
                                .filter(c -> !Objects.equals(c.getId(), idExcluido)).toList(),
                        duracionMin, LocalDateTime.now(reloj)))
                .orElse(List.of())
                .stream().map(LocalTime::toString).toList();
    }

    /** Las próximas horas libres de toda la clínica (entre 1 y 20). */
    @Transactional(readOnly = true)
    public List<HoraLibre> proximas(int cantidad) {
        int pedidas = Math.max(1, Math.min(cantidad, MAXIMO_PROXIMAS));
        LocalDateTime ahora = LocalDateTime.now(reloj);
        LocalDate hoy = ahora.toLocalDate();
        return ReglasCita.buscarProximasHorasLibres(clinica.nutricionistas(),
                citas.findByFechaBetween(hoy, hoy.plusDays(DIAS_PROXIMAS)), ahora, pedidas, DIAS_PROXIMAS);
    }
}
