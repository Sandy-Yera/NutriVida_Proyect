package cl.duoc.nutrivida.citas.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Un servicio del catálogo, tal como lo entrega ms-clinica (GET /api/servicios). Son los mismos
 * campos que serviciosSemilla de EP2; ms-citas usa solo estos y no lee el resto (descripción,
 * cupoMax…). duracionMin es null en los planes, que no se agendan como una sola cita.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ServicioClinica(String codigo, String tipo, String nombre, Integer duracionMin, String modalidad,
        Integer precio, Boolean activo) {

    /** Igual que EP2 (citasService.js): "Presencial" y "Presencial (grupo)" son presenciales. */
    public boolean esPresencial() {
        return modalidad != null && modalidad.startsWith("Presencial");
    }

    /** Si ms-clinica no envía "activo", el servicio cuenta como activo (el catálogo público lista los activos). */
    public boolean estaActivo() {
        return !Boolean.FALSE.equals(activo);
    }
}
