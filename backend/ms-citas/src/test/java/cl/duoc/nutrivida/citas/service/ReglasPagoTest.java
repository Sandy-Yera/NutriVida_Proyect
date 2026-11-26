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

    // ------------------------------------------------------------------ casos propios (pruebas mutantes)

    @Test
    @DisplayName("Luhn con dígitos que al duplicarse pasan de 9 (las tarjetas 4242 nunca lo prueban)")
    void luhnConDobleMayorQueNueve() {
        assertThat(ReglasPago.pasaLuhn("79927398713")).isTrue();      // ejemplo clásico del algoritmo
        assertThat(ReglasPago.pasaLuhn("79927398710")).isFalse();
        assertThat(ReglasPago.validarTarjeta("5555 5555 5555 4444")).isEmpty();   // tarjeta de prueba Mastercard
        assertThat(ReglasPago.validarTarjeta("5555 5555 5555 4445")).hasValue("El número de la tarjeta no es válido. Revísalo.");
        assertThat(ReglasPago.pasaLuhn("59")).isTrue();     // 5·2 = 10 → 1; 1 + 9 = 10
        assertThat(ReglasPago.pasaLuhn("18")).isTrue();     // 1·2 = 2; 2 + 8 = 10 (sin restar 9)
    }

    @Test
    @DisplayName("Luhn detecta el cambio de un solo dígito y el intercambio de dos dígitos vecinos")
    void luhnDetectaErroresDeTipeo() {
        String valida = "4539148803436467";
        assertThat(ReglasPago.pasaLuhn(valida)).isTrue();
        for (int i = 0; i < valida.length(); i++) {
            char original = valida.charAt(i);
            char otro = original == '9' ? '0' : (char) (original + 1);
            String tipeo = valida.substring(0, i) + otro + valida.substring(i + 1);
            assertThat(ReglasPago.pasaLuhn(tipeo)).as("dígito %d cambiado", i).isFalse();
        }
        assertThat(ReglasPago.pasaLuhn("4539148803436476")).isFalse();   // 6 y 7 del final intercambiados
    }

    @Test
    @DisplayName("ultimos4: con menos de 4 dígitos los devuelve todos, sin fallar; sin número, vacío")
    void ultimos4Cortos() {
        assertThat(ReglasPago.ultimos4("42")).isEqualTo("42");
        assertThat(ReglasPago.ultimos4("4242")).isEqualTo("4242");
        assertThat(ReglasPago.ultimos4(null)).isEmpty();
        assertThat(ReglasPago.soloDigitos(" 4242-4242 ")).isEqualTo("42424242");
    }

    @Test
    @DisplayName("titular: 2 letras no alcanza, 3 sí (sin contar espacios); CVV y vencimiento vacíos piden el dato")
    void camposVaciosYCortos() {
        assertThat(ReglasPago.validarTitular("Ab")).hasValue("El nombre del titular debe tener al menos 3 letras.");
        assertThat(ReglasPago.validarTitular("  Ab  ")).hasValue("El nombre del titular debe tener al menos 3 letras.");
        assertThat(ReglasPago.validarTitular("Ana")).isEmpty();
        assertThat(ReglasPago.validarTitular(null)).hasValue("Ingresa el nombre del titular.");
        assertThat(ReglasPago.validarCvv("")).hasValue("Ingresa el CVV.");
        assertThat(ReglasPago.validarCvv(null)).hasValue("Ingresa el CVV.");
        assertThat(ReglasPago.validarCvv(" 123 ")).isEmpty();
        assertThat(ReglasPago.validarCvv("1234")).hasValue("El CVV debe tener 3 dígitos.");
        assertThat(ReglasPago.validarVencimiento("", OCTUBRE_2026)).hasValue("Ingresa el vencimiento.");
        assertThat(ReglasPago.validarVencimiento(null, OCTUBRE_2026)).hasValue("Ingresa el vencimiento.");
    }

    @Test
    @DisplayName("vencimiento: el mes 00 no existe, 01 y 12 sí; vence al terminar el mes, también al cambiar de año")
    void bordesDelVencimiento() {
        LocalDate enero2027 = LocalDate.of(2027, 1, 31);
        assertThat(ReglasPago.validarVencimiento("00/27", enero2027)).hasValue("El mes del vencimiento debe estar entre 01 y 12.");
        assertThat(ReglasPago.validarVencimiento("01/27", enero2027)).isEmpty();           // vence hoy, último día del mes
        assertThat(ReglasPago.validarVencimiento("12/26", enero2027)).hasValue("La tarjeta está vencida.");
        assertThat(ReglasPago.validarVencimiento("12/26", LocalDate.of(2026, 12, 1))).isEmpty();
        assertThat(ReglasPago.validarVencimiento(" 12/30 ", enero2027)).isEmpty();
    }

    @Test
    @DisplayName("el resultado de la simulación expone estado y motivo por separado")
    void resultadoDeLaSimulacion() {
        ReglasPago.ResultadoPago rechazo = ReglasPago.simularPago(ReglasPago.TARJETA_RECHAZADA);
        assertThat(rechazo.estado()).isEqualTo(EstadoPago.RECHAZADO);
        assertThat(rechazo.motivo()).isEqualTo(ReglasPago.MOTIVO_RECHAZO);
        assertThat(ReglasPago.simularPago(null).estado()).isEqualTo(EstadoPago.APROBADO);
        assertThat(ReglasPago.simularPago(null).motivo()).isNull();
    }

    @Test
    @DisplayName("totalRecaudado no se desborda con montos grandes (suma en long)")
    void totalGrande() {
        List<Pago> pagos = List.of(pago(2_000_000_000, EstadoPago.APROBADO), pago(2_000_000_000, EstadoPago.APROBADO));
        assertThat(ReglasPago.totalRecaudado(pagos)).isEqualTo(4_000_000_000L);
    }

    @Test
    @DisplayName("Tarjeta.toString muestra solo los 4 últimos dígitos, y nada si el número es corto o falta")
    void tarjetaToString() {
        assertThat(new Tarjeta("Ana", "123", "12/27", "123").toString()).contains("numero=****]").doesNotContain("123,");
        assertThat(new Tarjeta("Ana", null, null, null).toString()).isEqualTo("Tarjeta[titular=Ana, numero=****]");
        assertThat(new Tarjeta("Ana", "4242-4242-4242-1234", null, "999").toString())
                .isEqualTo("Tarjeta[titular=Ana, numero=****1234]");
        assertThat(new Tarjeta("Ana", "4242", null, null).toString()).isEqualTo("Tarjeta[titular=Ana, numero=****4242]");
    }

    static Pago pago(int monto, EstadoPago estado) {
        return new Pago("P1", "U100", monto, "4242", estado, null, OCTUBRE_2026);
    }
}
