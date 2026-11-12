package cl.duoc.nutrivida.citas.service;

import cl.duoc.nutrivida.citas.dto.Tarjeta;
import cl.duoc.nutrivida.citas.model.EstadoPago;
import cl.duoc.nutrivida.citas.model.Pago;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * RN-18, RN-19 y RN-27: validación y simulación del pago. Puerto a Java de
 * frontend/src/utils/pagos.js, con los mismos mensajes. Funciones puras, como ReglasCita.
 *
 * El backend vuelve a validar la tarjeta aunque el formulario ya lo hizo: en EP3 cualquiera
 * puede llamar a POST /api/citas desde Swagger o Postman sin pasar por la página.
 */
public final class ReglasPago {

    /** RN-19: la tarjeta de prueba que el banco simulado rechaza. */
    public static final String TARJETA_RECHAZADA = "4000000000000002";
    public static final String MOTIVO_RECHAZO = "El banco rechazó la tarjeta.";

    private static final Pattern VENCIMIENTO = Pattern.compile("^(\\d{2})/(\\d{2})$");
    private static final Pattern CVV = Pattern.compile("^\\d{3}$");

    private ReglasPago() { }

    public record ResultadoPago(EstadoPago estado, String motivo) { }

    public static String soloDigitos(String texto) {
        return texto == null ? "" : texto.replaceAll("\\D", "");
    }

    /** Lo único que se guarda de la tarjeta (pago.ultimos4). */
    public static String ultimos4(String numero) {
        String digitos = soloDigitos(numero);
        return digitos.length() <= 4 ? digitos : digitos.substring(digitos.length() - 4);
    }

    /**
     * Algoritmo de Luhn: desde el último dígito, se duplica uno de cada dos; si el doble pasa
     * de 9 se le resta 9. La suma total debe ser múltiplo de 10.
     */
    public static boolean pasaLuhn(String digitos) {
        int suma = 0;
        boolean duplicar = false;
        for (int i = digitos.length() - 1; i >= 0; i--) {
            int d = digitos.charAt(i) - '0';
            if (duplicar) {
                d *= 2;
                if (d > 9) d -= 9;
            }
            suma += d;
            duplicar = !duplicar;
        }
        return suma % 10 == 0;
    }

    public static Optional<String> validarTitular(String titular) {
        String texto = titular == null ? "" : titular.strip();
        if (texto.isEmpty()) return Optional.of("Ingresa el nombre del titular.");
        if (texto.length() < 3) return Optional.of("El nombre del titular debe tener al menos 3 letras.");
        return Optional.empty();
    }

    public static Optional<String> validarTarjeta(String numero) {
        String digitos = soloDigitos(numero);
        if (digitos.isEmpty()) return Optional.of("Ingresa el número de la tarjeta.");
        if (digitos.length() != 16) return Optional.of("El número de la tarjeta debe tener 16 dígitos.");
        if (!pasaLuhn(digitos)) return Optional.of("El número de la tarjeta no es válido. Revísalo.");
        return Optional.empty();
    }

    /** Una tarjeta MM/AA vence al terminar ese mes. */
    public static Optional<String> validarVencimiento(String texto, LocalDate hoy) {
        String valor = texto == null ? "" : texto.strip();
        if (valor.isEmpty()) return Optional.of("Ingresa el vencimiento.");
        Matcher partes = VENCIMIENTO.matcher(valor);
        if (!partes.matches()) return Optional.of("Escribe el vencimiento como MM/AA.");
        int mes = Integer.parseInt(partes.group(1));
        if (mes < 1 || mes > 12) return Optional.of("El mes del vencimiento debe estar entre 01 y 12.");
        YearMonth vence = YearMonth.of(2000 + Integer.parseInt(partes.group(2)), mes);
        if (vence.isBefore(YearMonth.from(hoy))) return Optional.of("La tarjeta está vencida.");
        return Optional.empty();
    }

    public static Optional<String> validarCvv(String cvv) {
        String valor = cvv == null ? "" : cvv.strip();
        if (valor.isEmpty()) return Optional.of("Ingresa el CVV.");
        if (!CVV.matcher(valor).matches()) return Optional.of("El CVV debe tener 3 dígitos.");
        return Optional.empty();
    }

    /**
     * Junta las cuatro validaciones en { campo: mensaje }, el mismo objeto "errores" del formato
     * de error común: el formulario de pago muestra cada mensaje bajo su input. Vacío si todo es
     * válido. Sin tarjeta, se reportan los cuatro campos.
     */
    public static Map<String, String> validarPago(Tarjeta tarjeta, LocalDate hoy) {
        Tarjeta t = tarjeta == null ? new Tarjeta(null, null, null, null) : tarjeta;
        Map<String, String> errores = new LinkedHashMap<>();
        validarTitular(t.titular()).ifPresent(m -> errores.put("titular", m));
        validarTarjeta(t.numero()).ifPresent(m -> errores.put("numero", m));
        validarVencimiento(t.vencimiento(), hoy).ifPresent(m -> errores.put("vencimiento", m));
        validarCvv(t.cvv()).ifPresent(m -> errores.put("cvv", m));
        return errores;
    }

    /** RN-19: la tarjeta 4000 0000 0000 0002 se rechaza; cualquier otra válida se aprueba. */
    public static ResultadoPago simularPago(String numero) {
        if (TARJETA_RECHAZADA.equals(soloDigitos(numero))) {
            return new ResultadoPago(EstadoPago.RECHAZADO, MOTIVO_RECHAZO);
        }
        return new ResultadoPago(EstadoPago.APROBADO, null);
    }

    /** RN-27: solo suman los pagos APROBADOS. Un rechazo nunca se cobró y un reembolso se devolvió. */
    public static long totalRecaudado(Collection<Pago> pagos) {
        return pagos.stream()
                .filter(p -> p.getEstado() == EstadoPago.APROBADO)
                .mapToLong(Pago::getMonto)
                .sum();
    }
}
