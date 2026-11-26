package cl.duoc.nutrivida.citas.dto;

/**
 * Datos de la tarjeta que llegan en POST /api/citas. Solo se usan para validar y simular el
 * cobro: nunca se guardan. De la tarjeta queda únicamente pago.ultimos4.
 * vencimiento viene como MM/AA, igual que en el formulario de EP2.
 */
public record Tarjeta(String titular, String numero, String vencimiento, String cvv) {

    /** El número no aparece en logs ni en mensajes de error si alguien imprime el objeto. */
    @Override
    public String toString() {
        String digitos = numero == null ? "" : numero.replaceAll("\\D", "");
        String fin = digitos.length() >= 4 ? digitos.substring(digitos.length() - 4) : "";
        return "Tarjeta[titular=" + titular + ", numero=****" + fin + "]";
    }
}
