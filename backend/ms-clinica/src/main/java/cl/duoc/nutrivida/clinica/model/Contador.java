package cl.duoc.nutrivida.clinica.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Correlativo de IDs con el formato de EP2 (M0008, PA003, CT003). La fila se lee bloqueada
 * (ContadorRepository.bloquear), así dos transacciones nunca reciben el mismo número.
 */
@Entity
@Table(name = "contador")
public class Contador {

    @Id
    @Column(length = 10)
    private String nombre;

    @Column(nullable = false)
    private Integer ultimo;

    public Contador() { }

    public Contador(String nombre, int ultimo) {
        this.nombre = nombre;
        this.ultimo = ultimo;
    }

    /** Avanza y devuelve el id: siguiente("M", 4) → "M0008". */
    public String siguiente(String prefijo, int digitos) {
        ultimo = ultimo + 1;
        return prefijo + String.format("%0" + digitos + "d", ultimo);
    }

    public String getNombre() { return nombre; }
    public Integer getUltimo() { return ultimo; }
}
