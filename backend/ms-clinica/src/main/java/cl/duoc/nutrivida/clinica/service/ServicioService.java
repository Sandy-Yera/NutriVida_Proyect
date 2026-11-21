package cl.duoc.nutrivida.clinica.service;

import cl.duoc.nutrivida.clinica.dto.ServicioRespuesta;
import cl.duoc.nutrivida.clinica.exception.ApiException;
import cl.duoc.nutrivida.clinica.model.Servicio;
import cl.duoc.nutrivida.clinica.repository.ServicioRepository;
import cl.duoc.nutrivida.clinica.security.UsuarioActual;
import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Catálogo de servicios (RF-CLI-01). Lectura pública; los inactivos solo los ve el admin. */
@Service
public class ServicioService {

    /** Mismo orden que el catálogo de EP2: consultas, planes, evaluaciones y talleres. */
    private static final List<String> ORDEN_TIPOS = List.of("CONSULTA", "PLAN", "EVALUACION", "TALLER");
    private static final Comparator<Servicio> ORDEN = Comparator
            .comparingInt((Servicio s) -> ORDEN_TIPOS.indexOf(s.getTipo()))
            .thenComparing(Servicio::getCodigo);

    private final ServicioRepository servicios;
    private final UsuarioActual usuarioActual;

    public ServicioService(ServicioRepository servicios, UsuarioActual usuarioActual) {
        this.servicios = servicios;
        this.usuarioActual = usuarioActual;
    }

    /** Igual que filtrarServicios de EP2: por tipo y por texto en nombre o descripción, sin tildes. */
    @Transactional(readOnly = true)
    public List<ServicioRespuesta> listar(String tipo, String texto, boolean soloActivos) {
        if (!soloActivos && !usuarioActual.obtener().tieneRol("ADMIN")) {
            throw ApiException.prohibido("Solo el administrador ve los servicios desactivados.");
        }
        String buscado = sinTildes(texto);
        return servicios.findAll().stream()
                .filter(s -> !soloActivos || Boolean.TRUE.equals(s.getActivo()))
                .filter(s -> tipo == null || tipo.isBlank() || tipo.equals(s.getTipo()))
                .filter(s -> buscado.isEmpty() || sinTildes(s.getNombre() + " " + s.getDescripcion()).contains(buscado))
                .sorted(ORDEN)
                .map(ServicioRespuesta::de)
                .toList();
    }

    @Transactional(readOnly = true)
    public ServicioRespuesta obtener(String codigo) {
        return ServicioRespuesta.de(buscar(codigo));
    }

    Servicio buscar(String codigo) {
        return servicios.findById(codigo).orElseThrow(() -> ApiException.noEncontrado("El servicio no existe."));
    }

    private static String sinTildes(String valor) {
        String t = valor == null ? "" : valor.trim();
        return Normalizer.normalize(t, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase();
    }
}
