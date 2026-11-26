package cl.duoc.nutrivida.citas.model;

/**
 * RN-19: un pago se aprueba o se rechaza. RN-08: al cancelar la cita, el pago aprobado pasa
 * a REEMBOLSADO. Solo los APROBADOS suman en el total recaudado (RN-27).
 */
public enum EstadoPago {
    APROBADO,
    RECHAZADO,
    REEMBOLSADO
}
