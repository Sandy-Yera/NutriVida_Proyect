package cl.duoc.nutrivida.citas.service;

import cl.duoc.nutrivida.citas.client.ClinicaClient;
import cl.duoc.nutrivida.citas.dto.CitaRespuesta;
import cl.duoc.nutrivida.citas.dto.CrearCitaSolicitud;
import cl.duoc.nutrivida.citas.dto.Estadisticas;
import cl.duoc.nutrivida.citas.dto.HorarioNutricionista;
import cl.duoc.nutrivida.citas.dto.ServicioClinica;
import cl.duoc.nutrivida.citas.exception.ApiException;
import cl.duoc.nutrivida.citas.exception.PagoRechazadoException;
import cl.duoc.nutrivida.citas.model.Cita;
import cl.duoc.nutrivida.citas.model.Contador;
import cl.duoc.nutrivida.citas.model.EstadoCita;
import cl.duoc.nutrivida.citas.model.EstadoPago;
import cl.duoc.nutrivida.citas.model.Pago;
import cl.duoc.nutrivida.citas.repository.AgendaDiaRepository;
import cl.duoc.nutrivida.citas.repository.CitaRepository;
import cl.duoc.nutrivida.citas.repository.ContadorRepository;
import cl.duoc.nutrivida.citas.repository.PagoRepository;
import cl.duoc.nutrivida.citas.security.UsuarioActual;
import cl.duoc.nutrivida.citas.security.UsuarioAutenticado;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reglas de citas que revisan y escriben (contrato §5): cada método es una transacción. Las
 * reglas puras viven en ReglasCita y ReglasPago; aquí se juntan con la base, ms-clinica y el
 * usuario del token. Los mensajes son los de EP2 (citasService.js), así el frontend muestra
 * lo mismo en modo local y en modo API.
 */
@Service
public class CitaService {

    /** Sin filtro de fechas, la agenda del nutricionista trae todo (como listarCitas de EP2). */
    static final LocalDate SIN_DESDE = LocalDate.of(2000, 1, 1);
    static final LocalDate SIN_HASTA = LocalDate.of(2100, 12, 31);

    static final String HORA_TOMADA = "Esa hora no está disponible con este nutricionista. Elige otra.";
    static final String SOLO_PENDIENTE_O_CONFIRMADA = "Solo se puede reprogramar una cita pendiente o confirmada.";
    static final String SOLO_CANCELADA = "Solo se puede eliminar una cita cancelada.";
    static final String TELECONSULTA = "La teleconsulta requiere haber tenido antes una consulta presencial.";

    private static final EnumSet<EstadoCita> OCUPAN = EnumSet.of(EstadoCita.PENDIENTE, EstadoCita.CONFIRMADA);

    private final CitaRepository citas;
    private final PagoRepository pagos;
    private final ContadorRepository contadores;
    private final AgendaDiaRepository agendas;
    private final ClinicaClient clinica;
    private final UsuarioActual usuarioActual;
    private final Clock reloj;

    public CitaService(CitaRepository citas, PagoRepository pagos, ContadorRepository contadores,
            AgendaDiaRepository agendas, ClinicaClient clinica, UsuarioActual usuarioActual, Clock reloj) {
        this.citas = citas;
        this.pagos = pagos;
        this.contadores = contadores;
        this.agendas = agendas;
        this.clinica = clinica;
        this.usuarioActual = usuarioActual;
        this.reloj = reloj;
    }

    // ------------------------------------------------------------------ crear (pago + cita)

