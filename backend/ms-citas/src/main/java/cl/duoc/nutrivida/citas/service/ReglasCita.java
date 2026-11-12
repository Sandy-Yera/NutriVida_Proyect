package cl.duoc.nutrivida.citas.service;

import cl.duoc.nutrivida.citas.dto.Estadisticas;
import cl.duoc.nutrivida.citas.dto.HoraLibre;
import cl.duoc.nutrivida.citas.dto.HorarioNutricionista;
import cl.duoc.nutrivida.citas.model.Cita;
import cl.duoc.nutrivida.citas.model.EstadoCita;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Reglas de negocio de las citas: el puerto a Java de frontend/src/utils/citas.js (EP2), con los
 * mismos números de regla y los mismos mensajes. Son funciones puras: no leen la base, no leen
 * el reloj y no lanzan excepciones. El service les pasa los datos y "ahora", y decide qué error
 * responder. Así cada regla se prueba sola (ReglasCitaTest) y el frontend y el backend no se
 * contradicen.
 *
 * "ahora" es la hora local de la clínica (America/Santiago). Lo que mide tiempo transcurrido
 * (las 24 h) se calcula con la zona, para que un cambio de horario no corra el límite una hora.
 */
public final class ReglasCita {

    public static final ZoneId ZONA = ZoneId.of("America/Santiago");
    public static final int DURACION_BLOQUE = 30;
    public static final int DIAS_ANTICIPACION = 60;
    public static final int MOTIVO_MIN = 10;
    public static final int MOTIVO_MAX = 300;
    private static final Duration ANTICIPACION_MINIMA = Duration.ofHours(24);

    public static final String MENSAJE_24H =
            "Solo puedes cancelar o reprogramar con más de 24 horas de anticipación. Llama a la clínica.";

    /**
     * RN-02: transiciones permitidas. ATENDIDA, CANCELADA e INASISTENCIA son finales.
     * Reprogramar no es una transición: deja la cita en PENDIENTE (RN-05).
     */
    private static final Map<EstadoCita, Set<EstadoCita>> TRANSICIONES = new EnumMap<>(EstadoCita.class);

    /**
     * RN-24 a RN-26: qué estados puede poner cada rol. La secretaria no marca ATENDIDA (la marca
     * el nutricionista) y el nutricionista no confirma ni cancela. Las reglas de dueño ("esta
     * cita es tuya") y de 24 h van aparte.
     */
    private static final Map<String, Set<EstadoCita>> ACCIONES_POR_ROL = Map.of(
            "PACIENTE", EnumSet.of(EstadoCita.CANCELADA),
            "NUTRICIONISTA", EnumSet.of(EstadoCita.ATENDIDA, EstadoCita.INASISTENCIA),
            "SECRETARIA", EnumSet.of(EstadoCita.CONFIRMADA, EstadoCita.CANCELADA, EstadoCita.INASISTENCIA),
            "ADMIN", EnumSet.of(EstadoCita.CONFIRMADA, EstadoCita.CANCELADA, EstadoCita.ATENDIDA,
                    EstadoCita.INASISTENCIA));

    static {
        TRANSICIONES.put(EstadoCita.PENDIENTE, EnumSet.of(EstadoCita.CONFIRMADA, EstadoCita.CANCELADA));
        TRANSICIONES.put(EstadoCita.CONFIRMADA,
                EnumSet.of(EstadoCita.ATENDIDA, EstadoCita.INASISTENCIA, EstadoCita.CANCELADA));
        TRANSICIONES.put(EstadoCita.ATENDIDA, EnumSet.noneOf(EstadoCita.class));
        TRANSICIONES.put(EstadoCita.CANCELADA, EnumSet.noneOf(EstadoCita.class));
        TRANSICIONES.put(EstadoCita.INASISTENCIA, EnumSet.noneOf(EstadoCita.class));
    }

    private static final DateTimeFormatter FECHA_LARGA =
            DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", Locale.forLanguageTag("es-CL"));

    private ReglasCita() { }

    // ------------------------------------------------------------------ estados

