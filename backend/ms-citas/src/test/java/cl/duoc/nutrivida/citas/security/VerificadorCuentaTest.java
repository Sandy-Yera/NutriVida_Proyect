package cl.duoc.nutrivida.citas.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import cl.duoc.nutrivida.citas.client.UsuariosClient;
import cl.duoc.nutrivida.citas.client.UsuariosClient.EstadoCuenta;
import cl.duoc.nutrivida.citas.client.UsuariosNoDisponibleException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** R8: la cuenta se revisa en cada petición, pero la respuesta de ms-usuarios se recuerda 30 s. */
class VerificadorCuentaTest {

    /** Un reloj que la prueba adelanta a mano. */
    static class RelojManual extends Clock {
        Instant ahora = Instant.parse("2026-11-16T11:00:00Z");
        void avanzar(Duration d) { ahora = ahora.plus(d); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zona) { return this; }
        @Override public Instant instant() { return ahora; }
    }

    UsuariosClient usuarios;
    RelojManual reloj;
    VerificadorCuenta verificador;

    @BeforeEach
    void preparar() {
        usuarios = mock(UsuariosClient.class);
        reloj = new RelojManual();
        verificador = new VerificadorCuenta(usuarios, reloj, 30);
    }

    @Test
    @DisplayName("activa y desconocida pueden entrar; desactivada no")
    void segunElEstado() {
        given(usuarios.estado("U100")).willReturn(EstadoCuenta.ACTIVA);
        given(usuarios.estado("U555")).willReturn(EstadoCuenta.DESCONOCIDA);
        given(usuarios.estado("U900")).willReturn(EstadoCuenta.DESACTIVADA);
        assertThat(verificador.puedeEntrar("U100")).isTrue();
        assertThat(verificador.puedeEntrar("U555")).isTrue();
        assertThat(verificador.puedeEntrar("U900")).isFalse();
    }

    @Test
    @DisplayName("dentro de los 30 s no vuelve a preguntar; al cumplirse, sí, y ve el cambio")
    void recuerda30Segundos() {
        given(usuarios.estado("U100")).willReturn(EstadoCuenta.ACTIVA);
        assertThat(verificador.puedeEntrar("U100")).isTrue();
        reloj.avanzar(Duration.ofSeconds(29));
        assertThat(verificador.puedeEntrar("U100")).isTrue();
        verify(usuarios, times(1)).estado("U100");

        given(usuarios.estado("U100")).willReturn(EstadoCuenta.DESACTIVADA);
        reloj.avanzar(Duration.ofSeconds(1));
        assertThat(verificador.puedeEntrar("U100")).as("a los 30 s se desactiva").isFalse();
        verify(usuarios, times(2)).estado("U100");
    }

    @Test
    @DisplayName("cada usuario tiene su propio recuerdo")
    void porUsuario() {
        given(usuarios.estado("U100")).willReturn(EstadoCuenta.ACTIVA);
        given(usuarios.estado("U101")).willReturn(EstadoCuenta.DESACTIVADA);
        assertThat(verificador.puedeEntrar("U100")).isTrue();
        assertThat(verificador.puedeEntrar("U101")).isFalse();
        assertThat(verificador.puedeEntrar("U100")).isTrue();
        verify(usuarios, times(1)).estado("U100");
    }

    @Test
    @DisplayName("si ms-usuarios no responde, el error sube (503) y no se recuerda")
    void errorNoSeRecuerda() {
        given(usuarios.estado("U100"))
                .willThrow(new UsuariosNoDisponibleException("caído", false, null))
                .willReturn(EstadoCuenta.ACTIVA);
        assertThatThrownBy(() -> verificador.puedeEntrar("U100")).isInstanceOf(UsuariosNoDisponibleException.class);
        assertThat(verificador.puedeEntrar("U100")).isTrue();
    }
}
