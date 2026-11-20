package cl.duoc.nutrivida.clinica.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Medición de un paciente (C-T4). Rangos en ReglasClinica.validarMedicion y en los CHECK de la tabla. */
@Entity
@Table(name = "medicion")
public class Medicion {

    @Id
    @Column(length = 10)
    private String id;

    @Column(name = "paciente_id", length = 10, nullable = false)
    private String pacienteId;

    @Column(name = "nutricionista_id", length = 10, nullable = false)
    private String nutricionistaId;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "peso_kg", precision = 5, scale = 1, nullable = false)
    private BigDecimal pesoKg;

    @Column(name = "talla_cm", precision = 5, scale = 1, nullable = false)
    private BigDecimal tallaCm;

    @Column(name = "cintura_cm", precision = 5, scale = 1)
    private BigDecimal cinturaCm;

    @Column(name = "cadera_cm", precision = 5, scale = 1)
    private BigDecimal caderaCm;

    @Column(name = "grasa_pct", precision = 4, scale = 1)
    private BigDecimal grasaPct;

    @Column(length = 300, nullable = false)
    private String notas;

    public Medicion() { }

    public Medicion(String id, String pacienteId, String nutricionistaId, LocalDate fecha, BigDecimal pesoKg,
            BigDecimal tallaCm, BigDecimal cinturaCm, BigDecimal caderaCm, BigDecimal grasaPct, String notas) {
        this.id = id;
        this.pacienteId = pacienteId;
        this.nutricionistaId = nutricionistaId;
        this.fecha = fecha;
        this.pesoKg = pesoKg;
        this.tallaCm = tallaCm;
        this.cinturaCm = cinturaCm;
        this.caderaCm = caderaCm;
        this.grasaPct = grasaPct;
        this.notas = notas;
    }

    public String getId() { return id; }
    public String getPacienteId() { return pacienteId; }
    public String getNutricionistaId() { return nutricionistaId; }
    public LocalDate getFecha() { return fecha; }
    public BigDecimal getPesoKg() { return pesoKg; }
    public BigDecimal getTallaCm() { return tallaCm; }
    public BigDecimal getCinturaCm() { return cinturaCm; }
    public BigDecimal getCaderaCm() { return caderaCm; }
    public BigDecimal getGrasaPct() { return grasaPct; }
    public String getNotas() { return notas; }
}
