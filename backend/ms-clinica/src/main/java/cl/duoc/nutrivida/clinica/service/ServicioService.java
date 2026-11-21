package cl.duoc.nutrivida.clinica.service;

import cl.duoc.nutrivida.clinica.dto.ServicioRespuesta;
import cl.duoc.nutrivida.clinica.dto.ServicioSolicitud;
import cl.duoc.nutrivida.clinica.exception.ApiException;
import cl.duoc.nutrivida.clinica.model.Servicio;
import cl.duoc.nutrivida.clinica.repository.ServicioRepository;
import cl.duoc.nutrivida.clinica.security.UsuarioActual;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Catálogo de servicios (RF-CLI-01) y su administración (C-10). Lectura pública; crear, editar
 * y desactivar son del ADMIN (@PreAuthorize en el controlador). No hay DELETE: las citas guardan
 * el código del servicio, así que se desactiva y sale del catálogo.
 */
@Service
public class ServicioService {

    /** Mismo orden que el catálogo de EP2: consultas, planes, evaluaciones y talleres. */
    private static final Comparator<Servicio> ORDEN = Comparator
            .comparingInt((Servicio s) -> ReglasClinica.TIPOS_SERVICIO.indexOf(s.getTipo()))
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
        String buscado = ReglasClinica.quitarTildes(texto);
        return servicios.findAll().stream()
                .filter(s -> !soloActivos || Boolean.TRUE.equals(s.getActivo()))
                .filter(s -> tipo == null || tipo.isBlank() || tipo.equals(s.getTipo()))
                .filter(s -> buscado.isEmpty()
                        || ReglasClinica.quitarTildes(s.getNombre() + " " + s.getDescripcion()).contains(buscado))
                .sorted(ORDEN)
                .map(ServicioRespuesta::de)
                .toList();
    }

    @Transactional(readOnly = true)
    public ServicioRespuesta obtener(String codigo) {
        return ServicioRespuesta.de(buscar(codigo));
    }

    /** 409 si el código ya existe. La PK es la última barrera si dos admins crean el mismo a la vez. */
    @Transactional
    public ServicioRespuesta crear(ServicioSolicitud d) {
        exigirValido(ReglasClinica.validarServicio(d, true));
        String codigo = ReglasClinica.normalizarCodigo(d.codigo());
        if (servicios.existsById(codigo)) throw ApiException.conflicto("codigo", "Ya existe un servicio con ese código.");
        Servicio s = new Servicio(codigo);
        aplicar(s, d);
        s.setActivo(d.activo() == null || d.activo());
        return ServicioRespuesta.de(servicios.save(s));
    }

    /** PATCH: lo que no viene se mantiene. El código no cambia. Se valida el resultado completo. */
    @Transactional
    public ServicioRespuesta actualizar(String codigo, ServicioSolicitud cambios) {
        Servicio s = buscar(codigo);
        ServicioSolicitud mezcla = new ServicioSolicitud(codigo,
                valor(cambios.tipo(), s.getTipo()),
                valor(cambios.nombre(), s.getNombre()),
                cambios.duracionMin() != null ? cambios.duracionMin() : numero(s.getDuracionMin()),
                valor(cambios.modalidad(), s.getModalidad()),
                cambios.precio() != null ? cambios.precio() : numero(s.getPrecio()),
                valor(cambios.descripcion(), s.getDescripcion()),
                valor(cambios.destacado(), s.getDestacado()),
                cambios.cupoMax() != null ? cambios.cupoMax() : numero(s.getCupoMax()),
                valor(cambios.activo(), s.getActivo()));
        exigirValido(ReglasClinica.validarServicio(mezcla, false));
        aplicar(s, mezcla);
        s.setActivo(mezcla.activo());
        return ServicioRespuesta.de(s);
    }

    /** Desactivar lo saca del catálogo y de Solicitar cita; las citas ya tomadas no cambian. */
    @Transactional
    public ServicioRespuesta cambiarEstado(String codigo, boolean activo) {
        Servicio s = buscar(codigo);
        s.setActivo(activo);
        return ServicioRespuesta.de(s);
    }

    Servicio buscar(String codigo) {
        return servicios.findById(codigo).orElseThrow(() -> ApiException.noEncontrado("El servicio no existe."));
    }

    /** Igual que ajustarPorTipo de EP2: un plan no tiene duración y solo un taller tiene cupo. */
    private static void aplicar(Servicio s, ServicioSolicitud d) {
        s.setTipo(d.tipo());
        s.setNombre(d.nombre().trim());
        s.setDuracionMin("PLAN".equals(d.tipo()) ? null : d.duracionMin().intValueExact());
        s.setModalidad(d.modalidad());
        s.setPrecio(d.precio().intValueExact());
        s.setDescripcion(d.descripcion().trim());
        s.setDestacado(Boolean.TRUE.equals(d.destacado()));
        s.setCupoMax("TALLER".equals(d.tipo()) ? d.cupoMax().intValueExact() : null);
    }

    static void exigirValido(Map<String, String> errores) {
        if (errores.isEmpty()) return;
        String mensaje = errores.size() == 1 ? errores.values().iterator().next() : "Revisa los datos ingresados.";
        throw new ApiException(HttpStatus.BAD_REQUEST, mensaje, errores);
    }

    private static <T> T valor(T nuevo, T actual) {
        return nuevo != null ? nuevo : actual;
    }

    private static BigDecimal numero(Integer n) {
        return n == null ? null : BigDecimal.valueOf(n);
    }
}
