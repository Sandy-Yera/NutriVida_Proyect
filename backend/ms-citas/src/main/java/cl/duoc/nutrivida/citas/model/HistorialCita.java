package cl.duoc.nutrivida.citas.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * RN-04: una entrada del historial de una cita. En el JSON se llama { fecha, de, a, por },
 * como en EP2; en la tabla, estado_anterior, estado_nuevo y usuario_id.
 * Se crea solo con Cita.registrarCambio.
 */
@Entity
@Table(name = "historial_cita")
public class HistorialCita {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cita_id", nullable = false)
    private Cita cita;

    /** Instante en UTC (en JSON, ISO-8601 con Z, como el toISOString de EP2). */
    @Column(nullable = false)
    private Instant fecha;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "estado_anterior", length = 12, nullable = false)
    private EstadoCita estadoAnterior;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "estado_nuevo", length = 12, nullable = false)
    private EstadoCita estadoNuevo;

    /** sub del JWT de quien hizo el cambio. */
    @Column(name = "usuario_id", length = 10)
    private String usuarioId;

    protected HistorialCita() { }

    HistorialCita(Cita cita, Instant fecha, EstadoCita estadoAnterior, EstadoCita estadoNuevo,
            String usuarioId) {
        this.cita = cita;
        this.fecha = fecha;
        this.estadoAnterior = estadoAnterior;
        this.estadoNuevo = estadoNuevo;
        this.usuarioId = usuarioId;
    }

    public Long getId() { return id; }
    public Cita getCita() { return cita; }
    public Instant getFecha() { return fecha; }
    public EstadoCita getEstadoAnterior() { return estadoAnterior; }
    public EstadoCita getEstadoNuevo() { return estadoNuevo; }
    public String getUsuarioId() { return usuarioId; }
}
