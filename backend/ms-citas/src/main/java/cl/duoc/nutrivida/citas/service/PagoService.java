package cl.duoc.nutrivida.citas.service;

import cl.duoc.nutrivida.citas.dto.PagoRespuesta;
import cl.duoc.nutrivida.citas.exception.ApiException;
import cl.duoc.nutrivida.citas.model.Cita;
import cl.duoc.nutrivida.citas.model.Pago;
import cl.duoc.nutrivida.citas.repository.CitaRepository;
import cl.duoc.nutrivida.citas.repository.PagoRepository;
import cl.duoc.nutrivida.citas.security.UsuarioActual;
import cl.duoc.nutrivida.citas.security.UsuarioAutenticado;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Comprobantes (GET /api/pagos). Los pagos se crean solo dentro de POST /api/citas (CitaService):
 * aquí solo se leen. citaId se resuelve por cita.pago_id, el único lugar donde vive el enlace.
 */
@Service
public class PagoService {

    private final PagoRepository pagos;
    private final CitaRepository citas;
    private final UsuarioActual usuarioActual;

    public PagoService(PagoRepository pagos, CitaRepository citas, UsuarioActual usuarioActual) {
        this.pagos = pagos;
        this.citas = citas;
        this.usuarioActual = usuarioActual;
    }

    /** RN-21: el comprobante lo ve quien pagó o el admin. */
    @Transactional(readOnly = true)
    public PagoRespuesta obtener(String id) {
        Pago pago = pagos.findById(id).orElseThrow(() -> ApiException.noEncontrado("El pago " + id + " no existe."));
        UsuarioAutenticado actor = usuarioActual.obtener();
        if (!actor.tieneRol("ADMIN") && !pago.getPacienteId().equals(actor.id())) {
            throw ApiException.prohibido("Ese pago no es tuyo.");
        }
        return PagoRespuesta.desde(pago, citas.findByPago_Id(id).map(Cita::getId).orElse(null));
    }

    /** S-08 (admin): todos los pagos o solo los de ciertas citas, como listarPagos de EP2. */
    @Transactional(readOnly = true)
    public List<PagoRespuesta> listar(Collection<String> citaIds) {
        if (citaIds != null && !citaIds.isEmpty()) {
            return citas.findAllById(citaIds).stream()
                    .filter(c -> c.getPago() != null)
                    .sorted((a, b) -> a.getPago().getId().compareTo(b.getPago().getId()))
                    .map(c -> PagoRespuesta.desde(c.getPago(), c.getId()))
                    .toList();
        }
        List<Pago> todos = pagos.findAll(Sort.by("id"));
        Map<String, String> citaPorPago = citas.findByPago_IdIn(todos.stream().map(Pago::getId).toList()).stream()
                .collect(Collectors.toMap(c -> c.getPago().getId(), Cita::getId));
        return todos.stream().map(p -> PagoRespuesta.desde(p, citaPorPago.get(p.getId()))).toList();
    }
}
