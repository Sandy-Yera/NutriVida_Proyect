package cl.duoc.nutrivida.citas.client;

import cl.duoc.nutrivida.citas.dto.HorarioNutricionista;
import cl.duoc.nutrivida.citas.dto.ServicioClinica;
import java.time.LocalTime;
import java.util.List;

/**
 * ms-clinica simulado con las semillas de EP2 (frontend/src/data/semillas/nutricionistas.js y
 * servicios.js), los mismos datos que cargará database/03_clinica.sql. Se usa en las pruebas,
 * al correr ms-citas solo desde el IDE y como plan B si los endpoints de Catalina (C-31) se
 * atrasan (riesgo del roadmap). Si cambian las semillas de EP2, hay que cambiarlas aquí también.
 */
public class ClinicaSimulada implements ClinicaClient {

    private static final List<HorarioNutricionista> NUTRICIONISTAS = List.of(
            horario("NUT001", List.of(1, 3, 5), "09:00", "17:00"),        // Carolina Fuentes M.
            horario("NUT002", List.of(2, 4, 6), "09:00", "14:00"),        // Rodrigo Sepúlveda A.
            horario("NUT003", List.of(1, 2, 3, 4, 5), "08:00", "13:00"),  // Daniela Morales C.
            horario("NUT004", List.of(2, 3, 4, 5), "14:00", "19:00"));    // Felipe Araya R.

    private static final String PRESENCIAL = "Presencial";
    private static final String GRUPO = "Presencial (grupo)";

    private static final List<ServicioClinica> SERVICIOS = List.of(
            servicio("CN001", "CONSULTA", "Primera consulta nutricional", 50, PRESENCIAL, 35000),
            servicio("CN002", "CONSULTA", "Control nutricional (seguimiento)", 30, PRESENCIAL, 25000),
            servicio("CN003", "CONSULTA", "Control nutricional quincenal", 30, PRESENCIAL, 22000),
            servicio("CN004", "CONSULTA", "Teleconsulta nutricional", 30, "Online (video)", 20000),
            servicio("CN005", "CONSULTA", "Consulta de urgencia / reagendada", 30, PRESENCIAL, 28000),
            servicio("PL001", "PLAN", "Plan pérdida de peso (1 mes)", null, PRESENCIAL, 65000),
            servicio("PL002", "PLAN", "Plan pérdida de peso (3 meses)", null, PRESENCIAL, 170000),
            servicio("PL003", "PLAN", "Plan nutrición deportiva (1 mes)", null, PRESENCIAL, 70000),
            servicio("PL004", "PLAN", "Plan control diabetes / hipertensión", null, PRESENCIAL, 75000),
            servicio("PL005", "PLAN", "Plan alimentación vegetariana/vegana", null, PRESENCIAL, 68000),
            servicio("PL006", "PLAN", "Plan alimentación infantil (2-12 años)", null, PRESENCIAL, 65000),
            servicio("EV001", "EVALUACION", "Antropometría completa", 20, PRESENCIAL, 18000),
            servicio("EV002", "EVALUACION", "Bioimpedanciometría", 15, PRESENCIAL, 12000),
            servicio("EV003", "EVALUACION", "Encuesta de hábitos alimentarios", 20, PRESENCIAL, 10000),
            servicio("EV004", "EVALUACION", "Análisis de exámenes de laboratorio", 20, PRESENCIAL, 15000),
            servicio("TG001", "TALLER", "Taller de alimentación saludable", 90, GRUPO, 15000),
            servicio("TG002", "TALLER", "Taller de cocina nutritiva", 120, GRUPO, 20000),
            servicio("TG003", "TALLER", "Taller nutrición para deportistas", 90, GRUPO, 18000));

    @Override
    public List<HorarioNutricionista> nutricionistas() {
        return NUTRICIONISTAS;
    }

    @Override
    public List<ServicioClinica> servicios() {
        return SERVICIOS;
    }

    private static HorarioNutricionista horario(String id, List<Integer> dias, String inicio, String fin) {
        return new HorarioNutricionista(id, dias, LocalTime.parse(inicio), LocalTime.parse(fin));
    }

    private static ServicioClinica servicio(String codigo, String tipo, String nombre, Integer duracionMin,
            String modalidad, int precio) {
        return new ServicioClinica(codigo, tipo, nombre, duracionMin, modalidad, precio, true);
    }
}
