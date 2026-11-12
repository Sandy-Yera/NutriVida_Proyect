package cl.duoc.nutrivida.citas.service;

import static cl.duoc.nutrivida.citas.model.EstadoCita.ATENDIDA;
import static cl.duoc.nutrivida.citas.model.EstadoCita.CANCELADA;
import static cl.duoc.nutrivida.citas.model.EstadoCita.CONFIRMADA;
import static cl.duoc.nutrivida.citas.model.EstadoCita.INASISTENCIA;
import static cl.duoc.nutrivida.citas.model.EstadoCita.PENDIENTE;
import static org.assertj.core.api.Assertions.assertThat;

import cl.duoc.nutrivida.citas.dto.Estadisticas;
import cl.duoc.nutrivida.citas.dto.HorarioNutricionista;
import cl.duoc.nutrivida.citas.model.Cita;
import cl.duoc.nutrivida.citas.model.EstadoCita;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * R5: las reglas de citas en Java. Cada caso repite uno de frontend/src/utils/citas.test.js (EP2),
 * con los mismos horarios, fechas y resultados: si el frontend y el backend se contradijeran,
 * alguna de las dos suites fallaría. Al final, casos propios de Java (zona horaria y roles).
 */
class ReglasCitaTest {

    // Horarios del catálogo (hoja "Nutricionistas"). 2026-10-12 es lunes.
    static final HorarioNutricionista DANIELA = new HorarioNutricionista("NUT003", List.of(1, 2, 3, 4, 5), t("08:00"), t("13:00"));
    static final HorarioNutricionista RODRIGO = new HorarioNutricionista("NUT002", List.of(2, 4, 6), t("09:00"), t("14:00"));
    static final HorarioNutricionista CAROLINA = new HorarioNutricionista("NUT001", List.of(1, 3, 5), t("09:00"), t("17:00"));
    static final LocalDate LUNES = LocalDate.of(2026, 10, 12);
    static final List<String> IDS = List.of("NUT001", "NUT002", "NUT003", "NUT004");

    static LocalTime t(String hora) { return LocalTime.parse(hora); }

    static List<LocalTime> horas(String... horas) {
        return java.util.Arrays.stream(horas).map(LocalTime::parse).toList();
    }

    static Cita cita(String id, String nutricionistaId, LocalDate fecha, String hora, Integer duracion,
            EstadoCita estado) {
        return new Cita(id, "U100", nutricionistaId, "CN002", fecha, t(hora), duracion,
                "Control mensual de peso", estado, null, fecha);
    }

    static Cita cita(String id, String nutricionistaId, String fecha, EstadoCita estado) {
        return cita(id, nutricionistaId, LocalDate.parse(fecha), "10:00", 30, estado);
    }

    static Cita conServicio(EstadoCita estado, String servicio) {
        Cita c = cita("C1", "NUT001", LUNES, "10:00", 30, estado);
        c.setServicioCodigo(servicio);
        return c;
    }

    @Nested
    @DisplayName("generarBloques (RN-09)")
    class GenerarBloques {
        @Test
        @DisplayName("S-T1: Daniela Morales un lunes da 10 bloques de 08:00 a 12:30")
        void daniela() {
            List<LocalTime> bloques = ReglasCita.generarBloques(DANIELA, LUNES);
            assertThat(bloques).hasSize(10);
            assertThat(bloques.getFirst()).isEqualTo(t("08:00"));
            assertThat(bloques.getLast()).isEqualTo(t("12:30"));
        }

        @Test
        @DisplayName("S-T1: Rodrigo Sepúlveda un lunes no atiende y devuelve una lista vacía")
        void rodrigoNoAtiende() {
            assertThat(ReglasCita.generarBloques(RODRIGO, LUNES)).isEmpty();
        }

        @Test
        @DisplayName("Carolina Fuentes un lunes da 16 bloques hasta las 16:30")
        void carolina() {
            List<LocalTime> bloques = ReglasCita.generarBloques(CAROLINA, LUNES);
            assertThat(bloques).hasSize(16);
            assertThat(bloques.getLast()).isEqualTo(t("16:30"));
        }

        @Test
        @DisplayName("el sábado es 6 y el domingo es 0, como en EP2 y ms-clinica")
        void convencionDeDias() {
            assertThat(ReglasCita.diaEp2(LocalDate.of(2026, 10, 17))).isEqualTo(6);
            assertThat(ReglasCita.diaEp2(LocalDate.of(2026, 10, 18))).isZero();
            assertThat(ReglasCita.generarBloques(RODRIGO, LocalDate.of(2026, 10, 17))).hasSize(10);
        }
    }

