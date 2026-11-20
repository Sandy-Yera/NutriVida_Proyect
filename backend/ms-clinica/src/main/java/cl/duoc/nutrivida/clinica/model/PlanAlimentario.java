package cl.duoc.nutrivida.clinica.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

/**
 * Plan alimentario. Se guardan todos; el vigente es el de vigenteDesde más reciente.
 * Las 5 comidas son columnas porque siempre son las mismas (en JSON viajan en "comidas").
 */
@Entity
@Table(name = "plan_alimentario")
public class PlanAlimentario {

    @Id
    @Column(length = 10)
    private String id;

    @Column(name = "paciente_id", length = 10, nullable = false)
    private String pacienteId;

    @Column(name = "nutricionista_id", length = 10, nullable = false)
    private String nutricionistaId;

    @Column(name = "vigente_desde", nullable = false)
    private LocalDate vigenteDesde;

    @Column(length = 120, nullable = false)
    private String objetivo;

    @Column(name = "kcal_diarias", nullable = false)
    private Integer kcalDiarias;

    @Column(length = 300, nullable = false) private String desayuno;
    @Column(length = 300, nullable = false) private String colacion;
    @Column(length = 300, nullable = false) private String almuerzo;
    @Column(length = 300, nullable = false) private String once;
    @Column(length = 300, nullable = false) private String cena;

    @Column(length = 500, nullable = false)
    private String indicaciones;

    public PlanAlimentario() { }

    public PlanAlimentario(String id, String pacienteId) {
        this.id = id;
        this.pacienteId = pacienteId;
    }

    public void llenar(String nutricionistaId, LocalDate vigenteDesde, String objetivo, Integer kcalDiarias,
            String desayuno, String colacion, String almuerzo, String once, String cena, String indicaciones) {
        this.nutricionistaId = nutricionistaId;
        this.vigenteDesde = vigenteDesde;
        this.objetivo = objetivo;
        this.kcalDiarias = kcalDiarias;
        this.desayuno = desayuno;
        this.colacion = colacion;
        this.almuerzo = almuerzo;
        this.once = once;
        this.cena = cena;
        this.indicaciones = indicaciones;
    }

    public String getId() { return id; }
    public String getPacienteId() { return pacienteId; }
    public String getNutricionistaId() { return nutricionistaId; }
    public LocalDate getVigenteDesde() { return vigenteDesde; }
    public String getObjetivo() { return objetivo; }
    public Integer getKcalDiarias() { return kcalDiarias; }
    public String getDesayuno() { return desayuno; }
    public String getColacion() { return colacion; }
    public String getAlmuerzo() { return almuerzo; }
    public String getOnce() { return once; }
    public String getCena() { return cena; }
    public String getIndicaciones() { return indicaciones; }
}
