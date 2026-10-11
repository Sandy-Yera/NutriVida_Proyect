import FormContacto from "../../components/clinica/FormContacto.jsx";
import MapaDiferido from "../../components/clinica/MapaDiferido.jsx";
import { INFO_CLINICA, URL_COMO_LLEGAR } from "../../data/infoClinica.js";
import { registrarContacto } from "../../services/serviciosService.js";

export default function Contacto() {
  async function enviar(datos) {
    await registrarContacto(datos);
  }

  return (
    <section className="container py-4">
      <h1>Contacto</h1>
      <p className="lead text-body-secondary">
        ¿Tienes dudas sobre un servicio o sobre tu plan? Escríbenos y te responderemos al correo que
        indiques.
      </p>
      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="bg-white border rounded-3 p-3 p-md-4">
            <h2 className="h4 mb-3">Escríbenos</h2>
            <FormContacto onEnviar={enviar} />
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <h2 className="h4 mb-3">Dónde estamos</h2>
          <MapaDiferido />
          <dl className="row small mt-3 mb-3">
            <dt className="col-4 fw-semibold">Dirección</dt>
            <dd className="col-8">
              {INFO_CLINICA.direccion}, {INFO_CLINICA.region}
            </dd>
            <dt className="col-4 fw-semibold">Horario</dt>
            <dd className="col-8">
              {INFO_CLINICA.horario.map((tramo) => (
                <span key={tramo.dias} className="d-block">
                  {tramo.dias}: {tramo.horas}
                </span>
              ))}
            </dd>
            <dt className="col-4 fw-semibold">Teléfono</dt>
            <dd className="col-8">{INFO_CLINICA.telefono}</dd>
            <dt className="col-4 fw-semibold">Correo</dt>
            <dd className="col-8 mb-0">{INFO_CLINICA.correo}</dd>
          </dl>
          <a
            className="btn btn-primary"
            href={URL_COMO_LLEGAR}
            target="_blank"
            rel="noopener noreferrer"
          >
            Cómo llegar
          </a>
          <p className="small text-body-secondary mt-2 mb-0">
            Abre Google Maps con la ruta desde tu ubicación hasta la clínica.
          </p>
        </div>
      </div>
    </section>
  );
}
