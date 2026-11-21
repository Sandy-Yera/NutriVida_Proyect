package cl.duoc.nutrivida.clinica.service;

import cl.duoc.nutrivida.clinica.dto.Comidas;
import cl.duoc.nutrivida.clinica.dto.ContactoSolicitud;
import cl.duoc.nutrivida.clinica.dto.FichaSolicitud;
import cl.duoc.nutrivida.clinica.dto.MedicionSolicitud;
import cl.duoc.nutrivida.clinica.dto.PlanSolicitud;
import cl.duoc.nutrivida.clinica.dto.ServicioSolicitud;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Pattern;

/**
 * Puerto de frontend/src/utils/clinica.js (validarServicio, validarMedicion, validarFicha,
 * validarPlan y validarContacto) con los mismos mensajes, así el usuario ve el mismo texto en
 * modo local y en modo API. Funciones puras: reciben los datos y devuelven { campo: mensaje }
 * (vacío si todo está bien). El service decide el código HTTP.
 */
public final class ReglasClinica {

    public static final ZoneId ZONA = ZoneId.of("America/Santiago");

    public static final List<String> TIPOS_SERVICIO = List.of("CONSULTA", "PLAN", "EVALUACION", "TALLER");
    public static final List<String> MODALIDADES = List.of("Presencial", "Online (video)", "Presencial (grupo)");
    public static final List<String> OBJETIVOS_FICHA =
            List.of("PERDIDA_PESO", "METABOLICO", "DEPORTIVA", "VEGETARIANA", "INFANTIL");
    public static final List<String> MOTIVOS_CONTACTO =
            List.of("Consulta general", "Agendamiento de horas", "Planes y precios", "Talleres grupales", "Otro");

    private static final Pattern CODIGO = Pattern.compile("^[A-Z]{2}\\d{3}$");
    private static final Pattern CORREO = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");
    private static final Pattern CELULAR = Pattern.compile("^\\+569\\d{8}$");

    /** Rangos de la medición (RANGOS_MEDICION de EP2). */
    private record Rango(String campo, String nombre, int min, int max, String unidad, boolean obligatorio,
            Function<MedicionSolicitud, BigDecimal> valor) { }

    private static final List<Rango> RANGOS = List.of(
            new Rango("pesoKg", "el peso", 2, 300, "kg", true, MedicionSolicitud::pesoKg),
            new Rango("tallaCm", "la talla", 45, 230, "cm", true, MedicionSolicitud::tallaCm),
            new Rango("cinturaCm", "la cintura", 30, 200, "cm", false, MedicionSolicitud::cinturaCm),
            new Rango("caderaCm", "la cadera", 30, 200, "cm", false, MedicionSolicitud::caderaCm),
            new Rango("grasaPct", "el % de grasa", 2, 70, "%", false, MedicionSolicitud::grasaPct));

    private ReglasClinica() { }

    // ------------------------------------------------------------------ servicios (C-10)

    public static Map<String, String> validarServicio(ServicioSolicitud d, boolean esNuevo) {
        Map<String, String> e = new LinkedHashMap<>();
        if (esNuevo && !CODIGO.matcher(normalizarCodigo(d.codigo())).matches()) {
            e.put("codigo", "El código debe tener 2 letras y 3 números, por ejemplo CN006.");
        }
        if (!en(TIPOS_SERVICIO, d.tipo())) e.put("tipo", "Elige el tipo de servicio.");
        String nombre = texto(d.nombre());
        if (nombre.isEmpty()) e.put("nombre", "Ingresa el nombre del servicio.");
        else if (nombre.length() < 3 || nombre.length() > 80) e.put("nombre", "El nombre debe tener entre 3 y 80 caracteres.");
        if (!"PLAN".equals(d.tipo()) && !enteroEntre(d.duracionMin(), 10, 240)) {
            e.put("duracionMin", "La duración debe ser un número entero de 10 a 240 minutos.");
        }
        if (!en(MODALIDADES, d.modalidad())) e.put("modalidad", "Elige la modalidad.");
        if (d.precio() == null || d.precio().signum() <= 0) e.put("precio", "El precio debe ser mayor que 0.");
        else if (!esEntero(d.precio())) e.put("precio", "El precio va en pesos, sin decimales.");
        String descripcion = texto(d.descripcion());
        if (descripcion.length() < 10 || descripcion.length() > 300) {
            e.put("descripcion", "La descripción debe tener entre 10 y 300 caracteres.");
        }
        if ("TALLER".equals(d.tipo()) && !enteroEntre(d.cupoMax(), 1, 50)) {
            e.put("cupoMax", "El cupo debe ser un número entero de 1 a 50 personas.");
        }
        return e;
    }

    public static String normalizarCodigo(String codigo) {
        return texto(codigo).toUpperCase();
    }

    // ------------------------------------------------------------------ fichas (C-09)

    public static Map<String, String> validarFicha(FichaSolicitud d) {
        Map<String, String> e = new LinkedHashMap<>();
        if (!en(OBJETIVOS_FICHA, d.objetivo())) e.put("objetivo", "Elige el objetivo del paciente.");
        String antecedentes = texto(d.antecedentes());
        if (antecedentes.isEmpty()) {
            e.put("antecedentes", "Ingresa los antecedentes (escribe “Sin antecedentes” si no tiene).");
        } else if (antecedentes.length() > 500) {
            e.put("antecedentes", "Los antecedentes no pueden superar los 500 caracteres.");
        }
        return e;
    }

