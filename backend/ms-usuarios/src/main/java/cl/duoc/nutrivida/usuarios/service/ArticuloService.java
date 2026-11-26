package cl.duoc.nutrivida.usuarios.service;

import cl.duoc.nutrivida.usuarios.dto.ArticuloRespuesta;
import cl.duoc.nutrivida.usuarios.exception.ApiException;
import cl.duoc.nutrivida.usuarios.repository.ArticuloRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Consejos nutricionales (RF-ACC-09): solo lectura, como en EP2. */
@Service
public class ArticuloService {

    private final ArticuloRepository articulos;

    public ArticuloService(ArticuloRepository articulos) {
        this.articulos = articulos;
    }

    @Transactional(readOnly = true)
    public List<ArticuloRespuesta> listar() {
        return articulos.findAllByOrderByFechaDesc().stream().map(ArticuloRespuesta::de).toList();
    }

    @Transactional(readOnly = true)
    public ArticuloRespuesta obtener(String id) {
        return articulos.findById(id).map(ArticuloRespuesta::de)
                .orElseThrow(() -> ApiException.noEncontrado("El consejo que buscas no existe."));
    }
}
