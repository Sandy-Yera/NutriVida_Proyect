package cl.duoc.nutrivida.citas.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Cita (tabla cita de database/02_citas.sql). pacienteId, nutricionistaId y servicioCodigo son
 * referencias por valor a otros microservicios: no hay claves foráneas entre esquemas.
 * El historial y el recordatorio se borran junto con la cita (DELETE de canceladas, contrato §6.1).
 */
@Entity
@Table(name = "cita")
public class Cita {

    @Id
    @Column(length = 10)
    private String id;

    @Column(name = "paciente_id", length = 10, nullable = false)
    private String pacienteId;

    @Column(name = "nutricionista_id", length = 10, nullable = false)
    private String nutricionistaId;

    @Column(name = "servicio_codigo", length = 10, nullable = false)
    private String servicioCodigo;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private LocalTime hora;

    /** null en los planes: ocupan un solo bloque (RN-11). */
    @Column(name = "duracion_min")
    private Integer duracionMin;

    @Column(length = 300, nullable = false)
    private String motivo;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(length = 12, nullable = false)
    private EstadoCita estado;

    /** RN-35: UNIQUE en la base. Un pago respalda una sola cita. */
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pago_id", nullable = false, unique = true)
    private Pago pago;

    @Column(name = "creada_en", nullable = false)
    private LocalDate creadaEn;

    @OneToMany(mappedBy = "cita", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("fecha ASC, id ASC")
    private List<HistorialCita> historial = new ArrayList<>();

    @OneToMany(mappedBy = "cita", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Recordatorio> recordatorios = new ArrayList<>();

    public Cita() { }

    public Cita(String id, String pacienteId, String nutricionistaId, String servicioCodigo,
            LocalDate fecha, LocalTime hora, Integer duracionMin, String motivo, EstadoCita estado,
            Pago pago, LocalDate creadaEn) {
        this.id = id;
        this.pacienteId = pacienteId;
        this.nutricionistaId = nutricionistaId;
        this.servicioCodigo = servicioCodigo;
        this.fecha = fecha;
        this.hora = hora;
        this.duracionMin = duracionMin;
        this.motivo = motivo;
        this.estado = estado;
        this.pago = pago;
        this.creadaEn = creadaEn;
    }

    /**
     * RN-04: cambia el estado y deja la entrada en el historial en el mismo paso, así no puede
     * haber un cambio sin registro. Reprogramar también pasa por aquí (de X a PENDIENTE).
     * No valida la transición: eso lo decide el service con ReglasCita.
     */
    public HistorialCita registrarCambio(EstadoCita nuevo, String usuarioId, Instant cuando) {
        HistorialCita entrada = new HistorialCita(this, cuando, this.estado, nuevo, usuarioId);
        historial.add(entrada);
        this.estado = nuevo;
        return entrada;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPacienteId() { return pacienteId; }
    public void setPacienteId(String pacienteId) { this.pacienteId = pacienteId; }
    public String getNutricionistaId() { return nutricionistaId; }
    public void setNutricionistaId(String nutricionistaId) { this.nutricionistaId = nutricionistaId; }
    public String getServicioCodigo() { return servicioCodigo; }
    public void setServicioCodigo(String servicioCodigo) { this.servicioCodigo = servicioCodigo; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public LocalTime getHora() { return hora; }
    public void setHora(LocalTime hora) { this.hora = hora; }
    public Integer getDuracionMin() { return duracionMin; }
    public void setDuracionMin(Integer duracionMin) { this.duracionMin = duracionMin; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public EstadoCita getEstado() { return estado; }
    public void setEstado(EstadoCita estado) { this.estado = estado; }
    public Pago getPago() { return pago; }
    public void setPago(Pago pago) { this.pago = pago; }
    public LocalDate getCreadaEn() { return creadaEn; }
    public void setCreadaEn(LocalDate creadaEn) { this.creadaEn = creadaEn; }
    public List<HistorialCita> getHistorial() { return historial; }
    public List<Recordatorio> getRecordatorios() { return recordatorios; }
}
