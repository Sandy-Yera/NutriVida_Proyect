package cl.duoc.nutrivida.usuarios.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

/** Consejo nutricional (RF-ACC-09). Solo lectura, como en EP2. */
@Entity
@Table(name = "articulo")
public class Articulo {

    @Id
    @Column(length = 60)
    private String id;

    @Column(nullable = false, length = 120)
    private String titulo;

    @Column(nullable = false, length = 250)
    private String resumen;

    @Column(nullable = false, length = 2000)
    private String contenido;

    @Column(name = "autor_nutricionista_id", nullable = false, length = 10)
    private String autorNutricionistaId;

    @Column(nullable = false)
    private LocalDate fecha;

    protected Articulo() { }

    public Articulo(String id, String titulo, String resumen, String contenido, String autorNutricionistaId,
            LocalDate fecha) {
        this.id = id;
        this.titulo = titulo;
        this.resumen = resumen;
        this.contenido = contenido;
        this.autorNutricionistaId = autorNutricionistaId;
        this.fecha = fecha;
    }

    public String getId() { return id; }
    public String getTitulo() { return titulo; }
    public String getResumen() { return resumen; }
    public String getContenido() { return contenido; }
    public String getAutorNutricionistaId() { return autorNutricionistaId; }
    public LocalDate getFecha() { return fecha; }
}