    @Nested
    @DisplayName("puedeTransicionar (RN-02)")
    class PuedeTransicionar {
        @Test
        @DisplayName("S-T2: permite PENDIENTE a CONFIRMADA y bloquea ATENDIDA a CANCELADA")
        void basico() {
            assertThat(ReglasCita.puedeTransicionar(PENDIENTE, CONFIRMADA)).isTrue();
            assertThat(ReglasCita.puedeTransicionar(ATENDIDA, CANCELADA)).isFalse();
        }

        @Test
        @DisplayName("los estados finales no pasan a ningún otro y un estado nulo no transiciona")
        void finales() {
            for (EstadoCita fin : List.of(ATENDIDA, CANCELADA, INASISTENCIA)) {
                assertThat(ReglasCita.transicionesDesde(fin)).isEmpty();
            }
            assertThat(ReglasCita.puedeTransicionar(null, CONFIRMADA)).isFalse();
        }

        @Test
        @DisplayName("la tabla completa: PENDIENTE y CONFIRMADA son los únicos que avanzan")
        void tablaCompleta() {
            assertThat(ReglasCita.transicionesDesde(PENDIENTE)).containsExactlyInAnyOrder(CONFIRMADA, CANCELADA);
            assertThat(ReglasCita.transicionesDesde(CONFIRMADA)).containsExactlyInAnyOrder(ATENDIDA, INASISTENCIA, CANCELADA);
            assertThat(ReglasCita.puedeTransicionar(PENDIENTE, ATENDIDA)).isFalse();
        }
    }

    @Nested
    @DisplayName("bloquesQueOcupa (RN-11)")
    class BloquesQueOcupa {
        @Test
        @DisplayName("una cita de 50 min ocupa dos bloques y una de 20 min ocupa uno")
        void porDuracion() {
            assertThat(ReglasCita.bloquesQueOcupa(t("08:30"), 50)).isEqualTo(horas("08:30", "09:00"));
            assertThat(ReglasCita.bloquesQueOcupa(t("08:30"), 20)).isEqualTo(horas("08:30"));
        }

        @Test
        @DisplayName("un plan sin duración ocupa un bloque")
        void plan() {
            assertThat(ReglasCita.bloquesQueOcupa(t("10:00"), null)).isEqualTo(horas("10:00"));
        }
    }

    @Nested
    @DisplayName("horariosDisponibles (RN-10 a RN-12)")
    class HorariosDisponibles {
        // Daniela tiene una primera consulta (50 min) pendiente a las 08:30, que ocupa 08:30 y 09:00.
        final List<Cita> citas = List.of(
                cita("C1", "NUT003", LUNES, "08:30", 50, PENDIENTE),
                cita("C2", "NUT003", LocalDate.of(2026, 10, 13), "10:00", 30, CONFIRMADA),
                cita("C3", "NUT001", LUNES, "11:00", 30, CONFIRMADA),
                cita("C4", "NUT003", LUNES, "12:00", 30, CANCELADA));

        @Test
        @DisplayName("quita los bloques ocupados y no considera otras fechas, otros nutricionistas ni citas canceladas")
        void quitaOcupados() {
            assertThat(ReglasCita.horariosDisponibles(DANIELA, LUNES, citas, 30, null))
                    .isEqualTo(horas("08:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30"));
        }

        @Test
        @DisplayName("para un servicio de 50 min solo ofrece horas con dos bloques seguidos libres")
        void dosBloques() {
            assertThat(ReglasCita.horariosDisponibles(DANIELA, LUNES, citas, 50, null))
                    .isEqualTo(horas("09:30", "10:00", "10:30", "11:00", "11:30", "12:00"));
        }

        @Test
        @DisplayName("si la fecha es hoy no ofrece horas que ya pasaron")
        void sinHorasPasadas() {
            LocalDateTime ahora = LocalDateTime.of(2026, 10, 12, 10, 15);
            assertThat(ReglasCita.horariosDisponibles(DANIELA, LUNES, citas, 30, ahora))
                    .isEqualTo(horas("10:30", "11:00", "11:30", "12:00", "12:30"));
        }

        @Test
        @DisplayName("un día en que no atiende no tiene horas")
        void diaSinAtencion() {
            assertThat(ReglasCita.horariosDisponibles(RODRIGO, LUNES, List.of(), 30, null)).isEmpty();
        }
    }

    @Nested
    @DisplayName("chocaConOtraCita (RN-10)")
    class ChocaConOtraCita {
        final Cita ocupada = cita("C1", "NUT003", LUNES, "08:30", 50, PENDIENTE);