    /**
     * POST /api/citas. Valida, cobra y crea en una sola transacción (contrato §5): no puede
     * quedar un pago aprobado sin cita. Si el banco rechaza, el pago RECHAZADO sí se guarda
     * (noRollbackFor) y se responde 402 sin crear la cita.
     */
    @Transactional(noRollbackFor = PagoRechazadoException.class)
    public CitaRespuesta crear(CrearCitaSolicitud s) {
        UsuarioAutenticado paciente = usuarioActual.obtener();
        LocalDateTime ahora = LocalDateTime.now(reloj);
        LocalDate hoy = ahora.toLocalDate();

        ServicioClinica servicio = clinica.servicio(s.servicioCodigo())
                .filter(ServicioClinica::estaActivo)
                .orElseThrow(() -> ApiException.validacion("servicioCodigo", "El servicio elegido no está disponible."));
        HorarioNutricionista nutricionista = clinica.nutricionista(s.nutricionistaId())
                .orElseThrow(() -> ApiException.noEncontrado("El nutricionista elegido no existe."));
        ReglasCita.validarMotivo(s.motivo()).ifPresent(m -> { throw ApiException.validacion("motivo", m); });
        ReglasCita.validarFechaCita(s.fecha(), hoy).ifPresent(m -> { throw ApiException.validacion("fecha", m); });
        Map<String, String> erroresTarjeta = ReglasPago.validarPago(s.tarjeta(), hoy);
        if (!erroresTarjeta.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Revisa los datos de la tarjeta.", erroresTarjeta);
        }
        if (!servicio.esPresencial() && !ReglasCita.puedeAgendarTeleconsulta(
                citas.findByPacienteIdOrderByFechaAscHoraAsc(paciente.id()), clinica.codigosNoPresenciales())) {
            throw ApiException.conflicto(TELECONSULTA);
        }

        // Sección crítica: la agenda de ese nutricionista ese día queda tomada hasta el COMMIT.
        agendas.bloquear(nutricionista.id(), s.fecha());
        exigirHoraLibre(nutricionista, s.fecha(), s.hora(), servicio.duracionMin(), null, ahora);

        var resultado = ReglasPago.simularPago(s.tarjeta().numero());
        Pago pago = pagos.save(new Pago(siguienteId(Contador.PAGO, "P"), paciente.id(), servicio.precio(),
                ReglasPago.ultimos4(s.tarjeta().numero()), resultado.estado(), resultado.motivo(), hoy));
        if (resultado.estado() != EstadoPago.APROBADO) {
            throw new PagoRechazadoException(resultado.motivo(), pago.getId());
        }

        Cita cita = new Cita(siguienteId(Contador.CITA, "C"), paciente.id(), nutricionista.id(),
                servicio.codigo(), s.fecha(), s.hora(), servicio.duracionMin(), s.motivo().strip(),
                EstadoCita.PENDIENTE, pago, hoy);
        return CitaRespuesta.desde(citas.save(cita));
    }

    // ------------------------------------------------------------------ consultas

    @Transactional(readOnly = true)
    public List<CitaRespuesta> mias() {
        return aRespuestas(citas.findByPacienteIdOrderByFechaAscHoraAsc(usuarioActual.obtener().id()));
    }

    /** RN-25: el nutricionista ve solo su agenda; su nutricionistaId sale del token. */
    @Transactional(readOnly = true)
    public List<CitaRespuesta> agenda(LocalDate desde, LocalDate hasta) {
        String nutricionistaId = usuarioActual.obtener().nutricionistaId();
        if (nutricionistaId == null || nutricionistaId.isBlank()) {
            throw ApiException.prohibido("Tu sesión no tiene un nutricionista asociado.");
        }
        return aRespuestas(citas.findByNutricionistaIdAndFechaBetweenOrderByFechaAscHoraAsc(nutricionistaId,
                desde == null ? SIN_DESDE : desde, hasta == null ? SIN_HASTA : hasta));
    }

    @Transactional(readOnly = true)
    public List<CitaRespuesta> listar(String pacienteId, String nutricionistaId, EstadoCita estado,
            LocalDate desde, LocalDate hasta) {
        return aRespuestas(citas.buscar(vacioANull(pacienteId), vacioANull(nutricionistaId), estado, desde, hasta));
    }

    @Transactional(readOnly = true)
    public CitaRespuesta obtener(String id) {
        Cita cita = citas.findById(id).orElseThrow(() -> noExiste(id));
        exigirCitaPropia(usuarioActual.obtener(), cita);
        return CitaRespuesta.desde(cita);
    }

    // ------------------------------------------------------------------ cambios

    /**
     * PATCH /api/citas/{id}/estado (RN-02 a RN-08, RN-24 a RN-26). La cita se lee con bloqueo:
     * si la secretaria confirma mientras el paciente cancela, el segundo ve el estado del primero.
     * Al cancelar, el reembolso va en la misma transacción (RN-08).
     */
    @Transactional
    public CitaRespuesta cambiarEstado(String id, EstadoCita nuevo) {
        Cita cita = citas.bloquear(id).orElseThrow(() -> noExiste(id));
        UsuarioAutenticado actor = usuarioActual.obtener();
        exigirCitaPropia(actor, cita);
        if (!ReglasCita.rolPuedeCambiarA(actor.rol(), nuevo)) {
            throw ApiException.prohibido("Tu rol no puede hacer ese cambio en la cita.");
        }
        boolean valida = ReglasCita.puedeTransicionar(cita.getEstado(), nuevo);
        if (valida && actor.tieneRol("PACIENTE") && !ReglasCita.puedeCancelar(cita, LocalDateTime.now(reloj))) {
            throw ApiException.conflicto(ReglasCita.MENSAJE_24H);
        }
        if (!valida) {
            throw ApiException.conflicto("No se puede pasar una cita " + cita.getEstado().name().toLowerCase()
                    + " a " + nuevo.name().toLowerCase() + ".");
        }
        cita.registrarCambio(nuevo, actor.id(), reloj.instant());
        if (nuevo == EstadoCita.CANCELADA && cita.getPago() != null
                && cita.getPago().getEstado() == EstadoPago.APROBADO) {
            cita.getPago().setEstado(EstadoPago.REEMBOLSADO);
        }
        return CitaRespuesta.desde(cita);
    }

