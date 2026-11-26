package cl.duoc.nutrivida.clinica.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Nutricionista y su jornada. ms-citas lee id, dias, horaInicio y horaFin para la agenda.
 * Los días van en nutricionista_dia (0 = domingo … 6 = sábado, como en EP2).
 */
@Entity
@Table(name = "nutricionista")
public class Nutricionista {

    @Id
    @Column(length = 10)
    private String id;

    /** Su cuenta en ms-usuarios (por valor, sin FK entre esquemas). */
    @Column(name = "usuario_id", length = 10, nullable = false, unique = true)
    private String usuarioId;

    @Column(length = 80, nullable = false)
    private String nombre;

    @Column(length = 120, nullable = false)
    private String especialidad;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    // EAGER: el catálogo es chico y siempre se entrega con los días.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "nutricionista_dia", joinColumns = @JoinColumn(name = "nutricionista_id"))
    @Column(name = "dia", nullable = false)
    private Set<Integer> dias = new HashSet<>();

    public Nutricionista() { }

    public String getId() { return id; }
    public String getUsuarioId() { return usuarioId; }
    public String getNombre() { return nombre; }
    public String getEspecialidad() { return especialidad; }
    public LocalTime getHoraInicio() { return horaInicio; }
    public LocalTime getHoraFin() { return horaFin; }
    public Set<Integer> getDias() { return dias; }
}
