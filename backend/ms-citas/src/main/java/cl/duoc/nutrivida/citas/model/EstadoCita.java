package cl.duoc.nutrivida.citas.model;

/**
 * RN-01: estados de una cita. Las transiciones permitidas (RN-02) están en service.ReglasCita.
 * ATENDIDA, CANCELADA e INASISTENCIA son finales.
 */
public enum EstadoCita {
    PENDIENTE,
    CONFIRMADA,
    ATENDIDA,
    CANCELADA,
    INASISTENCIA;

    /** RN-10: solo las citas pendientes o confirmadas ocupan horario en la agenda. */
    public boolean ocupaAgenda() {
        return this == PENDIENTE || this == CONFIRMADA;
    }
}
