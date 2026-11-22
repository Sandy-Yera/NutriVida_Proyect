package cl.duoc.nutrivida.usuarios.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

/**
 * Cuenta de una persona (tabla usuario de database/01_usuarios.sql). La clave es el hash BCrypt:
 * nunca sale de este microservicio (los DTO no la tienen).
 */
@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @Column(length = 10)
    private String id;

    @Column(nullable = false, length = 50)
    private String nombre;

    @Column(nullable = false, length = 50)
    private String apellido;

    @Column(nullable = false, unique = true, length = 12)
    private String rut;

    @Column(nullable = false, unique = true, length = 120)
    private String correo;

    @Column(nullable = false, length = 20)
    private String telefono;

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Column(nullable = false, length = 60)
    private String clave;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Rol rol;

    @Column(name = "nutricionista_id", unique = true, length = 10)
    private String nutricionistaId;

    @Column(nullable = false)
    private boolean activo;

    @Column(name = "creado_en", nullable = false)
    private LocalDate creadoEn;

    protected Usuario() { }

    public Usuario(String id, String nombre, String apellido, String rut, String correo, String telefono,
            LocalDate fechaNacimiento, String clave, Rol rol, String nutricionistaId, boolean activo,
            LocalDate creadoEn) {
        this.id = id;
        this.nombre = nombre;
        this.apellido = apellido;
        this.rut = rut;
        this.correo = correo;
        this.telefono = telefono;
        this.fechaNacimiento = fechaNacimiento;
        this.clave = clave;
        this.activo = activo;
        this.creadoEn = creadoEn;
        cambiarRol(rol, nutricionistaId);
    }

    /** RN-30: solo un nutricionista queda vinculado a un nutricionistaId. */
    public void cambiarRol(Rol nuevo, String nutricionistaId) {
        this.rol = nuevo;
        this.nutricionistaId = nuevo == Rol.NUTRICIONISTA ? nutricionistaId : null;
    }

    public String getId() { return id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }
    public String getRut() { return rut; }
    public void setRut(String rut) { this.rut = rut; }
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(LocalDate fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }
    public String getClave() { return clave; }
    public void setClave(String clave) { this.clave = clave; }
    public Rol getRol() { return rol; }
    public String getNutricionistaId() { return nutricionistaId; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    public LocalDate getCreadoEn() { return creadoEn; }
}
