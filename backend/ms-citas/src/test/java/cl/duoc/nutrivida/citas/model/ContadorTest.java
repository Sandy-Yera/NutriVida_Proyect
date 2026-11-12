package cl.duoc.nutrivida.citas.model;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** El correlativo de IDs: cada llamada entrega el número siguiente y lo deja guardado. */
class ContadorTest {

    @Test
    @DisplayName("siguiente() avanza de a uno desde el último entregado (C0005 → C0006 → C0007)")
    void avanzaDeAUno() {
        Contador citas = new Contador(Contador.CITA, 5);
        assertThat(citas.siguiente()).isEqualTo(6);
        assertThat(citas.siguiente()).isEqualTo(7);
        assertThat(citas.getUltimo()).isEqualTo(7);
        assertThat(citas.getNombre()).isEqualTo("CITA");
    }
}
