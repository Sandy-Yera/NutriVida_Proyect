package cl.duoc.nutrivida.usuarios.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Correlativo de IDs con el formato de EP2 (U103, U104…). Se lee con bloqueo exclusivo
 * (ContadorRepository.bloquear): dos registros nunca reciben el mismo número.
 */
@Entity
@Table(name = "contador")
public class Contador {

    public static final String USUARIO = "USUARIO";

    @Id
    @Column(length = 10)
    private String nombre;

    @Column(nullable = false)
    private Integer ultimo;

    protected Contador() { }

    public Contador(String nombre, int ultimo) {
        this.nombre = nombre;
        this.ultimo = ultimo;
    }

    /** Avanza el correlativo. Llamar solo con la fila bloqueada. */
    public int siguiente() {
        ultimo = ultimo + 1;
        return ultimo;
    }

    public String getNombre() { return nombre; }
    public Integer getUltimo() { return ultimo; }
}
