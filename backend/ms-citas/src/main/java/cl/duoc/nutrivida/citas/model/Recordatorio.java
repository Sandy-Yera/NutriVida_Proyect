package cl.duoc.nutrivida.citas.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * RN-07 (S-34): recordatorio enviado para una cita confirmada a la que le faltan 24 h o menos.
 * Uno por cita (UNIQUE en la base); al reprogramar se borra para que la nueva fecha tenga el suyo.
 */
@Entity
@Table(name = "recordatorio")
public class Recordatorio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cita_id", nullable = false, unique = true)
    private Cita cita;

    @Column(name = "enviado_en", nullable = false)
    private Instant enviadoEn;

    protected Recordatorio() { }

    public Recordatorio(Cita cita, Instant enviadoEn) {
        this.cita = cita;
        this.enviadoEn = enviadoEn;
    }

    public Long getId() { return id; }
    public Cita getCita() { return cita; }
    public Instant getEnviadoEn() { return enviadoEn; }
}
