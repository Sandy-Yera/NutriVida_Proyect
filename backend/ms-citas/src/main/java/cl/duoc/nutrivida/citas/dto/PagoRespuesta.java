package cl.duoc.nutrivida.citas.dto;

import cl.duoc.nutrivida.citas.model.EstadoPago;
import cl.duoc.nutrivida.citas.model.Pago;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

/**
 * El comprobante de un pago, con los campos de EP2 (pagosSemilla). citaId no está en la tabla
 * pago: se busca por cita.pago_id (el enlace vive en un solo lugar, 3FN). De la tarjeta solo
 * viajan los 4 últimos dígitos.
 */
@Schema(description = "Comprobante de pago (RN-21: solo los 4 últimos dígitos)")
public record PagoRespuesta(
        @Schema(example = "P0006") String id,
        @Schema(example = "C0006") String citaId,
        @Schema(example = "25000") Integer monto,
        @Schema(example = "4242") String ultimos4,
        EstadoPago estado,
        @Schema(example = "El banco rechazó la tarjeta.") String motivo,
        LocalDate fecha) {

    public static PagoRespuesta desde(Pago p, String citaId) {
        return new PagoRespuesta(p.getId(), citaId, p.getMonto(), p.getUltimos4(), p.getEstado(), p.getMotivo(),
                p.getFecha());
    }
}