    // ------------------------------------------------------------------ mediciones (C-T4)

    public static Map<String, String> validarMedicion(MedicionSolicitud d, LocalDate hoy) {
        Map<String, String> e = new LinkedHashMap<>();
        for (Rango r : RANGOS) {
            BigDecimal valor = r.valor().apply(d);
            if (valor == null) {
                if (r.obligatorio()) e.put(r.campo(), "Ingresa " + r.nombre() + ".");
                continue;
            }
            if (valor.compareTo(BigDecimal.valueOf(r.min())) < 0 || valor.compareTo(BigDecimal.valueOf(r.max())) > 0) {
                String etiqueta = Character.toUpperCase(r.nombre().charAt(0)) + r.nombre().substring(1);
                e.put(r.campo(), etiqueta + " debe estar entre " + r.min() + " y " + r.max() + " " + r.unidad() + ".");
            }
        }
        if (d.fecha() == null) e.put("fecha", "Ingresa la fecha de la medición.");
        else if (d.fecha().isAfter(hoy)) e.put("fecha", "La fecha de la medición no puede ser futura.");
        if (texto(d.notas()).length() > 300) e.put("notas", "Las notas no pueden superar los 300 caracteres.");
        return e;
    }

    // ------------------------------------------------------------------ planes (C-09)

    public static Map<String, String> validarPlan(PlanSolicitud d) {
        Map<String, String> e = new LinkedHashMap<>();
        String objetivo = texto(d.objetivo());
        if (objetivo.length() < 3) e.put("objetivo", "Ingresa el objetivo del plan.");
        else if (objetivo.length() > 120) e.put("objetivo", "El objetivo no puede superar los 120 caracteres.");
        if (d.kcalDiarias() == null) {
            e.put("kcalDiarias", "Ingresa las kcal diarias.");
        } else if (!enteroEntre(d.kcalDiarias(), 800, 5000)) {
            e.put("kcalDiarias", "Las kcal diarias deben ser un número entero entre 800 y 5000.");
        }
        Comidas c = d.comidas() == null ? new Comidas(null, null, null, null, null) : d.comidas();
        comida(e, "desayuno", "Indica el desayuno.", c.desayuno());
        comida(e, "colacion", "Indica la colación.", c.colacion());
        comida(e, "almuerzo", "Indica el almuerzo.", c.almuerzo());
        comida(e, "once", "Indica la once.", c.once());
        comida(e, "cena", "Indica la cena.", c.cena());
        if (texto(d.indicaciones()).length() > 500) {
            e.put("indicaciones", "Las indicaciones no pueden superar los 500 caracteres.");
        }
        return e;
    }

    private static void comida(Map<String, String> e, String campo, String faltante, String valor) {
        String t = texto(valor);
        if (t.isEmpty()) e.put(campo, faltante);
        else if (t.length() > 300) e.put(campo, "Cada comida puede tener hasta 300 caracteres.");
    }

    // ------------------------------------------------------------------ contacto (C-07)

    public static Map<String, String> validarContacto(ContactoSolicitud d) {
        Map<String, String> e = new LinkedHashMap<>();
        String nombre = texto(d.nombre());
        if (nombre.isEmpty()) e.put("nombre", "Ingresa tu nombre.");
        else if (nombre.length() < 2) e.put("nombre", "El nombre debe tener al menos 2 caracteres.");
        else if (nombre.length() > 80) e.put("nombre", "El nombre no puede superar los 80 caracteres.");
        String correo = texto(d.correo());
        if (correo.isEmpty()) e.put("correo", "Ingresa tu correo.");
        else if (!CORREO.matcher(correo).matches() || correo.length() > 120) {
            e.put("correo", "El correo no es válido: usa el formato nombre@dominio.cl.");
        }
        String telefono = telefono(d.telefono());
        if (!telefono.isEmpty() && !CELULAR.matcher(telefono).matches()) {
            e.put("telefono", "El teléfono debe ser un celular chileno: +56 9 y 8 dígitos.");
        }
        if (!en(MOTIVOS_CONTACTO, d.motivo())) e.put("motivo", "Elige el motivo de tu mensaje.");
        String mensaje = texto(d.mensaje());
        if (mensaje.isEmpty()) e.put("mensaje", "Escribe tu mensaje.");
        else if (mensaje.length() < 10 || mensaje.length() > 500) {
            e.put("mensaje", "El mensaje debe tener entre 10 y 500 caracteres.");
        }
        return e;
    }

    public static String telefono(String valor) {
        return valor == null ? "" : valor.replaceAll("\\s", "");
    }

    // ------------------------------------------------------------------ apoyo

    /** Igual que quitarTildes de EP2: sin tildes, en minúscula y sin espacios en los bordes. */
    public static String quitarTildes(String valor) {
        return Normalizer.normalize(texto(valor), Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase();
    }

    /** List.of(...).contains(null) lanza NPE: un campo que no vino simplemente no está en la lista. */
    static boolean en(List<String> lista, String valor) {
        return valor != null && lista.contains(valor);
    }

    public static String texto(String valor) {
        return valor == null ? "" : valor.trim();
    }

    static boolean esEntero(BigDecimal n) {
        return n.stripTrailingZeros().scale() <= 0;
    }

    static boolean enteroEntre(BigDecimal n, int min, int max) {
        return n != null && esEntero(n) && n.compareTo(BigDecimal.valueOf(min)) >= 0
                && n.compareTo(BigDecimal.valueOf(max)) <= 0;
    }
}
