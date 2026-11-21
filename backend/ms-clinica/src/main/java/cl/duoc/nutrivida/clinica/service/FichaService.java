package cl.duoc.nutrivida.clinica.service;

import static cl.duoc.nutrivida.clinica.service.ServicioService.exigirValido;

import cl.duoc.nutrivida.clinica.dto.FichaRespuesta;
import cl.duoc.nutrivida.clinica.dto.FichaSolicitud;
import cl.duoc.nutrivida.clinica.dto.MedicionRespuesta;
import cl.duoc.nutrivida.clinica.dto.MedicionSolicitud;
import cl.duoc.nutrivida.clinica.dto.PlanRespuesta;
import cl.duoc.nutrivida.clinica.dto.PlanSolicitud;
import cl.duoc.nutrivida.clinica.exception.ApiException;
import cl.duoc.nutrivida.clinica.model.Ficha;
import cl.duoc.nutrivida.clinica.model.Medicion;
import cl.duoc.nutrivida.clinica.model.PlanAlimentario;
import cl.duoc.nutrivida.clinica.repository.FichaRepository;
import cl.duoc.nutrivida.clinica.repository.MedicionRepository;
import cl.duoc.nutrivida.clinica.repository.PlanAlimentarioRepository;
import cl.duoc.nutrivida.clinica.security.UsuarioActual;
import cl.duoc.nutrivida.clinica.security.UsuarioAutenticado;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ficha clínica, mediciones y planes (RF-CLI-06 a 08). Mismas reglas de acceso que
 * fichasService.js de EP2, ahora con el usuario del token:
 * - el nutricionista a cargo lee y escribe;
 * - el propio paciente lee su ficha, sus mediciones y su plan (Mi progreso);
 * - el admin lee;
 * - otro nutricionista solo sabe de quién es la ficha; cualquier otro recibe 403.
 */
@Service
public class FichaService {

    private final FichaRepository fichas;
    private final MedicionRepository mediciones;
    private final PlanAlimentarioRepository planes;
    private final Correlativos correlativos;
    private final UsuarioActual usuarioActual;
    private final Clock reloj;

    public FichaService(FichaRepository fichas, MedicionRepository mediciones, PlanAlimentarioRepository planes,
            Correlativos correlativos, UsuarioActual usuarioActual, Clock reloj) {
        this.fichas = fichas;
        this.mediciones = mediciones;
        this.planes = planes;
        this.correlativos = correlativos;
        this.usuarioActual = usuarioActual;
        this.reloj = reloj;
    }

    // ------------------------------------------------------------------ fichas

    /** El nutricionista ve solo sus pacientes; el admin, los de cualquiera (o todos sin filtro). */
    @Transactional(readOnly = true)
    public List<FichaRespuesta> listar(String nutricionistaId) {
        UsuarioAutenticado u = usuarioActual.obtener();
        String filtro = nutricionistaId;
        if (u.tieneRol("NUTRICIONISTA")) {
            if (filtro != null && !filtro.equals(u.nutricionistaId())) {
                throw ApiException.prohibido("Solo puedes ver tus propios pacientes.");
            }
            filtro = u.nutricionistaId();
        }
        List<Ficha> lista = filtro == null || filtro.isBlank()
                ? fichas.findAllByOrderByPacienteIdAsc()
                : fichas.findByNutricionistaIdOrderByPacienteIdAsc(filtro);
        return lista.stream().map(FichaRespuesta::de).toList();
    }

    /** Un nutricionista que no está a cargo recibe solo { id, nutricionistaId }, nunca los datos. */
    @Transactional(readOnly = true)
    public FichaRespuesta obtener(String pacienteId) {
        UsuarioAutenticado u = usuarioActual.obtener();
        Ficha f = fichas.findById(pacienteId)
                .orElseThrow(() -> ApiException.noEncontrado("El paciente no tiene ficha."));
        if (u.tieneRol("ADMIN") || aCargo(u, f) || esElPaciente(u, pacienteId)) return FichaRespuesta.de(f);
        if (u.tieneRol("NUTRICIONISTA")) return FichaRespuesta.soloDuenio(f);
        throw ApiException.prohibido("No tienes acceso a la ficha de este paciente.");
    }

    /** El nutricionista crea la ficha a su propio nombre. 409 si el paciente ya tiene una. */
    @Transactional
    public FichaRespuesta crear(FichaSolicitud d) {
        UsuarioAutenticado u = usuarioActual.obtener();
        if (d.nutricionistaId() != null && !d.nutricionistaId().equals(u.nutricionistaId())) {
            throw ApiException.prohibido("Solo puedes crear fichas a tu nombre.");
        }
        if (ReglasClinica.texto(d.id()).isEmpty()) {
            throw ApiException.validacion("id", "La ficha necesita el paciente y el nutricionista a cargo.");
        }
        exigirValido(ReglasClinica.validarFicha(d));
        String pacienteId = d.id().trim();
        if (fichas.existsById(pacienteId)) throw ApiException.conflicto("Este paciente ya tiene ficha.");
        Ficha f = new Ficha(pacienteId, u.nutricionistaId(), d.objetivo(), d.antecedentes().trim(), hoy());
        return FichaRespuesta.de(fichas.save(f));
    }

