package cl.duoc.nutrivida.citas.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Pago simulado (tabla pago de database/02_citas.sql). No guarda la tarjeta: solo los 4 últimos
 * dígitos. El enlace con la cita está en Cita.pago (cita.pago_id), no aquí.
 */
@Entity
@Table(name = "pago")
public class Pago {

    @Id
    @Column(length = 10)
    private String id;

    /** Quien pagó. Referencia por valor a ms-usuarios; es el dueño del comprobante. */
    @Column(name = "paciente_id", length = 10, nullable = false)
    private String pacienteId;

    @Column(nullable = false)
    private Integer monto;

    @Column(length = 4, nullable = false)
    private String ultimos4;

    // VARCHAR y no ENUM de MySQL: así la columna es la misma que crea 02_citas.sql.
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(length = 12, nullable = false)
    private EstadoPago estado;

    @Column(length = 200)
    private String motivo;

    @Column(nullable = false)
    private LocalDate fecha;

    public Pago() { }

    public Pago(String id, String pacienteId, Integer monto, String ultimos4, EstadoPago estado,
            String motivo, LocalDate fecha) {
        this.id = id;
        this.pacienteId = pacienteId;
        this.monto = monto;
        this.ultimos4 = ultimos4;
        this.estado = estado;
        this.motivo = motivo;
        this.fecha = fecha;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPacienteId() { return pacienteId; }
    public void setPacienteId(String pacienteId) { this.pacienteId = pacienteId; }
    public Integer getMonto() { return monto; }
    public void setMonto(Integer monto) { this.monto = monto; }
    public String getUltimos4() { return ultimos4; }
    public void setUltimos4(String ultimos4) { this.ultimos4 = ultimos4; }
    public EstadoPago getEstado() { return estado; }
    public void setEstado(EstadoPago estado) { this.estado = estado; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
}
