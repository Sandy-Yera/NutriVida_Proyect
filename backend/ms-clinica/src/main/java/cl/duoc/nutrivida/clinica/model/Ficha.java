package cl.duoc.nutrivida.clinica.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

/**
 * Ficha clínica. Su id es el del paciente en ms-usuarios: una ficha por paciente.
 * Solo el nutricionista a cargo la escribe (FichaService).
 */
@Entity
@Table(name = "ficha")
public class Ficha {

    @Id
    @Column(name = "paciente_id", length = 10)
    private String pacienteId;

    @Column(name = "nutricionista_id", length = 10, nullable = false)
    private String nutricionistaId;

    @Column(length = 20, nullable = false)
    private String objetivo;

    @Column(length = 500, nullable = false)
    private String antecedentes;

    @Column(name = "creada_en", nullable = false)
    private LocalDate creadaEn;

    public Ficha() { }

    public Ficha(String pacienteId, String nutricionistaId, String objetivo, String antecedentes, LocalDate creadaEn) {
        this.pacienteId = pacienteId;
        this.nutricionistaId = nutricionistaId;
        this.objetivo = objetivo;
        this.antecedentes = antecedentes;
        this.creadaEn = creadaEn;
    }

    public String getPacienteId() { return pacienteId; }
    public String getNutricionistaId() { return nutricionistaId; }
    public String getObjetivo() { return objetivo; }
    public String getAntecedentes() { return antecedentes; }
    public LocalDate getCreadaEn() { return creadaEn; }
}
