package cl.duoc.nutrivida.clinica.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

/** Mensaje del formulario de contacto (RF-CLI-05). */
@Entity
@Table(name = "contacto")
public class Contacto {

    @Id
    @Column(length = 10)
    private String id;

    @Column(length = 80, nullable = false) private String nombre;
    @Column(length = 120, nullable = false) private String correo;
    @Column(length = 15, nullable = false) private String telefono;
    @Column(length = 30, nullable = false) private String motivo;
    @Column(length = 500, nullable = false) private String mensaje;

    @Column(nullable = false)
    private LocalDate fecha;

    public Contacto() { }

    public Contacto(String id, String nombre, String correo, String telefono, String motivo, String mensaje,
            LocalDate fecha) {
        this.id = id;
        this.nombre = nombre;
        this.correo = correo;
        this.telefono = telefono;
        this.motivo = motivo;
        this.mensaje = mensaje;
        this.fecha = fecha;
    }

    public String getId() { return id; }
    public String getNombre() { return nombre; }
    public String getCorreo() { return correo; }
    public String getTelefono() { return telefono; }
    public String getMotivo() { return motivo; }
    public String getMensaje() { return mensaje; }
    public LocalDate getFecha() { return fecha; }
}