    /** Un estado nuevo nulo da false: EnumSet.contains(null) es false, no lanza excepción. */
    public static boolean puedeTransicionar(EstadoCita actual, EstadoCita nuevo) {
        return actual != null && TRANSICIONES.get(actual).contains(nuevo);
    }

    public static Set<EstadoCita> transicionesDesde(EstadoCita actual) {
        return Collections.unmodifiableSet(TRANSICIONES.get(actual));
    }

    /**
     * RN-24 a RN-26: ¿el rol del token puede poner ese estado? Un rol desconocido o ausente no
     * puede nada (Map.of no acepta claves null: sin este chequeo sería un 500 en vez de un 403).
     */
    public static boolean rolPuedeCambiarA(String rol, EstadoCita nuevo) {
        if (rol == null) return false;
        return ACCIONES_POR_ROL.getOrDefault(rol, Set.of()).contains(nuevo);
    }

    // ------------------------------------------------------------------ bloques y agenda

    /** RN-11: una cita ocupa ceil(duración / 30) bloques seguidos. Sin duración (planes), 1 bloque. */
    public static List<LocalTime> bloquesQueOcupa(LocalTime hora, Integer duracionMin) {
        int duracion = duracionMin == null ? DURACION_BLOQUE : duracionMin;
        int cantidad = Math.max(1, (duracion + DURACION_BLOQUE - 1) / DURACION_BLOQUE);
        List<LocalTime> bloques = new ArrayList<>(cantidad);
        for (int i = 0; i < cantidad; i++) bloques.add(hora.plusMinutes((long) i * DURACION_BLOQUE));
        return bloques;   // bloquesQueOcupa(08:30, 50) → [08:30, 09:00]
    }

    /** RN-09: bloques de 30 min dentro de la jornada, solo los días en que el nutricionista atiende. */
    public static List<LocalTime> generarBloques(HorarioNutricionista horario, LocalDate fecha) {
        if (!horario.dias().contains(diaEp2(fecha))) return List.of();
        int inicio = minutos(horario.horaInicio());
        int fin = minutos(horario.horaFin());
        int cantidad = Math.max(0, (fin - inicio) / DURACION_BLOQUE);
        List<LocalTime> bloques = new ArrayList<>(cantidad);
        for (int i = 0; i < cantidad; i++) {
            bloques.add(horario.horaInicio().plusMinutes((long) i * DURACION_BLOQUE));
        }
        return bloques;
    }

    /**
     * RN-10: ¿una cita en esa hora choca con otra pendiente o confirmada del mismo nutricionista
     * y día? idExcluido permite ignorar la propia cita al reprogramarla.
     */
    public static boolean chocaConOtraCita(Collection<Cita> citas, String nutricionistaId, LocalDate fecha,
            LocalTime hora, Integer duracionMin, String idExcluido) {
        Set<LocalTime> pedidos = new HashSet<>(bloquesQueOcupa(hora, duracionMin));
        return citas.stream().anyMatch(c ->
                !c.getId().equals(idExcluido)
                        && c.getNutricionistaId().equals(nutricionistaId)
                        && c.getFecha().equals(fecha)
                        && c.getEstado().ocupaAgenda()
                        && bloquesQueOcupa(c.getHora(), c.getDuracionMin()).stream().anyMatch(pedidos::contains));
    }

    /**
     * RN-10 a RN-12: horas en que una cita de duracionMin cabe completa dentro de la jornada, sin
     * choques y, si se pasa ahora, sin horas que ya empezaron. citas puede traer citas de otros
     * días o nutricionistas: se filtran aquí. Para reprogramar, el service quita la propia cita.
     */
    public static List<LocalTime> horariosDisponibles(HorarioNutricionista horario, LocalDate fecha,
            Collection<Cita> citas, Integer duracionMin, LocalDateTime ahora) {
        List<LocalTime> bloques = generarBloques(horario, fecha);
        Set<LocalTime> enJornada = new HashSet<>(bloques);
        Set<LocalTime> ocupados = new HashSet<>();
        citas.stream()
                .filter(c -> c.getNutricionistaId().equals(horario.id())
                        && c.getFecha().equals(fecha)
                        && c.getEstado().ocupaAgenda())
                .forEach(c -> ocupados.addAll(bloquesQueOcupa(c.getHora(), c.getDuracionMin())));

        return bloques.stream()
                .filter(b -> bloquesQueOcupa(b, duracionMin).stream()
                        .allMatch(n -> enJornada.contains(n) && !ocupados.contains(n)))
                .filter(b -> ahora == null || LocalDateTime.of(fecha, b).isAfter(ahora))
                .toList();
    }