        @Test
        @DisplayName("detecta el choque con una cita que ocupa ese bloque")
        void detecta() {
            assertThat(ReglasCita.chocaConOtraCita(List.of(ocupada), "NUT003", LUNES, t("09:00"), 30, null)).isTrue();
        }

        @Test
        @DisplayName("no hay choque con otro nutricionista, con una cita cancelada ni con la misma cita")
        void sinChoque() {
            Cita otroNutricionista = cita("C1", "NUT001", LUNES, "08:30", 50, PENDIENTE);
            Cita cancelada = cita("C1", "NUT003", LUNES, "08:30", 50, CANCELADA);

            assertThat(ReglasCita.chocaConOtraCita(List.of(otroNutricionista), "NUT003", LUNES, t("08:30"), 30, null)).isFalse();
            assertThat(ReglasCita.chocaConOtraCita(List.of(cancelada), "NUT003", LUNES, t("08:30"), 30, null)).isFalse();
            assertThat(ReglasCita.chocaConOtraCita(List.of(ocupada), "NUT003", LUNES, t("08:30"), 30, "C1")).isFalse();
        }
    }

    @Nested
    @DisplayName("puedeCancelar (RN-06)")
    class PuedeCancelar {
        final Cita confirmada = cita("C1", "NUT001", LocalDate.of(2026, 10, 16), "10:00", 30, CONFIRMADA);

        @Test
        @DisplayName("permite cancelar con más de 24 h de anticipación")
        void masDe24() {
            assertThat(ReglasCita.puedeCancelar(confirmada, LocalDateTime.of(2026, 10, 14, 10, 0))).isTrue();
        }

        @Test
        @DisplayName("no permite cancelar con 24 h o menos")
        void hasta24() {
            assertThat(ReglasCita.puedeCancelar(confirmada, LocalDateTime.of(2026, 10, 15, 10, 0))).isFalse();
            assertThat(ReglasCita.puedeCancelar(confirmada, LocalDateTime.of(2026, 10, 15, 12, 0))).isFalse();
        }

        @Test
        @DisplayName("no permite cancelar una cita que ya terminó")
        void terminada() {
            Cita atendida = cita("C1", "NUT001", LocalDate.of(2026, 10, 16), "10:00", 30, ATENDIDA);
            assertThat(ReglasCita.puedeCancelar(atendida, LocalDateTime.of(2026, 10, 1, 0, 0))).isFalse();
        }

        @Test
        @DisplayName("cuenta horas reales: el 6 de septiembre de 2026 Chile adelanta el reloj y el día dura 23 h")
        void cambioDeHorarioDeSeptiembre() {
            // En el reloj faltan 24 h 30 min, pero en la realidad solo 23 h 30 min: no se puede.
            Cita domingo = cita("C1", "NUT001", LocalDate.of(2026, 9, 6), "10:00", 30, CONFIRMADA);
            assertThat(ReglasCita.puedeCancelar(domingo, LocalDateTime.of(2026, 9, 5, 9, 30))).isFalse();
            assertThat(ReglasCita.puedeCancelar(domingo, LocalDateTime.of(2026, 9, 5, 8, 30))).isTrue();
        }
    }

    @Nested
    @DisplayName("necesitaRecordatorio (RN-07)")
    class NecesitaRecordatorio {
        final Cita confirmada = cita("C1", "NUT001", LocalDate.of(2026, 10, 16), "10:00", 30, CONFIRMADA);

        @Test
        @DisplayName("avisa a una cita confirmada cuando faltan 24 h o menos")
        void avisa() {
            assertThat(ReglasCita.necesitaRecordatorio(confirmada, LocalDateTime.of(2026, 10, 15, 12, 0))).isTrue();
            assertThat(ReglasCita.necesitaRecordatorio(confirmada, LocalDateTime.of(2026, 10, 15, 10, 0))).isTrue();
        }

        @Test
        @DisplayName("no avisa con más de 24 h, a una cita pasada ni a una cita que no está confirmada")
        void noAvisa() {
            Cita pendiente = cita("C1", "NUT001", LocalDate.of(2026, 10, 16), "10:00", 30, PENDIENTE);
            assertThat(ReglasCita.necesitaRecordatorio(confirmada, LocalDateTime.of(2026, 10, 14, 10, 0))).isFalse();
            assertThat(ReglasCita.necesitaRecordatorio(confirmada, LocalDateTime.of(2026, 10, 16, 11, 0))).isFalse();
            assertThat(ReglasCita.necesitaRecordatorio(pendiente, LocalDateTime.of(2026, 10, 15, 12, 0))).isFalse();
        }
    }

