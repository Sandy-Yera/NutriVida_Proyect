import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ChipEstado from "../../components/citas/ChipEstado.jsx";
import ResumenCita from "../../components/citas/ResumenCita.jsx";
import { obtenerSesion } from "../../auth/auth.js";
import { obtenerCita } from "../../services/citasService.js";
import { obtenerPago } from "../../services/pagosService.js";
import { obtenerNutricionista, obtenerServicio } from "../../services/serviciosService.js";

// RN-22: "Solicitud enviada. La clínica confirmará tu hora." con el resumen y el pago.
// RN-24: el paciente solo ve sus propias citas; otra cita se trata como inexistente.
export default function PagoExitoso() {
  const { citaId } = useParams();
  const [sesion] = useState(() => obtenerSesion());
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let vigente = true;
    obtenerCita(citaId).then(async (cita) => {
      if (!cita || cita.pacienteId !== sesion?.id) {
        if (vigente) setDatos({ cita: null });
        return;
      }
      const [servicio, nutricionista, pago] = await Promise.all([
        obtenerServicio(cita.servicioCodigo),
        obtenerNutricionista(cita.nutricionistaId),
        obtenerPago(cita.pagoId),
      ]);
      if (vigente) setDatos({ cita, servicio, nutricionista, pago });
    });
    return () => {
      vigente = false;
    };
  }, [citaId, sesion?.id]);

  if (!datos) {
    return (
      <section className="container py-4">
        <p role="status">Cargando tu solicitud...</p>
      </section>
    );
  }

  if (!datos.cita) {
    return (
      <section className="container py-4">
        <h1>No encontramos esa solicitud</h1>
        <Link className="btn btn-primary" to="/mis-citas">
          Ir a Mis citas
        </Link>
      </section>
    );
  }

  const { cita, servicio, nutricionista, pago } = datos;

  return (
    <section className="container py-4">
      <h1>Solicitud enviada</h1>
      <p role="status" className="alert alert-success">
        La clínica confirmará tu hora. Mientras tanto, tu cita queda{" "}
        <ChipEstado estado={cita.estado} />.
      </p>

      <div className="bg-white border rounded-3 p-3 mb-3">
        <h2 className="h5">Cita {cita.id}</h2>
        <ResumenCita
          servicio={servicio}
          nutricionista={nutricionista}
          fecha={cita.fecha}
          hora={cita.hora}
          motivo={cita.motivo}
        />
        {pago && (
          <p className="small text-body-secondary mt-3 mb-0">
            Pago {pago.id} con tarjeta terminada en {pago.ultimos4}.
          </p>
        )}
      </div>

      <div className="d-flex flex-wrap gap-2">
        <Link className="btn btn-primary" to="/mis-citas">
          Ir a Mis citas
        </Link>
        <Link className="btn btn-outline-secondary" to="/citas/solicitar">
          Solicitar otra cita
        </Link>
      </div>
    </section>
  );
}
