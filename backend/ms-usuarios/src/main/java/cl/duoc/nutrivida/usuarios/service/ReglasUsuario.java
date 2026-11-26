package cl.duoc.nutrivida.usuarios.service;

import cl.duoc.nutrivida.usuarios.exception.ApiException;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.Locale;

/**
 * Reglas puras de la cuenta, las mismas de validaciones.js y usuariosData.js de EP2: RUT con
 * dígito verificador, correo en minúsculas y teléfono con formato fijo. Se guardan normalizados
 * para que los UNIQUE de la base comparen bien.
 */
public final class ReglasUsuario {

    private ReglasUsuario() { }

    /** Módulo 11, igual que calcularDigitoVerificador de EP2. */
    public static String digitoVerificador(String cuerpo) {
        int suma = 0;
        int multiplicador = 2;
        for (int i = cuerpo.length() - 1; i >= 0; i--) {
            suma += Character.getNumericValue(cuerpo.charAt(i)) * multiplicador;
            multiplicador = multiplicador == 7 ? 2 : multiplicador + 1;
        }
        int resultado = 11 - (suma % 11);
        if (resultado == 11) return "0";
        if (resultado == 10) return "K";
        return String.valueOf(resultado);
    }

    /** Valida el RUT y lo devuelve como 12.345.678-5. 400 en el campo rut si no es válido. */
    public static String normalizarRut(String rut) {
        String limpio = rut == null ? "" : rut.replaceAll("[.\\s-]", "").toUpperCase(Locale.ROOT);
        if (limpio.isEmpty()) throw ApiException.validacion("rut", "Ingresa el RUT.");
        if (!limpio.matches("\\d{7,8}[\\dK]")) {
            throw ApiException.validacion("rut", "El RUT debe tener el formato 12.345.678-5.");
        }
        String cuerpo = limpio.substring(0, limpio.length() - 1);
        String dv = limpio.substring(limpio.length() - 1);
        if (!digitoVerificador(cuerpo).equals(dv)) {
            throw ApiException.validacion("rut", "El RUT no es válido: revisa el dígito verificador.");
        }
        String conPuntos = String.format(Locale.ROOT, "%,d", Long.parseLong(cuerpo)).replace(',', '.');
        return conPuntos + "-" + dv;
    }

    public static String normalizarCorreo(String correo) {
        return correo == null ? null : correo.trim().toLowerCase(Locale.ROOT);
    }

    /** +56 9 1234 5678, como formatearTelefono de EP2. */
    public static String normalizarTelefono(String telefono) {
        if (telefono == null) return null;
        String digitos = telefono.replaceAll("\\D", "");
        String n = digitos.substring(digitos.length() - 8);
        return "+56 9 " + n.substring(0, 4) + " " + n.substring(4);
    }

    public static void validarNacimiento(LocalDate fecha) {
        if (fecha != null && fecha.getYear() < 1900) {
            throw ApiException.validacion("fechaNacimiento", "Revisa el año de nacimiento.");
        }
    }

    /** Sin tildes ni mayúsculas, para la búsqueda por texto. */
    public static String sinTildes(String texto) {
        if (texto == null) return "";
        return Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).trim();
    }
}
