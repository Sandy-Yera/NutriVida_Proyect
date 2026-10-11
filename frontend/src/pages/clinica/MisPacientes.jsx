import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { obtenerSesion } from "../../auth/auth.js";
import { listarCitas } from "../../services/citasService.js";
import { listarMediciones, listarPacientes } from "../../services/fichasService.js";
import { listarUsuarios } from "../../services/usuariosService.js";
import { formatearFecha } from "../../utils/formato.js";
import {
  OBJETIVOS_FICHA,
  filtrarPacientes,
  formatearMedida,
  pacientesSinFicha,
} from "../../utils/clinica.js";

async function cargarPacientes(nutricionistaId) {
  const [fichas, usuarios, citas] = await Promise.all([
    listarPacientes(nutricionistaId),
    listarUsuarios({ rol: "PACIENTE" }),
    listarCitas({ nutricionistaId }),
  ]);
  const pacientesPorId = new Map(
    usuarios
      .filter((usuario) => usuario.rol === "PACIENTE")
      .map((usuario) => [usuario.id, usuario]),
  );
  const conFicha = await Promise.all(
    fichas
      .filter((ficha) => pacientesPorId.has(ficha.id))
      .map(async (ficha) => {
        const mediciones = await listarMediciones(ficha.id);
        return { ...pacientesPorId.get(ficha.id), ficha, ultima: mediciones.at(-1) ?? null };
      }),
  );
  conFicha.sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));
  const sinFicha = pacientesSinFicha(citas, fichas, nutricionistaId)
    .filter((id) => pacientesPorId.has(id))
    .map((id) => pacientesPorId.get(id));
  return { conFicha, sinFicha };
}

function textoUltimaMedicion(ultima) {
  if (!ultima) return "Sin mediciones";
  return `${formatearFecha(ultima.fecha)} · ${formatearMedida(ultima.pesoKg, "PESO", { conUnidad: true })}`;
}

function ListaPacientes({ pacientes }) {
  return (
    <>
      <table className="table align-middle mb-0 d-none d-md-table">
        <caption className="visually-hidden">Mis pacientes con ficha</caption>
        <thead>
          <tr>
            <th scope="col">Paciente</th>
            <th scope="col">RUT</th>
            <th scope="col">Objetivo</th>
            <th scope="col">Última medición</th>
            <th scope="col">
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {pacientes.map((paciente) => (
            <tr key={paciente.id}>
              <td>
                {paciente.nombre} {paciente.apellido}
              </td>
              <td className="text-nowrap">{paciente.rut}</td>
              <td>{OBJETIVOS_FICHA[paciente.ficha.objetivo]}</td>
              <td>{textoUltimaMedicion(paciente.ultima)}</td>
              <td className="text-end">
                <Link
                  to={`/nutricionista/pacientes/${paciente.id}`}
                  className="btn btn-sm btn-outline-primary"
                  aria-label={`Abrir ficha de ${paciente.nombre} ${paciente.apellido}`}
                >
                  Abrir ficha
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="list-unstyled mb-0 d-md-none" aria-label="Mis pacientes con ficha">
        {pacientes.map((paciente) => (
          <li key={paciente.id} className="border-bottom py-2">
            <Link to={`/nutricionista/pacientes/${paciente.id}`} className="fw-semibold">
              {paciente.nombre} {paciente.apellido}
            </Link>
            <div>
              RUT {paciente.rut} · {OBJETIVOS_FICHA[paciente.ficha.objetivo]}
            </div>
            <div className="small text-body-secondary">
              Última medición: {textoUltimaMedicion(paciente.ultima)}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function MisPacientes() {
  const nutricionistaId = obtenerSesion()?.nutricionistaId;
  const [datos, setDatos] = useState(null);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    let vigente = true;
    cargarPacientes(nutricionistaId).then((resultado) => {
      if (vigente) setDatos(resultado);
    });
    return () => {
      vigente = false;
    };
  }, [nutricionistaId]);

  if (datos === null) {
    return (
      <section className="container py-4">
        <h1>Mis pacientes</h1>
        <p role="status">Cargando pacientes...</p>
      </section>
    );
  }

  const { conFicha, sinFicha } = datos;
  const visibles = filtrarPacientes(conFicha, texto);

  function contenido() {
    if (conFicha.length === 0) {
      return <p className="mb-0">Aún no tienes pacientes con ficha.</p>;
    }
    if (visibles.length === 0) {
      return (
        <div>
          <p>No hay pacientes que coincidan con ‘{texto.trim()}’. Prueba con otro nombre o RUT.</p>
          <button type="button" className="btn btn-outline-primary" onClick={() => setTexto("")}>
            Limpiar búsqueda
          </button>
        </div>
      );
    }
    return <ListaPacientes pacientes={visibles} />;
  }

  return (
    <section className="container py-4">
      <h1>Mis pacientes</h1>

      <div className="bg-white border rounded-3 p-3 p-md-4 mb-4">
        {conFicha.length > 0 && (
          <div className="mb-3 col-md-6">
            <label htmlFor="buscar-paciente" className="form-label">
              Buscar por nombre o RUT
            </label>
            <input
              id="buscar-paciente"
              type="search"
              className="form-control"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
            />
          </div>
        )}
        {contenido()}
      </div>

      {sinFicha.length > 0 && (
        <section
          className="bg-white border rounded-3 p-3 p-md-4"
          aria-labelledby="titulo-sin-ficha"
        >
          <h2 id="titulo-sin-ficha" className="h4">
            Con cita y sin ficha
          </h2>
          <p className="text-body-secondary">
            Pacientes que tienen hora contigo y aún no tienen ficha.
          </p>
          <ul className="list-unstyled mb-0">
            {sinFicha.map((paciente) => (
              <li
                key={paciente.id}
                className="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom py-2"
              >
                <span>
                  {paciente.nombre} {paciente.apellido} · RUT {paciente.rut}
                </span>
                <Link
                  to={`/nutricionista/pacientes/${paciente.id}`}
                  className="btn btn-sm btn-outline-primary"
                  aria-label={`Crear ficha de ${paciente.nombre} ${paciente.apellido}`}
                >
                  Crear ficha
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
