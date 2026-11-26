package cl.duoc.nutrivida.clinica.service;

import cl.duoc.nutrivida.clinica.dto.NutricionistaRespuesta;
import cl.duoc.nutrivida.clinica.exception.ApiException;
import cl.duoc.nutrivida.clinica.model.FotoNutricionista;
import cl.duoc.nutrivida.clinica.model.Nutricionista;
import cl.duoc.nutrivida.clinica.repository.FotoNutricionistaRepository;
import cl.duoc.nutrivida.clinica.repository.NutricionistaRepository;
import cl.duoc.nutrivida.clinica.security.UsuarioActual;
import cl.duoc.nutrivida.clinica.security.UsuarioAutenticado;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Equipo de nutricionistas con su jornada (ms-citas pide esta lista para la agenda) y foto de
 * perfil. La foto la cambia el propio nutricionista o el admin; nadie más (igual que EP2).
 */
@Service
public class NutricionistaService {

    /** utils/fotos.js de EP2: JPG, PNG o WebP de hasta 2 MB. */
    static final List<String> TIPOS_FOTO = List.of("image/jpeg", "image/png", "image/webp");
    static final long MAX_FOTO = 2L * 1024 * 1024;

    private final NutricionistaRepository nutricionistas;
    private final FotoNutricionistaRepository fotos;
    private final UsuarioActual usuarioActual;
    private final Clock reloj;

    public NutricionistaService(NutricionistaRepository nutricionistas, FotoNutricionistaRepository fotos,
            UsuarioActual usuarioActual, Clock reloj) {
        this.nutricionistas = nutricionistas;
        this.fotos = fotos;
        this.usuarioActual = usuarioActual;
        this.reloj = reloj;
    }

    @Transactional(readOnly = true)
    public List<NutricionistaRespuesta> listar() {
        Map<String, Instant> versiones = new HashMap<>();
        fotos.versiones().forEach(f -> versiones.put((String) f[0], (Instant) f[1]));
        return nutricionistas.findAllByOrderByIdAsc().stream()
                .map(n -> NutricionistaRespuesta.de(n, fotoUrl(n.getId(), versiones.get(n.getId()))))
                .toList();
    }

    @Transactional(readOnly = true)
    public NutricionistaRespuesta obtener(String id) {
        Nutricionista n = buscar(id);
        return NutricionistaRespuesta.de(n, fotoUrl(id, fotos.version(id)));
    }

    @Transactional(readOnly = true)
    public FotoNutricionista foto(String id) {
        return fotos.findById(id).orElseThrow(() -> ApiException.noEncontrado("Este nutricionista no tiene foto."));
    }

    /** 413 si pesa más de 2 MB y 415 si no es JPG, PNG ni WebP (mismos códigos que EP2). */
    @Transactional
    public NutricionistaRespuesta actualizarFoto(String id, MultipartFile archivo) {
        Nutricionista n = exigirPermisoFoto(id);
        if (archivo == null || archivo.isEmpty()) throw ApiException.validacion("foto", "Elige una imagen.");
        if (archivo.getContentType() == null || !TIPOS_FOTO.contains(archivo.getContentType())) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "La foto debe ser JPG, PNG o WebP.",
                    Map.of("foto", "La foto debe ser JPG, PNG o WebP."));
        }
        if (archivo.getSize() > MAX_FOTO) {
            throw new ApiException(HttpStatus.CONTENT_TOO_LARGE, "La foto no puede superar los 2 MB.",
                    Map.of("foto", "La foto no puede superar los 2 MB."));
        }
        Instant ahora = reloj.instant();
        fotos.save(new FotoNutricionista(id, archivo.getContentType(), bytes(archivo), ahora));
        return NutricionistaRespuesta.de(n, fotoUrl(id, ahora));
    }

    @Transactional
    public void eliminarFoto(String id) {
        exigirPermisoFoto(id);
        fotos.deleteById(id);
    }

    Nutricionista buscar(String id) {
        return nutricionistas.findById(id).orElseThrow(() -> ApiException.noEncontrado("El nutricionista no existe."));
    }

    private Nutricionista exigirPermisoFoto(String id) {
        UsuarioAutenticado u = usuarioActual.obtener();
        boolean esPropio = u.tieneRol("NUTRICIONISTA") && id.equals(u.nutricionistaId());
        if (!u.tieneRol("ADMIN") && !esPropio) throw ApiException.prohibido("Solo puedes cambiar tu propia foto.");
        return buscar(id);
    }

    private static byte[] bytes(MultipartFile archivo) {
        try {
            return archivo.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** null sin foto. Con foto, ?v= cambia en cada subida y el navegador no muestra la anterior. */
    static String fotoUrl(String id, Instant version) {
        return version == null ? null : "/api/nutricionistas/" + id + "/foto?v=" + version.toEpochMilli();
    }
}
