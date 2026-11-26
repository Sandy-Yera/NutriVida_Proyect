package cl.duoc.nutrivida.usuarios.dto;

/**
 * Token del contrato (§3) y la cuenta, para que el frontend arme la sesión sin otra llamada.
 * expiraEn va en segundos (8 h = 28800).
 */
public record LoginRespuesta(String token, String tipo, long expiraEn, UsuarioRespuesta usuario) {
}