    // ------------------------------------------------------------------ mediciones

    @Transactional(readOnly = true)
    public List<MedicionRespuesta> listarMediciones(String pacienteId) {
        exigirLectura(pacienteId);
        return mediciones.findByPacienteIdOrderByFechaAscIdAsc(pacienteId).stream().map(MedicionRespuesta::de).toList();
    }

    @Transactional
    public MedicionRespuesta registrarMedicion(String pacienteId, MedicionSolicitud d) {
        UsuarioAutenticado u = exigirEscritura(pacienteId);
        Map<String, String> errores = ReglasClinica.validarMedicion(d, hoy());
        if (!errores.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La medición tiene datos fuera de rango.", errores);
        }
        String id = correlativos.siguiente(Correlativos.MEDICION, "M", 4);
        Medicion m = new Medicion(id, pacienteId, u.nutricionistaId(), d.fecha(), unDecimal(d.pesoKg()),
                unDecimal(d.tallaCm()), unDecimal(d.cinturaCm()), unDecimal(d.caderaCm()), unDecimal(d.grasaPct()),
                ReglasClinica.texto(d.notas()));
        return MedicionRespuesta.de(mediciones.save(m));
    }

    // ------------------------------------------------------------------ planes

    @Transactional(readOnly = true)
    public PlanRespuesta planVigente(String pacienteId) {
        exigirLectura(pacienteId);
        return planes.findFirstByPacienteIdOrderByVigenteDesdeDescIdDesc(pacienteId).map(PlanRespuesta::de)
                .orElseThrow(() -> ApiException.noEncontrado("El paciente aún no tiene plan."));
    }

    /** Con id de un plan del paciente lo corrige; sin id crea uno nuevo (igual que guardarPlan de EP2). */
    @Transactional
    public PlanRespuesta guardarPlan(String pacienteId, PlanSolicitud d) {
        UsuarioAutenticado u = exigirEscritura(pacienteId);
        exigirValido(ReglasClinica.validarPlan(d));
        PlanAlimentario p = d.id() == null ? null
                : planes.findById(d.id()).filter(x -> x.getPacienteId().equals(pacienteId)).orElse(null);
        if (p == null) p = new PlanAlimentario(correlativos.siguiente(Correlativos.PLAN, "PA", 3), pacienteId);
        p.llenar(u.nutricionistaId(), d.vigenteDesde() != null ? d.vigenteDesde() : hoy(), d.objetivo().trim(),
                d.kcalDiarias().intValueExact(), d.comidas().desayuno().trim(), d.comidas().colacion().trim(),
                d.comidas().almuerzo().trim(), d.comidas().once().trim(), d.comidas().cena().trim(),
                ReglasClinica.texto(d.indicaciones()));
        return PlanRespuesta.de(planes.save(p));
    }

    // ------------------------------------------------------------------ reglas de acceso

    private void exigirLectura(String pacienteId) {
        UsuarioAutenticado u = usuarioActual.obtener();
        if (u.tieneRol("ADMIN") || esElPaciente(u, pacienteId)) return;
        if (fichas.findById(pacienteId).filter(f -> aCargo(u, f)).isPresent()) return;
        throw ApiException.prohibido("No tienes acceso a la ficha de este paciente.");
    }

    private UsuarioAutenticado exigirEscritura(String pacienteId) {
        UsuarioAutenticado u = usuarioActual.obtener();
        Ficha f = fichas.findById(pacienteId).orElseThrow(
                () -> ApiException.noEncontrado("El paciente no tiene ficha: créala antes de continuar."));
        if (!aCargo(u, f)) throw ApiException.prohibido("Solo el nutricionista a cargo puede modificar esta ficha.");
        return u;
    }

    private static boolean aCargo(UsuarioAutenticado u, Ficha f) {
        return u.tieneRol("NUTRICIONISTA") && f.getNutricionistaId().equals(u.nutricionistaId());
    }

    private static boolean esElPaciente(UsuarioAutenticado u, String pacienteId) {
        return u.tieneRol("PACIENTE") && pacienteId.equals(u.id());
    }

    private LocalDate hoy() {
        return LocalDate.now(reloj);
    }

    /** Las columnas son DECIMAL(…,1): se redondea aquí y no en silencio en la base. */
    private static BigDecimal unDecimal(BigDecimal n) {
        return n == null ? null : n.setScale(1, RoundingMode.HALF_UP);
    }
}
