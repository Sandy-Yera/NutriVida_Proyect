package cl.duoc.nutrivida.citas.service;

import static org.assertj.core.api.Assertions.assertThat;

import cl.duoc.nutrivida.citas.dto.Tarjeta;
import cl.duoc.nutrivida.citas.model.EstadoPago;
import cl.duoc.nutrivida.citas.model.Pago;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * R5: validación y simulación del pago. Cada caso repite uno de frontend/src/utils/pagos.test.js
 * (EP2), con los mismos mensajes.
 */
class ReglasPagoTest {

    static final LocalDate OCTUBRE_2026 = LocalDate.of(2026, 10, 16);
    static final Tarjeta VALIDA = new Tarjeta("Javiera Soto", "4242 4242 4242 4242", "12/27", "123");

    @Test
    @DisplayName("validarTarjeta: acepta las dos tarjetas de prueba, con o sin espacios")
    void tarjetasDePrueba() {
        assertThat(ReglasPago.validarTarjeta("4242 4242 4242 4242")).isEmpty();
        assertThat(ReglasPago.validarTarjeta("4000000000000002")).isEmpty();
    }

    @Test
    @DisplayName("validarTarjeta: rechaza un número que no pasa el algoritmo de Luhn")
    void luhn() {
        assertThat(ReglasPago.pasaLuhn("4242424242424241")).isFalse();
        assertThat(ReglasPago.validarTarjeta("4242 4242 4242 4241")).hasValue("El número de la tarjeta no es válido. Revísalo.");
    }

    @Test
    @DisplayName("validarTarjeta: pide 16 dígitos y avisa si viene vacío")
    void largo() {
        assertThat(ReglasPago.validarTarjeta("4242 4242")).hasValue("El número de la tarjeta debe tener 16 dígitos.");
        assertThat(ReglasPago.validarTarjeta("")).hasValue("Ingresa el número de la tarjeta.");
        assertThat(ReglasPago.validarTarjeta(null)).hasValue("Ingresa el número de la tarjeta.");
    }

    @Test
    @DisplayName("validarVencimiento: acepta una tarjeta que vence este mes o después y rechaza una vencida")
    void vencimiento() {
        assertThat(ReglasPago.validarVencimiento("10/26", OCTUBRE_2026)).isEmpty();
        assertThat(ReglasPago.validarVencimiento("01/28", OCTUBRE_2026)).isEmpty();
        assertThat(ReglasPago.validarVencimiento("09/26", OCTUBRE_2026)).hasValue("La tarjeta está vencida.");
    }

    @Test
    @DisplayName("validarVencimiento: exige el formato MM/AA y un mes válido")
    void formatoVencimiento() {
        assertThat(ReglasPago.validarVencimiento("1026", OCTUBRE_2026)).hasValue("Escribe el vencimiento como MM/AA.");
        assertThat(ReglasPago.validarVencimiento("13/27", OCTUBRE_2026)).hasValue("El mes del vencimiento debe estar entre 01 y 12.");
    }

    @Test
    @DisplayName("validarCvv y validarTitular: CVV de exactamente 3 dígitos y titular obligatorio")
    void cvvYTitular() {
        assertThat(ReglasPago.validarCvv("123")).isEmpty();
        assertThat(ReglasPago.validarCvv("12")).hasValue("El CVV debe tener 3 dígitos.");
        assertThat(ReglasPago.validarCvv("12a")).hasValue("El CVV debe tener 3 dígitos.");
        assertThat(ReglasPago.validarTitular("Javiera Soto")).isEmpty();
        assertThat(ReglasPago.validarTitular("   ")).hasValue("Ingresa el nombre del titular.");
    }

    @Test
    @DisplayName("validarPago: vacío si todo es válido y un mensaje por campo, en orden, si no")
    void validarPago() {
        assertThat(ReglasPago.validarPago(VALIDA, OCTUBRE_2026)).isEmpty();
        Tarjeta conErrores = new Tarjeta(VALIDA.titular(), VALIDA.numero(), "01/20", "");
        assertThat(ReglasPago.validarPago(conErrores, OCTUBRE_2026).keySet()).containsExactly("vencimiento", "cvv");
        assertThat(ReglasPago.validarPago(null, OCTUBRE_2026).keySet()).containsExactly("titular", "numero", "vencimiento", "cvv");
    }

    @Test
    @DisplayName("simularPago: rechaza la tarjeta 4000 0000 0000 0002 con un motivo y aprueba cualquier otra")
    void simular() {
        assertThat(ReglasPago.simularPago("4000 0000 0000 0002"))
                .isEqualTo(new ReglasPago.ResultadoPago(EstadoPago.RECHAZADO, "El banco rechazó la tarjeta."));
        assertThat(ReglasPago.simularPago("4242424242424242"))
                .isEqualTo(new ReglasPago.ResultadoPago(EstadoPago.APROBADO, null));
    }

    @Test
    @DisplayName("de la tarjeta solo se guardan los 4 últimos dígitos, y toString no muestra el número")
    void ultimos4() {
        assertThat(ReglasPago.ultimos4("4242 4242 4242 4242")).isEqualTo("4242");
        assertThat(VALIDA.toString()).doesNotContain("4242 4242").contains("****4242");
    }

    @Test
    @DisplayName("totalRecaudado (RN-27): suma solo los pagos aprobados")
    void total() {
        List<Pago> pagos = List.of(
                pago(35000, EstadoPago.APROBADO), pago(25000, EstadoPago.REEMBOLSADO),
                pago(20000, EstadoPago.RECHAZADO), pago(12000, EstadoPago.APROBADO));
        assertThat(ReglasPago.totalRecaudado(pagos)).isEqualTo(47000);
        assertThat(ReglasPago.totalRecaudado(List.of())).isZero();
    }

    static Pago pago(int monto, EstadoPago estado) {
        return new Pago("P1", "U100", monto, "4242", estado, null, OCTUBRE_2026);
    }
}
