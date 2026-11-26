package cl.duoc.nutrivida.citas.client;

import java.util.Map;

/**
 * ms-usuarios simulado con las semillas de EP2 (frontend/src/data/semillas/usuarios.js): las 9
 * cuentas de EP2, todas activas. Un usuario que no está en las semillas (por ejemplo, un paciente
 * recién registrado en el frontend) queda DESCONOCIDA: las semillas no pueden saber de él, así
 * que no se le niega el acceso.
 */
public class UsuariosSimulado implements UsuariosClient {

    private static final Map<String, Boolean> ACTIVOS = Map.of(
            "U001", true,   // admin
            "U002", true,   // secretaria
            "U010", true, "U011", true, "U012", true, "U013", true,   // nutricionistas
            "U100", true, "U101", true, "U102", true);                // pacientes

    @Override
    public EstadoCuenta estado(String usuarioId) {
        Boolean activo = usuarioId == null ? null : ACTIVOS.get(usuarioId);
        if (activo == null) return EstadoCuenta.DESCONOCIDA;
        return activo ? EstadoCuenta.ACTIVA : EstadoCuenta.DESACTIVADA;
    }
}