    /**
     * PATCH /api/citas/{id}/reprogramar (RN-05, RN-06, RN-10 a RN-13). La cita vuelve a
     * PENDIENTE y queda en el historial. Se bloquea la agenda del día nuevo, igual que al crear.
     */
    @Transactional
    public CitaRespuesta reprogramar(String id, LocalDate fecha, LocalTime hora) {
        Cita cita = citas.bloquear(id).orElseThrow(() -> noExiste(id));
        UsuarioAutenticado actor = usuarioActual.obtener();
        exigirCitaPropia(actor, cita);
        if (!OCUPAN.contains(cita.getEstado())) throw ApiException.conflicto(SOLO_PENDIENTE_O_CONFIRMADA);
        LocalDateTime ahora = LocalDateTime.now(reloj);
        if (actor.tieneRol("PACIENTE") && !ReglasCita.puedeCancelar(cita, ahora)) {
            throw ApiException.conflicto(ReglasCita.MENSAJE_24H);
        }
        ReglasCita.validarFechaCita(fecha, ahora.toLocalDate())
                .ifPresent(m -> { throw ApiException.validacion("fecha", m); });
        HorarioNutricionista nutricionista = clinica.nutricionista(cita.getNutricionistaId())
                .orElseThrow(() -> ApiException.noEncontrado("El nutricionista elegido no existe."));

        agendas.bloquear(nutricionista.id(), fecha);
        exigirHoraLibre(nutricionista, fecha, hora, cita.getDuracionMin(), cita.getId(), ahora);
        cita.setFecha(fecha);
        cita.setHora(hora);
        cita.registrarCambio(EstadoCita.PENDIENTE, actor.id(), reloj.instant());
        return CitaRespuesta.desde(cita);
    }

    /** DELETE /api/citas/{id} (contrato §6.1): solo canceladas. El pago queda como registro. */
    @Transactional
    public void eliminar(String id) {
        Cita cita = citas.bloquear(id).orElseThrow(() -> noExiste(id));
        if (cita.getEstado() != EstadoCita.CANCELADA) throw ApiException.conflicto(SOLO_CANCELADA);
        citas.delete(cita);
    }

    /** GET /api/citas/estadisticas (RN-27), con todos los nutricionistas de ms-clinica. */
    @Transactional(readOnly = true)
    public Estadisticas estadisticas(LocalDate desde, LocalDate hasta) {
        if (desde.isAfter(hasta)) {
            throw ApiException.validacion("desde", "La fecha inicial no puede ser posterior a la final.");
        }
        List<String> ids = clinica.nutricionistas().stream().map(HorarioNutricionista::id).toList();
        return ReglasCita.calcularEstadisticas(citas.findByFechaBetween(desde, hasta), desde, hasta, ids);
    }

    // ------------------------------------------------------------------ auxiliares

    /**
     * La cita tiene que ser "suya": del paciente que la pidió o del nutricionista que la atiende.
     * Secretaria y admin ven y gestionan todas.
     */
    static void exigirCitaPropia(UsuarioAutenticado actor, Cita cita) {
        if (actor.tieneRol("PACIENTE") && !Objects.equals(cita.getPacienteId(), actor.id())) {
            throw ApiException.prohibido("Esa cita no es tuya.");
        }
        if (actor.tieneRol("NUTRICIONISTA") && !Objects.equals(cita.getNutricionistaId(), actor.nutricionistaId())) {
            throw ApiException.prohibido("Esa cita no está en tu agenda.");
        }
    }

    /** RN-10 a RN-12 con la misma función que GET /api/disponibilidad: se acepta lo que se ofrece. */
    private void exigirHoraLibre(HorarioNutricionista nutricionista, LocalDate fecha, LocalTime hora,
            Integer duracionMin, String idExcluido, LocalDateTime ahora) {
        List<Cita> otras = citas.findByNutricionistaIdAndFechaAndEstadoIn(nutricionista.id(), fecha, OCUPAN)
                .stream().filter(c -> !Objects.equals(c.getId(), idExcluido)).toList();
        if (!ReglasCita.horariosDisponibles(nutricionista, fecha, otras, duracionMin, ahora).contains(hora)) {
            throw ApiException.conflicto("hora", HORA_TOMADA);
        }
    }

    /** C0006, P0006…: el correlativo se lee con bloqueo, dos reservas nunca reciben el mismo número. */
    private String siguienteId(String nombre, String prefijo) {
        Contador contador = contadores.bloquear(nombre)
                .orElseGet(() -> contadores.save(new Contador(nombre, 0)));
        return String.format("%s%04d", prefijo, contador.siguiente());
    }

    private static ApiException noExiste(String id) {
        return ApiException.noEncontrado("La cita " + id + " no existe.");
    }

    private static String vacioANull(String texto) {
        return texto == null || texto.isBlank() ? null : texto;
    }

    private static List<CitaRespuesta> aRespuestas(List<Cita> lista) {
        return lista.stream().map(CitaRespuesta::desde).toList();
    }
}