    /**
     * Agenda rápida del Inicio (decisión 3): las próximas horas libres de toda la clínica desde
     * ahora, para una consulta de 30 min. Recorre día por día (hasta diasMaximos) y ordena por
     * fecha, hora y nutricionista, igual que buscarProximasHorasLibres de EP2.
     */
    public static List<HoraLibre> buscarProximasHorasLibres(Collection<HorarioNutricionista> nutricionistas,
            Collection<Cita> citas, LocalDateTime ahora, int cantidad, int diasMaximos) {
        List<HoraLibre> encontradas = new ArrayList<>();
        LocalDate fecha = ahora.toLocalDate();
        for (int dia = 0; dia < diasMaximos && encontradas.size() < cantidad; dia++) {
            LocalDate delDia = fecha;
            nutricionistas.stream()
                    .flatMap(n -> horariosDisponibles(n, delDia, citas, DURACION_BLOQUE, ahora).stream()
                            .map(hora -> new HoraLibre(n.id(), delDia, hora)))
                    .sorted(Comparator.comparing(HoraLibre::hora).thenComparing(HoraLibre::nutricionistaId))
                    .forEach(encontradas::add);
            fecha = fecha.plusDays(1);
        }
        return List.copyOf(encontradas.subList(0, Math.min(encontradas.size(), Math.max(0, cantidad))));
    }

    // ------------------------------------------------------------------ tiempos

    /** RN-06: el paciente cancela o reprograma solo con más de 24 h de anticipación. */
    public static boolean puedeCancelar(Cita cita, LocalDateTime ahora) {
        if (!puedeTransicionar(cita.getEstado(), EstadoCita.CANCELADA)) return false;
        return faltaPara(cita, ahora).compareTo(ANTICIPACION_MINIMA) > 0;
    }

    /** RN-07: recordatorio para citas confirmadas a las que les faltan 24 h o menos. */
    public static boolean necesitaRecordatorio(Cita cita, LocalDateTime ahora) {
        if (cita.getEstado() != EstadoCita.CONFIRMADA) return false;
        Duration falta = faltaPara(cita, ahora);
        return falta.isPositive() && falta.compareTo(ANTICIPACION_MINIMA) <= 0;
    }

    /** Tiempo real que falta para la cita (en la zona de la clínica: respeta el cambio de horario). */
    static Duration faltaPara(Cita cita, LocalDateTime ahora) {
        return Duration.between(ahora.atZone(ZONA), LocalDateTime.of(cita.getFecha(), cita.getHora()).atZone(ZONA));
    }

    // ------------------------------------------------------------------ validaciones del formulario

    /** RN-14: el motivo, sin espacios al inicio ni al final, tiene entre 10 y 300 caracteres. */
    public static Optional<String> validarMotivo(String motivo) {
        int largo = motivo == null ? 0 : motivo.strip().length();
        if (largo < MOTIVO_MIN) return Optional.of("El motivo debe tener al menos " + MOTIVO_MIN + " caracteres.");
        if (largo > MOTIVO_MAX) return Optional.of("El motivo puede tener como máximo " + MOTIVO_MAX + " caracteres.");
        return Optional.empty();
    }

