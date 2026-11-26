package cl.duoc.nutrivida.clinica.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.Instant;

/** Foto de perfil de un nutricionista. Va aparte para no cargar la imagen al listar el catálogo. */
@Entity
@Table(name = "nutricionista_foto")
public class FotoNutricionista {

    @Id
    @Column(name = "nutricionista_id", length = 10)
    private String nutricionistaId;

    @Column(length = 20, nullable = false)
    private String tipo;

    @Lob
    @Column(nullable = false, columnDefinition = "longblob")
    private byte[] datos;

    @Column(name = "actualizada_en", nullable = false)
    private Instant actualizadaEn;

    public FotoNutricionista() { }

    public FotoNutricionista(String nutricionistaId, String tipo, byte[] datos, Instant actualizadaEn) {
        this.nutricionistaId = nutricionistaId;
        this.tipo = tipo;
        this.datos = datos;
        this.actualizadaEn = actualizadaEn;
    }

    public String getNutricionistaId() { return nutricionistaId; }
    public String getTipo() { return tipo; }
    public byte[] getDatos() { return datos; }
    public Instant getActualizadaEn() { return actualizadaEn; }
}
