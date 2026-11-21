package cl.duoc.nutrivida.clinica.service;

import cl.duoc.nutrivida.clinica.dto.NutricionistaRespuesta;
import cl.duoc.nutrivida.clinica.exception.ApiException;
import cl.duoc.nutrivida.clinica.model.Nutricionista;
import cl.duoc.nutrivida.clinica.repository.FotoNutricionistaRepository;
import cl.duoc.nutrivida.clinica.repository.NutricionistaRepository;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Equipo de nutricionistas con su jornada. ms-citas pide esta lista para armar la agenda. */
@Service
public class NutricionistaService {

    private final NutricionistaRepository nutricionistas;
    private final FotoNutricionistaRepository fotos;

    public NutricionistaService(NutricionistaRepository nutricionistas, FotoNutricionistaRepository fotos) {
        this.nutricionistas = nutricionistas;
        this.fotos = fotos;
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

    Nutricionista buscar(String id) {
        return nutricionistas.findById(id).orElseThrow(() -> ApiException.noEncontrado("El nutricionista no existe."));
    }

    /** null sin foto. Con foto, ?v= cambia en cada subida y el navegador no muestra la anterior. */
    static String fotoUrl(String id, Instant version) {
        return version == null ? null : "/api/nutricionistas/" + id + "/foto?v=" + version.toEpochMilli();
    }
}
