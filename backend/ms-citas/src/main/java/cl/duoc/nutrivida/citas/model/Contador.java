package cl.duoc.nutrivida.citas.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Correlativo de IDs con el formato de EP2 (C0006, P0006…). Se lee con bloqueo exclusivo
 * (ContadorRepository.bloquear): dos transacciones nunca reciben el mismo número.
 */
@Entity
@Table(name = "contador")
public class Contador {

    public static final String CITA = "CITA";
    public static final String PAGO = "PAGO";

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

    /** Avanza el correlativo y devuelve el nuevo valor. Llamar solo con la fila bloqueada. */
    public int siguiente() {
        ultimo = ultimo + 1;
        return ultimo;
    }

    public String getNombre() { return nombre; }
    public Integer getUltimo() { return ultimo; }
}
