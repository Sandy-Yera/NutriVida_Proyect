package cl.duoc.nutrivida.usuarios.dto;

import cl.duoc.nutrivida.usuarios.model.Articulo;
import java.time.LocalDate;

/** Consejo con los campos de EP2 (data/semillas/articulos.js). */
public record ArticuloRespuesta(String id, String titulo, String resumen, String contenido,
        String autorNutricionistaId, LocalDate fecha) {

    public static ArticuloRespuesta de(Articulo a) {
        return new ArticuloRespuesta(a.getId(), a.getTitulo(), a.getResumen(), a.getContenido(),
                a.getAutorNutricionistaId(), a.getFecha());
    }
}
