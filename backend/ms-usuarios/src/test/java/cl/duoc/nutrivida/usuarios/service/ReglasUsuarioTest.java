package cl.duoc.nutrivida.usuarios.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import cl.duoc.nutrivida.usuarios.exception.ApiException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Mismos casos que validaciones.test.js de EP2: el backend y el frontend validan igual. */
class ReglasUsuarioTest {

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({ "12345678-5, 12.345.678-5", "9876543-3, 9.876.543-3", "16.222.333-k, 16.222.333-K",
            "19 876 543 0, 19.876.543-0" })
    @DisplayName("RUT válido: se guarda con puntos, guion y K mayúscula")
    void rutNormalizado(String entrada, String esperado) {
        assertThat(ReglasUsuario.normalizarRut(entrada)).isEqualTo(esperado);
    }

    @Test
    @DisplayName("RUT con dígito verificador incorrecto o mal escrito → 400 en el campo rut")
    void rutInvalido() {
        assertThatThrownBy(() -> ReglasUsuario.normalizarRut("12.345.678-9"))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrores()).containsKey("rut"));
        assertThatThrownBy(() -> ReglasUsuario.normalizarRut("abc")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> ReglasUsuario.normalizarRut("")).hasMessage("Ingresa el RUT.");
    }

    @Test
    @DisplayName("Teléfono y correo normalizados; búsqueda sin tildes")
    void normalizaciones() {
        assertThat(ReglasUsuario.normalizarTelefono("+56912345678")).isEqualTo("+56 9 1234 5678");
        assertThat(ReglasUsuario.normalizarCorreo(" Ana.Perez@Correo.CL ")).isEqualTo("ana.perez@correo.cl");
        assertThat(ReglasUsuario.sinTildes("Tomás Huenchullán")).isEqualTo("tomas huenchullan");
        assertThat(ReglasUsuario.digitoVerificador("16222333")).isEqualTo("K");
    }
}
