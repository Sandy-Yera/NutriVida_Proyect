package cl.duoc.nutrivida.clinica.service;

import cl.duoc.nutrivida.clinica.model.Contador;
import cl.duoc.nutrivida.clinica.repository.ContadorRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * IDs con el formato de EP2. Se llama dentro de la transacción del service que guarda: si esa
 * transacción falla, el número tampoco se consume. Calcular MAX(id) + 1 chocaría con dos
 * peticiones a la vez; la fila del contador bloqueada no.
 */
@Component
public class Correlativos {

    public static final String MEDICION = "MEDICION";
    public static final String PLAN = "PLAN";
    public static final String CONTACTO = "CONTACTO";

    private final ContadorRepository contadores;

    public Correlativos(ContadorRepository contadores) {
        this.contadores = contadores;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public String siguiente(String nombre, String prefijo, int digitos) {
        Contador c = contadores.bloquear(nombre).orElseGet(() -> contadores.save(new Contador(nombre, 0)));
        return c.siguiente(prefijo, digitos);
    }
}