    /**
     * RN-13: se agenda desde hoy hasta 60 días adelante, extremos incluidos. Se cuenta en días de
     * calendario (LocalDate), así un cambio de horario no corre el límite. El formato AAAA-MM-DD
     * ya lo exige Jackson al leer el JSON (400 si no calza).
     */
    public static Optional<String> validarFechaCita(LocalDate fecha, LocalDate hoy) {
        LocalDate hasta = hoy.plusDays(DIAS_ANTICIPACION);
        if (fecha.isBefore(hoy)) return Optional.of("Esa fecha ya pasó. Elige una desde hoy.");
        if (fecha.isAfter(hasta)) {
            return Optional.of("Solo se puede agendar hasta " + DIAS_ANTICIPACION + " días adelante (hasta el "
                    + FECHA_LARGA.format(hasta) + ").");
        }
        return Optional.empty();
    }

    /**
     * RN-16: la teleconsulta exige una atención presencial previa. codigosNoPresenciales viene de
     * ms-clinica (servicios cuya modalidad no es presencial): si se agrega otro servicio online,
     * no hay que cambiar esta regla.
     */
    public static boolean puedeAgendarTeleconsulta(Collection<Cita> citasDelPaciente,
            Collection<String> codigosNoPresenciales) {
        return citasDelPaciente.stream().anyMatch(c ->
                c.getEstado() == EstadoCita.ATENDIDA && !codigosNoPresenciales.contains(c.getServicioCodigo()));
    }

    // ------------------------------------------------------------------ estadísticas (RN-27)

    /** El lunes de la semana de una fecha. El domingo pertenece a la semana del lunes anterior. */
    public static LocalDate lunesDeLaSemana(LocalDate fecha) {
        return fecha.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    /**
     * Las citas del período (extremos incluidos) sin las canceladas. La tasa de inasistencia es
     * inasistencias / (atendidas + inasistencias): las pendientes aún no ocurren y no cuentan.
     * porNutricionista y porSemana incluyen las filas con 0, para que el gráfico no tenga huecos.
     */
    public static Estadisticas calcularEstadisticas(Collection<Cita> citas, LocalDate desde, LocalDate hasta,
            List<String> nutricionistaIds) {
        List<Cita> delPeriodo = citas.stream()
                .filter(c -> !c.getFecha().isBefore(desde) && !c.getFecha().isAfter(hasta))
                .filter(c -> c.getEstado() != EstadoCita.CANCELADA)
                .toList();
        int atendidas = contar(delPeriodo, EstadoCita.ATENDIDA);
        int inasistencias = contar(delPeriodo, EstadoCita.INASISTENCIA);
        int ocurridas = atendidas + inasistencias;
        double tasa = ocurridas > 0 ? (double) inasistencias / ocurridas : 0;

        List<Estadisticas.PorNutricionista> porNutricionista = nutricionistaIds.stream()
                .map(id -> new Estadisticas.PorNutricionista(id,
                        (int) delPeriodo.stream().filter(c -> c.getNutricionistaId().equals(id)).count()))
                .toList();

        List<Estadisticas.PorSemana> porSemana = new ArrayList<>();
        for (LocalDate lunes = lunesDeLaSemana(desde); !lunes.isAfter(lunesDeLaSemana(hasta)); lunes = lunes.plusWeeks(1)) {
            LocalDate semana = lunes;
            porSemana.add(new Estadisticas.PorSemana(semana,
                    (int) delPeriodo.stream().filter(c -> lunesDeLaSemana(c.getFecha()).equals(semana)).count()));
        }
        return new Estadisticas(delPeriodo.size(), atendidas, inasistencias, tasa, porNutricionista,
                List.copyOf(porSemana));
    }

    // ------------------------------------------------------------------ auxiliares

    /** Día de la semana con la convención de EP2 y ms-clinica: 0 = domingo … 6 = sábado. */
    static int diaEp2(LocalDate fecha) {
        return fecha.getDayOfWeek().getValue() % 7;
    }

    private static int minutos(LocalTime hora) {
        return hora.getHour() * 60 + hora.getMinute();
    }

    private static int contar(List<Cita> citas, EstadoCita estado) {
        return (int) citas.stream().filter(c -> c.getEstado() == estado).count();
    }
}
