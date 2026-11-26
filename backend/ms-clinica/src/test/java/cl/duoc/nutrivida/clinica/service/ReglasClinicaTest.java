package cl.duoc.nutrivida.clinica.service;

import static org.assertj.core.api.Assertions.assertThat;

import cl.duoc.nutrivida.clinica.dto.Comidas;
import cl.duoc.nutrivida.clinica.dto.ContactoSolicitud;
import cl.duoc.nutrivida.clinica.dto.FichaSolicitud;
import cl.duoc.nutrivida.clinica.dto.MedicionSolicitud;
import cl.duoc.nutrivida.clinica.dto.PlanSolicitud;
import cl.duoc.nutrivida.clinica.dto.ServicioSolicitud;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Espejo de utils/clinica.test.js (C-T4 y validaciones de EP2): mismos casos y mismos mensajes.
 * Si el frontend y el backend se contradicen, una de las dos suites falla.
 */
class ReglasClinicaTest {

    static BigDecimal n(String v) { return v == null ? null : new BigDecimal(v); }

    @Test
    @DisplayName("C-T4: validarMedicion devuelve los errores por campo y acepta una medición válida")
    void medicion() {
        LocalDate hoy = LocalDate.of(2026, 10, 11);
        var valida = new MedicionSolicitud(LocalDate.of(2026, 10, 2), n("72.4"), n("170"), n("84"), null, n("29.9"), "");
        assertThat(ReglasClinica.validarMedicion(valida, hoy)).isEmpty();

        var mala = new MedicionSolicitud(LocalDate.of(2026, 10, 12), n("350"), null, null, null, n("1"), null);
        assertThat(ReglasClinica.validarMedicion(mala, hoy)).containsOnly(
                Map.entry("pesoKg", "El peso debe estar entre 2 y 300 kg."),
                Map.entry("tallaCm", "Ingresa la talla."),
                Map.entry("grasaPct", "El % de grasa debe estar entre 2 y 70 %."),
                Map.entry("fecha", "La fecha de la medición no puede ser futura."));
    }

    @Test
    @DisplayName("Bordes de la medición: 2 y 300 kg pasan; hoy pasa")
    void bordesMedicion() {
        LocalDate hoy = LocalDate.of(2026, 10, 11);
        assertThat(ReglasClinica.validarMedicion(new MedicionSolicitud(hoy, n("2"), n("45"), null, null, null, null), hoy)).isEmpty();
        assertThat(ReglasClinica.validarMedicion(new MedicionSolicitud(hoy, n("300"), n("230"), n("200"), n("30"), n("70"), null), hoy)).isEmpty();
        assertThat(ReglasClinica.validarMedicion(new MedicionSolicitud(hoy, n("300.1"), n("170"), null, null, null, null), hoy))
                .containsKey("pesoKg");
    }

    @Test
    @DisplayName("validarContacto exige nombre, correo, motivo y un mensaje de 10 a 500 caracteres")
    void contacto() {
        assertThat(ReglasClinica.validarContacto(new ContactoSolicitud("Ana", "ana@correo.cl", "", "Otro",
                "Necesito más información."))).isEmpty();
        assertThat(ReglasClinica.validarContacto(new ContactoSolicitud("", "ana", "1234", "", "x".repeat(501))))
                .containsEntry("nombre", "Ingresa tu nombre.")
                .containsEntry("correo", "El correo no es válido: usa el formato nombre@dominio.cl.")
                .containsEntry("telefono", "El teléfono debe ser un celular chileno: +56 9 y 8 dígitos.")
                .containsEntry("motivo", "Elige el motivo de tu mensaje.")
                .containsEntry("mensaje", "El mensaje debe tener entre 10 y 500 caracteres.");
        assertThat(ReglasClinica.validarContacto(new ContactoSolicitud("Ana", "ana@correo.cl", "+56 9 1234 5678", "Otro",
                "Necesito más información."))).isEmpty();
    }

    @Test
    @DisplayName("La ficha exige un objetivo del caso y antecedentes")
    void ficha() {
        assertThat(ReglasClinica.validarFicha(new FichaSolicitud("U102", null, "OTRO", " ")))
                .containsEntry("objetivo", "Elige el objetivo del paciente.")
                .containsEntry("antecedentes", "Ingresa los antecedentes (escribe “Sin antecedentes” si no tiene).");
        assertThat(ReglasClinica.validarFicha(new FichaSolicitud("U102", null, "INFANTIL", "Sin antecedentes"))).isEmpty();
    }

    @Test
    @DisplayName("El plan exige objetivo, kcal enteras de 800 a 5000 y las 5 comidas")
    void plan() {
        var semilla = new PlanSolicitud("PA001", LocalDate.of(2026, 10, 2), "Pérdida de peso gradual", n("1800"),
                new Comidas("Avena", "Fruta", "Legumbres", "Pan integral", "Verduras"), "2 litros de agua");
        assertThat(ReglasClinica.validarPlan(semilla)).isEmpty();
        var mala = new PlanSolicitud(null, null, "", n("1800.5"), new Comidas("Avena", null, null, null, null), null);
        assertThat(ReglasClinica.validarPlan(mala)).containsOnly(
                Map.entry("objetivo", "Ingresa el objetivo del plan."),
                Map.entry("kcalDiarias", "Las kcal diarias deben ser un número entero entre 800 y 5000."),
                Map.entry("colacion", "Indica la colación."),
                Map.entry("almuerzo", "Indica el almuerzo."),
                Map.entry("once", "Indica la once."),
                Map.entry("cena", "Indica la cena."));
    }

    @Test
    @DisplayName("Servicios: los planes no exigen duración, los talleres exigen cupo y el precio debe ser mayor que 0")
    void servicio() {
        var base = new ServicioSolicitud("pl007", "PLAN", "Plan embarazo", null, "Presencial", n("60000"),
                "Incluye 3 consultas y plan mensual.", false, null, true);
        assertThat(ReglasClinica.validarServicio(base, true)).isEmpty();
        var taller = new ServicioSolicitud("P007", "TALLER", "Plan embarazo", null, "Presencial", n("0"),
                "Incluye 3 consultas y plan mensual.", false, null, true);
        assertThat(ReglasClinica.validarServicio(taller, true)).containsOnly(
                Map.entry("codigo", "El código debe tener 2 letras y 3 números, por ejemplo CN006."),
                Map.entry("duracionMin", "La duración debe ser un número entero de 10 a 240 minutos."),
                Map.entry("precio", "El precio debe ser mayor que 0."),
                Map.entry("cupoMax", "El cupo debe ser un número entero de 1 a 50 personas."));
        var decimales = new ServicioSolicitud("PL007", "PLAN", "Plan embarazo", null, "Presencial", n("1500.5"),
                "Incluye 3 consultas y plan mensual.", false, null, true);
        assertThat(ReglasClinica.validarServicio(decimales, true)).containsEntry("precio", "El precio va en pesos, sin decimales.");
    }

    @Test
    @DisplayName("quitarTildes: igual que EP2")
    void tildes() {
        assertThat(ReglasClinica.quitarTildes("  Nutrición DEPORTIVA ")).isEqualTo("nutricion deportiva");
    }
}
