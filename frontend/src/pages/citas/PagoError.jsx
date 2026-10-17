import { Link, useLocation } from "react-router-dom";

// RN-22: el pago fue rechazado. La reserva sigue intacta en nv_reserva, así que
// "Intentar con otra tarjeta" vuelve al pago con la misma selección.
export default function PagoError() {
  const location = useLocation();
  const motivo = location.state?.motivo ?? "El pago no se pudo completar.";

  return (
    <section className="container py-4">
      <h1>No pudimos procesar el pago</h1>
      <p role="alert" className="alert alert-danger">
        {motivo} No se hizo ningún cobro.
      </p>
      <p>Tu selección sigue guardada: puedes intentar con otra tarjeta.</p>
      <div className="d-flex flex-wrap gap-2">
        <Link className="btn btn-primary" to="/citas/pago">
          Intentar con otra tarjeta
        </Link>
        <Link className="btn btn-outline-secondary" to="/citas/solicitar">
          Cambiar la solicitud
        </Link>
      </div>
    </section>
  );
}
