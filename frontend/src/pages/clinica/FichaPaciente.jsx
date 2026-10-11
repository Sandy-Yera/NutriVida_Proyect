import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import FormFicha from "../../components/clinica/FormFicha.jsx";
import FormMedicion from "../../components/clinica/FormMedicion.jsx";
import FormPlan from "../../components/clinica/FormPlan.jsx";
import { obtenerSesion } from "../../auth/auth.js";
import {
  crearFicha,
  guardarPlan,
  listarMediciones,
  obtenerFicha,
  obtenerPlan,
  registrarMedicion,
} from "../../services/fichasService.js";
import { obtenerUsuario } from "../../services/usuariosService.js";
import { formatearFecha } from "../../utils/formato.js";
import {
  OBJETIVOS_FICHA,
  accesoFicha,
  calcularEdad,
  calcularImc,
  clasificarImc,
  formatearMedida,
} from "../../utils/clinica.js";

function VolverAPacientes() {
  return (
    <Link to="/nutricionista/pacientes" className="d-inline-block mb-3">
      <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
      Mis pacientes
    </Link>
  );
}

async function cargarFicha(pacienteId, nutricionistaId) {
  const ficha = await obtenerFicha(pacienteId);
  const acceso = accesoFicha(ficha, nutricionistaId);
  if (acceso === "AJENA") return { acceso };
  const paciente = await obtenerUsuario(pacienteId);
  if (!paciente || paciente.rol !== "PACIENTE") return { acceso: "NO_EXISTE" };
  if (acceso === "SIN_FICHA") return { acceso, paciente };
  const [mediciones, plan] = await Promise.all([
    listarMediciones(pacienteId),
    obtenerPlan(pacienteId),
  ]);
  return { acceso, paciente, ficha, mediciones, plan };
}

function DatosPaciente({ paciente }) {
  return (
    <p className="text-body-secondary">
      RUT {paciente.rut} · {calcularEdad(paciente.fechaNacimiento)} años · {paciente.telefono} ·{" "}
      {paciente.correo}
    </p>
  );
}

