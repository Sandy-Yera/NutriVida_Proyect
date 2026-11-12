package cl.duoc.nutrivida.citas.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Firma y valida el JWT del contrato: HS256, 8 h, claims sub, rol, nombre y nutricionistaId.
 * El secreto (JWT_SECRET) es el mismo en los 3 microservicios: ms-usuarios lo emite al iniciar
 * sesión y ms-citas y ms-clinica solo lo validan.
 */
@Service
public class JwtService {

    private final SecretKey clave;
    private final Duration vigencia;

    public JwtService(@Value("${nutrivida.jwt.secreto}") String secreto,
            @Value("${nutrivida.jwt.horas:8}") long horas) {
        byte[] bytes = secreto.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET debe tener al menos 32 caracteres (HS256).");
        }
        this.clave = Keys.hmacShaKeyFor(bytes);
        this.vigencia = Duration.ofHours(horas);
    }

    public String generar(UsuarioAutenticado usuario) {
        Instant ahora = Instant.now();
        var builder = Jwts.builder()
                .subject(usuario.id())
                .claim("rol", usuario.rol())
                .claim("nombre", usuario.nombre())
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(ahora.plus(vigencia)))
                .signWith(clave);
        if (usuario.nutricionistaId() != null) builder.claim("nutricionistaId", usuario.nutricionistaId());
        return builder.compact();
    }

    /** Lanza io.jsonwebtoken.JwtException si la firma no calza o el token venció. */
    public UsuarioAutenticado validar(String token) {
        Claims c = Jwts.parser().verifyWith(clave).build().parseSignedClaims(token).getPayload();
        return new UsuarioAutenticado(
                c.getSubject(),
                c.get("rol", String.class),
                c.get("nombre", String.class),
                c.get("nutricionistaId", String.class));
    }

    public Duration getVigencia() { return vigencia; }
}
