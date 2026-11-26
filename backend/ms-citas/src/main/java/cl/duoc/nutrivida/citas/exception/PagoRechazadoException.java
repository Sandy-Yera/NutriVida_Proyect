package cl.duoc.nutrivida.citas.exception;

import org.springframework.http.HttpStatus;

/**
 * 402 de POST /api/citas: el banco simulado rechazó la tarjeta (RN-19). CitaService la lanza con
 * noRollbackFor, así el pago RECHAZADO queda guardado (contrato §5) pero la cita no se crea.
 */
public class PagoRechazadoException extends ApiException {

    private final String pagoId;

    public PagoRechazadoException(String motivo, String pagoId) {
        super(HttpStatus.PAYMENT_REQUIRED, motivo);
        this.pagoId = pagoId;
    }

    public String getPagoId() { return pagoId; }
}
