import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ChipEstado from "../../../components/citas/ChipEstado.jsx";
import ComprobantePago from "../../../components/citas/ComprobantePago.jsx";
import HistorialCita from "../../../components/citas/HistorialCita.jsx";
import { obtenerCita } from "../../../services/citasService.js";
import { obtenerPago } from "../../../services/pagosService.js";
import { obtenerNutricionista, obtenerServicio } from "../../../services/serviciosService.js";
import { listarUsuarios } from "../../../services/usuariosService.js";
import { formatearFechaLarga } from "../../../utils/formato.js";

// S-08 (RN-04, RN-23, RN-27): el detalle de una cita, su historial y el comprobante del pago.
export default function AdminCitaDetalle() {
  const { id } = useParams();
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let vigente = true;
    obtenerCita(id).then(async (cita) => {
      if (!cita) {
        if (vigente) setDatos({ id, cita: null });
        return;
      }
      const [servicio, nutricionista, pago, usuarios] = await Promise.all([
        obtenerServicio(cita.servicioCodigo),
        obtenerNutricionista(cita.nutricionistaId),
        cita.pagoId ? obtenerPago(cita.pagoId) : null,
        listarUsuarios(),
      ]);
      const nombres = Object.fromEntries(
        usuarios.map((u) => [u.id, `${u.nombre} ${u.apellido}`.trim()]),
      );
      if (vigente) setDatos({ id, cita, servicio, nutricionista, pago, nombres });
    });
    return () => {
      vigente = false;
    };
  }, [id]);

  const volver = (
    <Link to="/admin/citas" className="d-inline-block mb-3">
      ← Volver a citas
    </Link>
  );

  if (datos?.id !== id) {
    return (
      <section>
        {volver}
        <p role="status">Cargando la cita...</p>
      </section>
    );
  }

  if (!datos.cita) {
    return (
      <section>
        {volver}
        <h1>Cita no encontrada</h1>
        <p>La cita {id} no existe.</p>
      </section>
    );
  }

  const { cita, servicio, nutricionista, pago, nombres } = datos;
  const nombre = (usuarioId) => nombres[usuarioId] ?? usuarioId;

  return (
    <section>
      {volver}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 className="mb-0">Cita {cita.id}</h1>
        <ChipEstado estado={cita.estado} />
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="bg-white border rounded-3 p-3 h-100">
            <h2 className="h5">Datos de la cita</h2>
            <dl className="row mb-3">
              <dt className="col-sm-5">Paciente</dt>
              <dd className="col-sm-7">{nombre(cita.pacienteId)}</dd>
              <dt className="col-sm-5">Nutricionista</dt>
              <dd className="col-sm-7">{nutricionista?.nombre ?? cita.nutricionistaId}</dd>
              <dt className="col-sm-5">Servicio</dt>
              <dd className="col-sm-7">{servicio?.nombre ?? cita.servicioCodigo}</dd>
              <dt className="col-sm-5">Fecha y hora</dt>
              <dd className="col-sm-7">
                {formatearFechaLarga(cita.fecha)}, {cita.hora}
              </dd>
              <dt className="col-sm-5">Motivo</dt>
              <dd className="col-sm-7 text-break mb-0">{cita.motivo || "—"}</dd>
            </dl>
            <h3 className="h6">Historial</h3>
            <HistorialCita cita={cita} nombre={nombre} />
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="bg-white border rounded-3 p-3 h-100">
            <h2 className="h5">Comprobante del pago</h2>
            <ComprobantePago pago={pago} servicio={servicio} />
          </div>
        </div>
      </div>
    </section>
  );
}