    @Nested
    @DisplayName("puedeAgendarTeleconsulta (RN-16)")
    class Teleconsulta {
        final Set<String> online = Set.of("CN004");

        @Test
        @DisplayName("la permite si el paciente tiene una consulta presencial atendida")
        void permite() {
            assertThat(ReglasCita.puedeAgendarTeleconsulta(List.of(conServicio(ATENDIDA, "CN002")), online)).isTrue();
        }

        @Test
        @DisplayName("no la permite a un paciente nuevo, con solo inasistencias o con solo teleconsultas")
        void noPermite() {
            assertThat(ReglasCita.puedeAgendarTeleconsulta(List.of(), online)).isFalse();
            assertThat(ReglasCita.puedeAgendarTeleconsulta(List.of(conServicio(INASISTENCIA, "CN001")), online)).isFalse();
            assertThat(ReglasCita.puedeAgendarTeleconsulta(List.of(conServicio(ATENDIDA, "CN004")), online)).isFalse();
        }

        @Test
        @DisplayName("acepta otra lista de servicios no presenciales")
        void otraLista() {
            assertThat(ReglasCita.puedeAgendarTeleconsulta(List.of(conServicio(ATENDIDA, "CN002")), Set.of("CN002", "CN004")))
                    .isFalse();
        }
    }

    @Nested
    @DisplayName("validarMotivo (RN-14)")
    class ValidarMotivo {
        @Test
        @DisplayName("exige entre 10 y 300 caracteres sin contar los espacios de los extremos")
        void largo() {
            assertThat(ReglasCita.validarMotivo("a".repeat(9))).hasValueSatisfying(m -> assertThat(m).contains("al menos 10"));
            assertThat(ReglasCita.validarMotivo("    corto     ")).hasValueSatisfying(m -> assertThat(m).contains("al menos 10"));
            assertThat(ReglasCita.validarMotivo(null)).hasValueSatisfying(m -> assertThat(m).contains("al menos 10"));
            assertThat(ReglasCita.validarMotivo("a".repeat(10))).isEmpty();
            assertThat(ReglasCita.validarMotivo("a".repeat(300))).isEmpty();
            assertThat(ReglasCita.validarMotivo("a".repeat(301))).hasValueSatisfying(m -> assertThat(m).contains("como máximo 300"));
        }
    }

    @Nested
    @DisplayName("validarFechaCita (RN-13)")
    class ValidarFechaCita {
        final LocalDate hoy = LocalDate.of(2026, 10, 16);   // viernes 16 de octubre de 2026

        @Test
        @DisplayName("acepta desde hoy hasta 60 días adelante, extremos incluidos")
        void extremos() {
            assertThat(ReglasCita.validarFechaCita(LocalDate.of(2026, 10, 16), hoy)).isEmpty();
            assertThat(ReglasCita.validarFechaCita(LocalDate.of(2026, 12, 15), hoy)).isEmpty();
        }

        @Test
        @DisplayName("rechaza una fecha pasada o a más de 60 días, con la fecha límite en palabras")
        void fueraDeRango() {
            assertThat(ReglasCita.validarFechaCita(LocalDate.of(2026, 10, 15), hoy)).hasValue("Esa fecha ya pasó. Elige una desde hoy.");
            assertThat(ReglasCita.validarFechaCita(LocalDate.of(2026, 12, 16), hoy))
                    .hasValue("Solo se puede agendar hasta 60 días adelante (hasta el 15 de diciembre de 2026).");
        }

        @Test
        @DisplayName("no se corre con el cambio de horario de abril")
        void cambioDeHorario() {
            assertThat(ReglasCita.validarFechaCita(LocalDate.of(2027, 5, 19), LocalDate.of(2027, 3, 20))).isEmpty();
        }
    }

    @Nested
    @DisplayName("estadísticas (RN-27)")
    class Estadisticas_ {
        @Test
        @DisplayName("lunesDeLaSemana: el domingo pertenece a la semana del lunes anterior y cruza meses")
        void lunes() {
            assertThat(ReglasCita.lunesDeLaSemana(LocalDate.of(2026, 10, 16))).isEqualTo(LocalDate.of(2026, 10, 12));
            assertThat(ReglasCita.lunesDeLaSemana(LocalDate.of(2026, 10, 12))).isEqualTo(LocalDate.of(2026, 10, 12));
            assertThat(ReglasCita.lunesDeLaSemana(LocalDate.of(2026, 10, 18))).isEqualTo(LocalDate.of(2026, 10, 12));
            assertThat(ReglasCita.lunesDeLaSemana(LocalDate.of(2026, 10, 1))).isEqualTo(LocalDate.of(2026, 9, 28));
        }

