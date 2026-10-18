import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ChipEstado from "../../components/citas/ChipEstado.jsx";
import PasosWizard from "../../components/citas/PasosWizard.jsx";
import ResumenCita from "../../components/citas/ResumenCita.jsx";
import SelectorHorario from "../../components/citas/SelectorHorario.jsx";
import { obtenerSesion } from "../../auth/auth.js";
// nv_reserva es estado de la interfaz (vive en el navegador), no un dato del negocio:
// en EP3 los services pasan a la API, pero la reserva en curso sigue en la pestaña.
import { guardarReserva, leerReserva } from "../../data/reservaData.js";
import { horariosDisponibles, puedeAgendarTeleconsulta } from "../../services/citasService.js";
import { listarNutricionistas, listarServicios } from "../../services/serviciosService.js";
import {
  MOTIVO_MAX,
  generarBloques,
  horasNoElegibles,
  primerPasoIncompleto,
  rangoFechasCita,
  validarFechaCita,
  validarMotivo,
} from "../../utils/citas.js";
import { TIPOS_AGENDABLES, describirDias } from "../../utils/clinica.js";
import { formatearPrecio } from "../../utils/formato.js";

const PASOS = ["Servicio", "Nutricionista", "Fecha y hora", "Motivo y resumen"];
const GRUPOS = [
  { tipo: "CONSULTA", titulo: "Consultas" },
  { tipo: "EVALUACION", titulo: "Evaluaciones" },
  { tipo: "PLAN", titulo: "Planes" },
];

const esPresencial = (servicio) => servicio.modalidad.startsWith("Presencial");

// RN-17: une la reserva guardada en la pestaña con lo que llega por la URL.
// Si la URL cambia el servicio o el nutricionista, se borra lo que dependía de él.
function reservaInicial(guardada, parametros) {
  let reserva = { ...(guardada ?? {}) };
  const servicio = parametros.get("servicio");
  const nutricionista = parametros.get("nutricionista");
  if (servicio && servicio !== reserva.servicioCodigo) {
    reserva = { ...reserva, servicioCodigo: servicio, hora: undefined };
  }
  if (nutricionista && nutricionista !== reserva.nutricionistaId) {
    reserva = { ...reserva, nutricionistaId: nutricionista, fecha: undefined, hora: undefined };
  }
  if (servicio || nutricionista) reserva.paso = undefined;
  return reserva;
}

// Con el catálogo ya cargado, quita lo que no se puede agendar y elige el paso donde partir.
// RN-15: solo servicios agendables y activos. RN-16: teleconsulta solo con atención previa.
function sanearReserva(reserva, { servicios, nutricionistas, puedeTeleconsulta }) {
  const limpia = { ...reserva };
  const avisos = [];
  if (limpia.servicioCodigo) {
    const servicio = servicios.find((s) => s.codigo === limpia.servicioCodigo);
    if (!servicio) {
      avisos.push("El servicio indicado no se agenda aquí. Elige uno de la lista.");
    } else if (!esPresencial(servicio) && !puedeTeleconsulta) {
      avisos.push("La teleconsulta requiere haber tenido antes una consulta presencial.");
    }
    if (!servicio || (!esPresencial(servicio) && !puedeTeleconsulta)) {
      limpia.servicioCodigo = undefined;
      limpia.hora = undefined;
    }
  }
  if (limpia.nutricionistaId && !nutricionistas.some((n) => n.id === limpia.nutricionistaId)) {
    avisos.push("El nutricionista indicado no existe. Elige uno de la lista.");
    limpia.nutricionistaId = undefined;
    limpia.fecha = undefined;
    limpia.hora = undefined;
  }
  limpia.paso = Math.min(limpia.paso ?? 4, primerPasoIncompleto(limpia));
  return { reserva: limpia, aviso: avisos.join(" ") };
}

