package cl.duoc.nutrivida.clinica.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Cuerpo de POST /api/contactos. Reglas y mensajes de validarContacto (EP2). */
public record ContactoSolicitud(
        @Schema(example = "Ana Pérez") String nombre,
        @Schema(example = "ana.perez@ejemplo.cl") String correo,
        @Schema(example = "+56 9 1234 5678") String telefono,
        @Schema(example = "Planes y precios", allowableValues = {"Consulta general", "Agendamiento de horas", "Planes y precios", "Talleres grupales", "Otro"}) String motivo,
        @Schema(example = "¿Tienen planes para deportistas de fin de semana?") String mensaje) {
}