        final List<Cita> citas = List.of(
                cita("1", "NUT001", "2026-10-05", ATENDIDA),
                cita("2", "NUT001", "2026-10-06", ATENDIDA),
                cita("3", "NUT003", "2026-10-07", ATENDIDA),
                cita("4", "NUT002", "2026-10-08", INASISTENCIA),
                cita("5", "NUT003", "2026-10-14", PENDIENTE),
                cita("6", "NUT003", "2026-10-14", CANCELADA),   // no cuenta
                cita("7", "NUT002", "2026-10-25", ATENDIDA));   // fuera del rango
        final Estadisticas resultado = ReglasCita.calcularEstadisticas(
                citas, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 20), IDS);

        @Test
        @DisplayName("cuenta las citas del período sin las canceladas ni las de fuera del rango")
        void totales() {
            assertThat(resultado.total()).isEqualTo(5);
            assertThat(resultado.atendidas()).isEqualTo(3);
            assertThat(resultado.inasistencias()).isEqualTo(1);
        }

        @Test
        @DisplayName("la tasa de inasistencia es una proporción sobre las citas ya ocurridas")
        void tasa() {
            assertThat(resultado.tasaInasistencia()).isEqualTo(0.25);
        }

        @Test
        @DisplayName("cada agrupación suma lo mismo que el total e incluye las filas en 0")
        void agrupaciones() {
            assertThat(resultado.porNutricionista()).containsExactly(
                    new Estadisticas.PorNutricionista("NUT001", 2),
                    new Estadisticas.PorNutricionista("NUT002", 1),
                    new Estadisticas.PorNutricionista("NUT003", 2),
                    new Estadisticas.PorNutricionista("NUT004", 0));
            assertThat(resultado.porSemana()).extracting(Estadisticas.PorSemana::semana).containsExactly(
                    LocalDate.of(2026, 9, 28), LocalDate.of(2026, 10, 5),
                    LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 19));
            assertThat(resultado.porSemana().stream().mapToInt(Estadisticas.PorSemana::total).sum()).isEqualTo(5);
        }

        @Test
        @DisplayName("sin citas devuelve todo en 0; con solo pendientes la tasa es 0 y no se divide por cero")
        void sinDivisionPorCero() {
            Estadisticas vacio = ReglasCita.calcularEstadisticas(List.of(), LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 20), IDS);
            assertThat(vacio.total()).isZero();
            assertThat(vacio.tasaInasistencia()).isZero();
            assertThat(vacio.porNutricionista()).hasSize(4);
            assertThat(vacio.porSemana()).hasSize(4);

            Estadisticas pendientes = ReglasCita.calcularEstadisticas(List.of(cita("1", "NUT001", "2026-10-14", PENDIENTE)),
                    LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 18), IDS);
            assertThat(pendientes.tasaInasistencia()).isZero();
            assertThat(pendientes.porSemana()).hasSize(1);
        }
    }

    @Nested
    @DisplayName("rolPuedeCambiarA (RN-24 a RN-26)")
    class Roles {
        @Test
        @DisplayName("el paciente solo cancela; el nutricionista solo marca atendida o inasistencia")
        void pacienteYNutricionista() {
            assertThat(ReglasCita.rolPuedeCambiarA("PACIENTE", CANCELADA)).isTrue();
            assertThat(ReglasCita.rolPuedeCambiarA("PACIENTE", CONFIRMADA)).isFalse();
            assertThat(ReglasCita.rolPuedeCambiarA("NUTRICIONISTA", ATENDIDA)).isTrue();
            assertThat(ReglasCita.rolPuedeCambiarA("NUTRICIONISTA", CANCELADA)).isFalse();
        }

        @Test
        @DisplayName("la secretaria no marca atendida; el admin puede todo; un rol desconocido, nada")
        void secretariaYAdmin() {
            assertThat(ReglasCita.rolPuedeCambiarA("SECRETARIA", ATENDIDA)).isFalse();
            assertThat(ReglasCita.rolPuedeCambiarA("SECRETARIA", CONFIRMADA)).isTrue();
            assertThat(ReglasCita.rolPuedeCambiarA("ADMIN", ATENDIDA)).isTrue();
            assertThat(ReglasCita.rolPuedeCambiarA("INVITADO", CANCELADA)).isFalse();
            assertThat(ReglasCita.rolPuedeCambiarA(null, CANCELADA)).isFalse();
        }
    }
}