export default function SolicitarCita() {
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const [sesion] = useState(() => obtenerSesion());
  const [ahora] = useState(() => new Date());
  const [inicial] = useState(() => reservaInicial(leerReserva(sesion?.id), parametros));
  const [catalogo, setCatalogo] = useState(null);
  const [reserva, setReserva] = useState(null);
  const [aviso, setAviso] = useState("");
  const [horas, setHoras] = useState(null);
  const tituloPaso = useRef(null);

  // Los parámetros ya se leyeron en `inicial`: se quitan de la URL para que un F5 no vuelva
  // a imponer el servicio de la URL si el paciente lo cambió en el paso 1.
  useEffect(() => {
    if (parametros.has("servicio") || parametros.has("nutricionista")) {
      setParametros({}, { replace: true });
    }
  }, [parametros, setParametros]);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      listarServicios(),
      listarNutricionistas(),
      puedeAgendarTeleconsulta(sesion?.id),
    ]).then(([servicios, nutricionistas, puedeTeleconsulta]) => {
      if (!vigente) return;
      const cargado = {
        servicios: servicios.filter((s) => TIPOS_AGENDABLES.includes(s.tipo)),
        nutricionistas,
        puedeTeleconsulta,
      };
      const resultado = sanearReserva(inicial, cargado);
      setCatalogo(cargado);
      setReserva(resultado.reserva);
      setAviso(resultado.aviso);
    });
    return () => {
      vigente = false;
    };
  }, [inicial, sesion?.id]);

  // RN-17: la selección se guarda en sessionStorage para no perderla con F5 ni al ir al pago.
  useEffect(() => {
    if (reserva) guardarReserva(sesion?.id, reserva);
  }, [reserva, sesion?.id]);

  const paso = reserva?.paso ?? 1;
  const servicio = catalogo?.servicios.find((s) => s.codigo === reserva?.servicioCodigo);
  const nutricionista = catalogo?.nutricionistas.find((n) => n.id === reserva?.nutricionistaId);
  const fecha = reserva?.fecha;
  const errorFecha = fecha ? validarFechaCita(fecha, ahora) : "";

  // RN-10 a RN-12: las horas libres se piden al service en los pasos 3 y 4.
  // En el paso 4 sirven para confirmar que la hora guardada sigue libre (por ejemplo tras F5).
  const pedirHoras = paso >= 3 && Boolean(servicio && nutricionista && fecha) && !errorFecha;
  const nutricionistaId = nutricionista?.id;
  const duracion = servicio?.duracionMin ?? null;
  const claveHoras = `${nutricionistaId}|${fecha}|${duracion}`;

  useEffect(() => {
    if (!pedirHoras) return undefined;
    let vigente = true;
    horariosDisponibles(nutricionistaId, fecha, duracion).then((disponibles) => {
      if (vigente) setHoras({ clave: `${nutricionistaId}|${fecha}|${duracion}`, disponibles });
    });
    return () => {
      vigente = false;
    };
  }, [pedirHoras, nutricionistaId, fecha, duracion]);

  // Al cambiar de paso, el foco va al título del paso (lectores de pantalla y teclado).
  const listo = reserva !== null;
  useEffect(() => {
    if (listo) tituloPaso.current?.focus();
  }, [paso, listo]);

  if (!catalogo || !reserva) {
    return (
      <section className="container py-4">
        <h1>Solicitar cita</h1>
        <p role="status">Cargando servicios y nutricionistas...</p>
      </section>
    );
  }

  if (catalogo.servicios.length === 0) {
    return (
      <section className="container py-4">
        <h1>Solicitar cita</h1>
        <p>
          No hay servicios disponibles para agendar en este momento.{" "}
          <Link to="/contacto">Escríbenos</Link> y te ayudamos.
        </p>
      </section>
    );
  }

  const horasListas = pedirHoras && horas?.clave === claveHoras;
  const disponibles = horasListas ? horas.disponibles : [];
  const horaVigente = Boolean(reserva.hora) && disponibles.includes(reserva.hora);
  const horaPerdida = horasListas && Boolean(reserva.hora) && !horaVigente;

  // RN-17: qué falta para avanzar. Vacío = el paso está completo.
  function faltaEnPaso(numero) {
    if (numero === 1) return servicio ? "" : "Elige un servicio para continuar.";
    if (numero === 2) return nutricionista ? "" : "Elige un nutricionista para continuar.";
    if (numero === 3) {
      if (!fecha) return "Elige una fecha para continuar.";
      if (errorFecha) return errorFecha;
      if (!horasListas) return "Buscando horas disponibles...";
      return horaVigente ? "" : "Elige una hora disponible para continuar.";
    }
    if (!horaVigente) return "La hora elegida ya no está disponible. Vuelve al paso 3.";
    return validarMotivo(reserva.motivo);
  }

  const falta = faltaEnPaso(paso);

  function actualizar(cambios) {
    setReserva((actual) => ({ ...actual, ...cambios }));
  }

  // Cambiar un paso limpia los que dependen de él (en el manejador, no en un efecto).
  function elegirServicio(codigo) {
    if (codigo !== reserva.servicioCodigo) actualizar({ servicioCodigo: codigo, hora: undefined });
  }

  function elegirNutricionista(id) {
    if (id !== reserva.nutricionistaId) {
      actualizar({ nutricionistaId: id, fecha: undefined, hora: undefined });
    }
  }

  function cambiarFecha(evento) {
    actualizar({ fecha: evento.target.value || undefined, hora: undefined });
  }

  function volver() {
    actualizar({ paso: Math.max(1, paso - 1) });
  }

  function continuar(evento) {
    evento.preventDefault();
    if (falta) return;
    if (paso === 4) {
      navigate("/citas/pago");
      return;
    }
    setAviso("");
    actualizar({ paso: Math.min(4, Math.max(paso + 1, primerPasoIncompleto(reserva))) });
  }

  return (
    <section className="container py-4">
      <h1>Solicitar cita</h1>
      <PasosWizard pasos={PASOS} pasoActual={paso} />

      {aviso && (
        <p role="status" className="alert alert-warning mt-3 mb-0">
          {aviso}
        </p>
      )}

      <form noValidate onSubmit={continuar} className="bg-white border rounded-3 p-3 mt-3">
        <h2 ref={tituloPaso} tabIndex={-1} className="h4">
          Paso {paso}: {PASOS[paso - 1]}
        </h2>

        {paso === 1 && (
          <PasoServicio
            servicios={catalogo.servicios}
            seleccionado={reserva.servicioCodigo}
            puedeTeleconsulta={catalogo.puedeTeleconsulta}
            onSeleccionar={elegirServicio}
          />
        )}

        {paso === 2 && (
          <PasoNutricionista
            nutricionistas={catalogo.nutricionistas}
            seleccionado={reserva.nutricionistaId}
            onSeleccionar={elegirNutricionista}
          />
        )}

        {paso === 3 && (
          <div>
            <label htmlFor="fecha-cita" className="form-label fw-semibold">
              Fecha
            </label>
            <input
              id="fecha-cita"
              type="date"
              className="form-control mb-1"
              style={{ maxWidth: "16rem" }}
              min={rangoFechasCita(ahora).desde}
              max={rangoFechasCita(ahora).hasta}
              value={fecha ?? ""}
              onChange={cambiarFecha}
              aria-invalid={Boolean(errorFecha)}
            />
            <p className="small text-body-secondary">
              {nutricionista.nombre} atiende {describirDias(nutricionista.dias).toLowerCase()}, de{" "}
              {nutricionista.horaInicio} a {nutricionista.horaFin}. Puedes agendar hasta 60 días
              adelante.
            </p>

            {errorFecha && (
              <p role="alert" className="text-danger">
                {errorFecha}
              </p>
            )}
            {pedirHoras && !horasListas && <p role="status">Buscando horas disponibles...</p>}
            {horasListas && (
              <PasoHora
                nutricionista={nutricionista}
                fecha={fecha}
                disponibles={disponibles}
                seleccionado={reserva.hora}
                horaPerdida={horaPerdida}
                onSeleccionar={(hora) => actualizar({ hora })}
              />
            )}
          </div>
        )}

        {paso === 4 && (
          <PasoMotivo
            reserva={reserva}
            servicio={servicio}
            nutricionista={nutricionista}
            onCambiarMotivo={(motivo) => actualizar({ motivo })}
          />
        )}

        <div className="d-flex justify-content-between align-items-center gap-2 mt-4">
          {paso > 1 ? (
            <button type="button" className="btn btn-outline-secondary" onClick={volver}>
              Volver
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={Boolean(falta)}
            aria-describedby={falta ? "falta-paso" : undefined}
          >
            {paso === 4 ? "Ir al pago" : "Continuar"}
          </button>
        </div>
        {falta && (
          <p id="falta-paso" className="small text-body-secondary text-end mt-2 mb-0">
            {falta}
          </p>
        )}
      </form>
    </section>
  );
}

// Paso 1 (RN-15, RN-16): servicios agrupados. La teleconsulta se muestra deshabilitada con la
// explicación cuando el paciente no tiene una atención presencial previa.
function PasoServicio({ servicios, seleccionado, puedeTeleconsulta, onSeleccionar }) {
  return GRUPOS.map(({ tipo, titulo }) => {
    const delGrupo = servicios.filter((s) => s.tipo === tipo);
    if (delGrupo.length === 0) return null;
    return (
      <fieldset key={tipo} className="mb-3">
        <legend className="h6 fw-semibold">{titulo}</legend>
        <div className="row g-2">
          {delGrupo.map((servicio) => {
            const bloqueado = !esPresencial(servicio) && !puedeTeleconsulta;
            const id = `servicio-${servicio.codigo}`;
            return (
              <div key={servicio.codigo} className="col-12 col-md-6">
                <div className="form-check border rounded-2 p-2 ps-5 h-100">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="servicio"
                    id={id}
                    checked={seleccionado === servicio.codigo}
                    disabled={bloqueado}
                    aria-describedby={bloqueado ? `${id}-motivo` : undefined}
                    onChange={() => onSeleccionar(servicio.codigo)}
                  />
                  <label className="form-check-label d-block" htmlFor={id}>
                    {servicio.nombre}
                  </label>
                  <span className="small text-body-secondary">
                    {servicio.duracionMin ? `${servicio.duracionMin} min · ` : ""}
                    {servicio.modalidad} · {formatearPrecio(servicio.precio)}
                  </span>
                  {bloqueado && (
                    <p id={`${id}-motivo`} className="small text-body-secondary mb-0">
                      Disponible después de tu primera atención presencial.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>
    );
  });
}

// Paso 2: nutricionista con especialidad, días y horario de atención.
function PasoNutricionista({ nutricionistas, seleccionado, onSeleccionar }) {
  return (
    <fieldset>
      <legend className="visually-hidden">Nutricionista</legend>
      <div className="row g-2">
        {nutricionistas.map((nutricionista) => {
          const id = `nutricionista-${nutricionista.id}`;
          return (
            <div key={nutricionista.id} className="col-12 col-md-6">
              <div className="form-check border rounded-2 p-2 ps-5 h-100">
                <input
                  className="form-check-input"
                  type="radio"
                  name="nutricionista"
                  id={id}
                  checked={seleccionado === nutricionista.id}
                  onChange={() => onSeleccionar(nutricionista.id)}
                />
                <label className="form-check-label d-block fw-semibold" htmlFor={id}>
                  {nutricionista.nombre}
                </label>
                <span className="small d-block">{nutricionista.especialidad}</span>
                <span className="small text-body-secondary">
                  {describirDias(nutricionista.dias)}, {nutricionista.horaInicio} a{" "}
                  {nutricionista.horaFin}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

// Paso 3, horas (RN-09 a RN-12): todos los bloques de la jornada; los no elegibles, deshabilitados.
function PasoHora({ nutricionista, fecha, disponibles, seleccionado, horaPerdida, onSeleccionar }) {
  const horarios = generarBloques(nutricionista, fecha);
  return (
    <>
      <p className="fw-semibold mb-2">Hora</p>
      {horaPerdida && (
        <p role="alert" className="text-danger">
          La hora {seleccionado} ya no está disponible. Elige otra.
        </p>
      )}
      {horarios.length > 0 && disponibles.length === 0 ? (
        <p>No quedan horas libres ese día. Prueba con otra fecha.</p>
      ) : (
        <SelectorHorario
          horarios={horarios}
          ocupados={horasNoElegibles(horarios, disponibles)}
          seleccionado={seleccionado}
          onSeleccionar={onSeleccionar}
        />
      )}
    </>
  );
}

// Paso 4 (RN-14, RN-03): motivo de 10 a 300 caracteres y resumen con el precio.
function PasoMotivo({ reserva, servicio, nutricionista, onCambiarMotivo }) {
  const motivo = reserva.motivo ?? "";
  const error = validarMotivo(motivo);
  const escrito = motivo.trim().length > 0;
  return (
    <>
      <label htmlFor="motivo-cita" className="form-label fw-semibold">
        Motivo de la consulta
      </label>
      <textarea
        id="motivo-cita"
        className="form-control"
        rows={3}
        maxLength={MOTIVO_MAX}
        value={motivo}
        onChange={(evento) => onCambiarMotivo(evento.target.value)}
        aria-invalid={escrito && Boolean(error)}
        aria-describedby="motivo-ayuda"
      />
      <p id="motivo-ayuda" className="small text-body-secondary">
        Entre 10 y {MOTIVO_MAX} caracteres. Llevas {motivo.trim().length}.
      </p>
      {escrito && error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}

      <h3 className="h5 mt-3">Resumen</h3>
      <ResumenCita
        servicio={servicio}
        nutricionista={nutricionista}
        fecha={reserva.fecha}
        hora={reserva.hora}
      />
      <p className="mt-3 mb-0">
        Tu solicitud quedará <ChipEstado estado="PENDIENTE" /> hasta que la clínica la confirme.
      </p>
    </>
  );
}