function HistorialMediciones({ mediciones, objetivo }) {
  if (mediciones.length === 0) {
    return <p className="text-body-secondary mb-0">Aún no hay mediciones registradas.</p>;
  }
  const filas = [...mediciones]
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
    .map((medicion) => {
      const imc = calcularImc(medicion.pesoKg, medicion.tallaCm);
      const clasificacion = clasificarImc(imc, objetivo);
      return {
        ...medicion,
        imcTexto: `${formatearMedida(imc, "IMC")}${clasificacion ? ` · ${clasificacion}` : ""}`,
      };
    });
  return (
    <>
      <table className="table align-middle mb-0 d-none d-md-table">
        <caption className="visually-hidden">
          Historial de mediciones, de la más reciente a la más antigua
        </caption>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col" className="text-end">
              Peso (kg)
            </th>
            <th scope="col" className="text-end">
              Talla (cm)
            </th>
            <th scope="col">IMC</th>
            <th scope="col" className="text-end">
              Cintura (cm)
            </th>
            <th scope="col" className="text-end">
              Cadera (cm)
            </th>
            <th scope="col" className="text-end">
              % grasa
            </th>
            <th scope="col">Notas</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id}>
              <td className="text-nowrap">{formatearFecha(fila.fecha)}</td>
              <td className="text-end">{formatearMedida(fila.pesoKg, "PESO")}</td>
              <td className="text-end">{formatearMedida(fila.tallaCm, "TALLA")}</td>
              <td className="text-nowrap">{fila.imcTexto}</td>
              <td className="text-end">{formatearMedida(fila.cinturaCm, "CINTURA")}</td>
              <td className="text-end">{formatearMedida(fila.caderaCm, "CADERA")}</td>
              <td className="text-end">{formatearMedida(fila.grasaPct, "GRASA")}</td>
              <td>{fila.notas || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="list-unstyled mb-0 d-md-none" aria-label="Historial de mediciones">
        {filas.map((fila) => (
          <li key={fila.id} className="border-bottom py-2">
            <div className="fw-semibold">{formatearFecha(fila.fecha)}</div>
            <div>
              Peso {formatearMedida(fila.pesoKg, "PESO", { conUnidad: true })} · Talla{" "}
              {formatearMedida(fila.tallaCm, "TALLA", { conUnidad: true })} · IMC {fila.imcTexto}
            </div>
            <div className="small text-body-secondary">
              Cintura {formatearMedida(fila.cinturaCm, "CINTURA", { conUnidad: true })} · Cadera{" "}
              {formatearMedida(fila.caderaCm, "CADERA", { conUnidad: true })} · Grasa{" "}
              {formatearMedida(fila.grasaPct, "GRASA", { conUnidad: true })}
              {fila.notas && ` · ${fila.notas}`}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function FichaPaciente() {
  const { pacienteId } = useParams();
  const nutricionistaId = obtenerSesion()?.nutricionistaId;
  const [datos, setDatos] = useState(null);

  const recargar = useCallback(
    () => cargarFicha(pacienteId, nutricionistaId).then(setDatos),
    [pacienteId, nutricionistaId],
  );

  useEffect(() => {
    let vigente = true;
    cargarFicha(pacienteId, nutricionistaId).then((resultado) => {
      if (vigente) setDatos(resultado);
    });
    return () => {
      vigente = false;
    };
  }, [pacienteId, nutricionistaId]);

  if (datos === null) {
    return (
      <section className="container py-4">
        <p role="status">Cargando ficha...</p>
      </section>
    );
  }

  if (datos.acceso === "AJENA" || datos.acceso === "NO_EXISTE") {
    return (
      <section className="container py-4">
        <VolverAPacientes />
        <h1>Ficha del paciente</h1>
        <div className="alert alert-warning" role="alert">
          {datos.acceso === "AJENA"
            ? "Esta ficha pertenece a otro nutricionista."
            : "No encontramos a ese paciente."}
        </div>
      </section>
    );
  }

  const { paciente } = datos;
  const nombreCompleto = `${paciente.nombre} ${paciente.apellido}`;

  if (datos.acceso === "SIN_FICHA") {
    return (
      <section className="container py-4">
        <VolverAPacientes />
        <h1>{nombreCompleto}</h1>
        <DatosPaciente paciente={paciente} />
        <div className="bg-white border rounded-3 p-3 p-md-4 col-lg-8">
          <h2 className="h4">Crear ficha</h2>
          <p>Este paciente aún no tiene ficha. Al crearla quedará a tu cargo.</p>
          <FormFicha
            onCrear={async (ficha) => {
              await crearFicha({ ...ficha, id: pacienteId, nutricionistaId });
              await recargar();
            }}
          />
        </div>
      </section>
    );
  }

  const { ficha, mediciones, plan } = datos;
  const ultima = [...mediciones].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);

  return (
    <section className="container py-4">
      <VolverAPacientes />
      <h1>{nombreCompleto}</h1>
      <DatosPaciente paciente={paciente} />

      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-7">
          <div className="bg-white border rounded-3 p-3 p-md-4 mb-4">
            <h2 className="h4">Ficha</h2>
            <dl className="row mb-0">
              <dt className="col-sm-4">Objetivo</dt>
              <dd className="col-sm-8">{OBJETIVOS_FICHA[ficha.objetivo]}</dd>
              <dt className="col-sm-4">Antecedentes</dt>
              <dd className="col-sm-8">{ficha.antecedentes || "—"}</dd>
              <dt className="col-sm-4">Ficha creada</dt>
              <dd className="col-sm-8 mb-0">{formatearFecha(ficha.creadaEn)}</dd>
            </dl>
          </div>
          <section
            className="bg-white border rounded-3 p-3 p-md-4"
            aria-labelledby="titulo-historial"
          >
            <h2 id="titulo-historial" className="h4">
              Historial de mediciones
            </h2>
            <HistorialMediciones mediciones={mediciones} objetivo={ficha.objetivo} />
          </section>
        </div>
        <div className="col-12 col-lg-5">
          <section
            className="bg-white border rounded-3 p-3 p-md-4"
            aria-labelledby="titulo-medicion"
          >
            <h2 id="titulo-medicion" className="h4">
              Registrar medición
            </h2>
            <FormMedicion
              objetivo={ficha.objetivo}
              tallaSugerida={ultima?.tallaCm}
              onGuardar={async (medicion) => {
                await registrarMedicion(pacienteId, { ...medicion, nutricionistaId });
                await recargar();
              }}
            />
          </section>
        </div>
      </div>

      <section className="bg-white border rounded-3 p-3 p-md-4" aria-labelledby="titulo-plan">
        <h2 id="titulo-plan" className="h4">
          Plan alimenticio
          <span className="fs-6 fw-normal text-body-secondary">
            {plan ? ` (vigente desde el ${formatearFecha(plan.vigenteDesde)})` : " (sin plan)"}
          </span>
        </h2>
        <p className="text-body-secondary">
          Al guardar, el plan queda vigente desde hoy y el anterior se conserva en el historial.
        </p>
        <FormPlan
          plan={plan}
          onGuardar={async (nuevo) => {
            await guardarPlan(pacienteId, { ...nuevo, nutricionistaId });
            await recargar();
          }}
        />
      </section>
    </section>
  );
}
