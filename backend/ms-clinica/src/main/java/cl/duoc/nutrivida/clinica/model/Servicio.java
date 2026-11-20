package cl.duoc.nutrivida.clinica.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Servicio del catálogo (tabla servicio de database/03_clinica.sql). No se borra: se desactiva,
 * porque ms-citas guarda el código en cada cita.
 */
@Entity
@Table(name = "servicio")
public class Servicio {

    @Id
    @Column(length = 10)
    private String codigo;

    @Column(length = 12, nullable = false)
    private String tipo;

    @Column(length = 80, nullable = false)
    private String nombre;

    /** null en los planes, que no se agendan como una sola cita. */
    @Column(name = "duracion_min")
    private Integer duracionMin;

    @Column(length = 20, nullable = false)
    private String modalidad;

    @Column(nullable = false)
    private Integer precio;

    @Column(length = 300, nullable = false)
    private String descripcion;

    @Column(nullable = false)
    private Boolean destacado;

    /** Solo talleres. */
    @Column(name = "cupo_max")
    private Integer cupoMax;

    @Column(nullable = false)
    private Boolean activo;

    public Servicio() { }

    public Servicio(String codigo) {
        this.codigo = codigo;
    }

    public String getCodigo() { return codigo; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public Integer getDuracionMin() { return duracionMin; }
    public void setDuracionMin(Integer duracionMin) { this.duracionMin = duracionMin; }
    public String getModalidad() { return modalidad; }
    public void setModalidad(String modalidad) { this.modalidad = modalidad; }
    public Integer getPrecio() { return precio; }
    public void setPrecio(Integer precio) { this.precio = precio; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public Boolean getDestacado() { return destacado; }
    public void setDestacado(Boolean destacado) { this.destacado = destacado; }
    public Integer getCupoMax() { return cupoMax; }
    public void setCupoMax(Integer cupoMax) { this.cupoMax = cupoMax; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
}
