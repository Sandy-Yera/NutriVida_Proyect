package cl.duoc.nutrivida.clinica.dto;

import cl.duoc.nutrivida.clinica.model.Servicio;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Un servicio con los mismos campos que serviciosSemilla de EP2. ms-citas lee codigo, tipo,
 * nombre, duracionMin, modalidad, precio y activo (contrato, integracion-ep3.md §7.3).
 * cupoMax solo viaja en los talleres, como en EP2.
 */
public record ServicioRespuesta(String codigo, String tipo, String nombre, Integer duracionMin, String modalidad,
        Integer precio, String descripcion, Boolean destacado,
        @JsonInclude(JsonInclude.Include.NON_NULL) Integer cupoMax, Boolean activo) {

    public static ServicioRespuesta de(Servicio s) {
        return new ServicioRespuesta(s.getCodigo(), s.getTipo(), s.getNombre(), s.getDuracionMin(), s.getModalidad(),
                s.getPrecio(), s.getDescripcion(), s.getDestacado(), s.getCupoMax(), s.getActivo());
    }
}
