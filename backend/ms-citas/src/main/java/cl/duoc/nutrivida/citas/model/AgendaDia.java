package cl.duoc.nutrivida.citas.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;

/**
 * Candado de la agenda de un nutricionista en un día (contrato §5, RN-10). No guarda datos:
 * la fila existe para bloquearla. AgendaDiaRepository.bloquear la crea o la toma con un
 * bloqueo exclusivo que dura hasta el COMMIT, así dos reservas del mismo día se hacen de a una.
 */
@Entity
@Table(name = "agenda_dia")
public class AgendaDia {

    @EmbeddedId
    private Clave clave;

    protected AgendaDia() { }

    public AgendaDia(String nutricionistaId, LocalDate fecha) {
        this.clave = new Clave(nutricionistaId, fecha);
    }

    public Clave getClave() { return clave; }

    @Embeddable
    public static class Clave implements Serializable {

        @Column(name = "nutricionista_id", length = 10, nullable = false)
        private String nutricionistaId;

        @Column(nullable = false)
        private LocalDate fecha;

        protected Clave() { }

        public Clave(String nutricionistaId, LocalDate fecha) {
            this.nutricionistaId = nutricionistaId;
            this.fecha = fecha;
        }

        public String getNutricionistaId() { return nutricionistaId; }
        public LocalDate getFecha() { return fecha; }

        @Override
        public boolean equals(Object otro) {
            return otro instanceof Clave c
                    && Objects.equals(nutricionistaId, c.nutricionistaId)
                    && Objects.equals(fecha, c.fecha);
        }

        @Override
        public int hashCode() { return Objects.hash(nutricionistaId, fecha); }
    }
}
