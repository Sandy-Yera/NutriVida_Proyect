import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ChipEstado from "../../components/citas/ChipEstado.jsx";
import DialogoConfirmacion from "../../components/comunes/DialogoConfirmacion.jsx";
import { obtenerSesion } from "../../auth/auth.js";
import { cambiarEstado, listarCitas } from "../../services/citasService.js";
import { listarServicios } from "../../services/serviciosService.js";
import { listarUsuarios } from "../../services/usuariosService.js";
import { accionesNutricionista, diasDeLaSemana, sumarDias } from "../../utils/citas.js";
import { aFechaIso, formatearFecha, formatearFechaLarga } from "../../utils/formato.js";

const MENSAJE_HECHO = {
  ATENDIDA: "Cita marcada como atendida.",
  INASISTENCIA: "Inasistencia registrada.",
};

// Una cita en la agenda del nutricionista. Solo muestra y avisa: la página decide.
function CitaDelNutricionista({ cita, paciente, servicio, procesando, onMarcar }) {
  const acciones = accionesNutricionista(cita.estado);
  return (
    <article
      className="bg-white border rounded-3 p-3 h-100"
      aria-label={`Cita de ${paciente}, ${cita.hora}`}
    >
      <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
        <h3 className="h6 mb-0">
          {cita.hora} · {paciente}
        </h3>
        <ChipEstado estado={cita.estado} />
      </div>
      <p className="small text-body-secondary mb-1">{servicio?.nombre ?? cita.servicioCodigo}</p>
      {cita.motivo && <p className="small mb-2 text-break">Motivo: {cita.motivo}</p>}

      <div className="d-flex flex-wrap gap-2 align-items-center">
        {acciones.includes("ATENDIDA") && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={procesando}
            onClick={() => onMarcar(cita, "ATENDIDA")}
          >
            Marcar atendida
          </button>
        )}
        {acciones.includes("INASISTENCIA") && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={procesando}
            onClick={() => onMarcar(cita, "INASISTENCIA")}
          >
            Marcar inasistencia
          </button>
        )}
        {cita.estado === "PENDIENTE" && (
          <span className="small text-body-secondary">
            Pendiente de confirmación de la secretaría.
          </span>
        )}
        {/* Contrato con el módulo clínico: la ficha del paciente (id del usuario paciente). */}
        <Link className="btn btn-sm btn-link" to={`/nutricionista/pacientes/${cita.pacienteId}`}>
          Abrir ficha
        </Link>
      </div>
    </article>
  );
}

// S-07 (RN-02, RN-26): las citas del nutricionista en sesión, del día o de la semana.
// Marca las citas confirmadas como atendidas o inasistencia y abre la ficha del paciente.
export default function AgendaNutricionista() {
  const [sesion] = useState(() => obtenerSesion());
  const [ahora] = useState(() => new Date());
  const [vista, setVista] = useState("dia");
  const [fecha, setFecha] = useState(() => aFechaIso(ahora));
  const [base, setBase] = useState(null);
  const [cargadas, setCargadas] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [porConfirmar, setPorConfirmar] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const nutricionistaId = sesion?.nutricionistaId;
  const dias = diasDeLaSemana(fecha);
  const desde = vista === "dia" ? fecha : dias[0];
  const hasta = vista === "dia" ? fecha : dias.at(-1);
  const clave = `${desde}|${hasta}`;

  useEffect(() => {
    let vigente = true;
    Promise.all([
      listarUsuarios({ rol: "PACIENTE" }),
      listarServicios({ soloActivos: false }),
    ]).then(([pacientes, servicios]) => {
      if (!vigente) return;
      const nombres = Object.fromEntries(
        pacientes.map((p) => [p.id, `${p.nombre} ${p.apellido}`.trim()]),
      );
      setBase({ nombres, servicios });
    });
    return () => {
      vigente = false;
    };
  }, []);

  // RN-26: solo las citas del nutricionista de la sesión, en el rango que se está mirando.
  useEffect(() => {
    if (!nutricionistaId) return undefined;
    let vigente = true;
    listarCitas({ nutricionistaId, desde, hasta }).then((citas) => {
      if (vigente) setCargadas({ clave: `${desde}|${hasta}`, citas });
    });
    return () => {
      vigente = false;
    };
  }, [nutricionistaId, desde, hasta]);

  if (!nutricionistaId) {
    return (
      <section className="container py-4">
        <h1>Mi agenda</h1>
        <p role="alert" className="alert alert-warning">
          Tu usuario no está vinculado a un nutricionista. Pide al administrador que lo vincule.
        </p>
      </section>
    );
  }

  const citas = cargadas?.clave === clave ? cargadas.citas : null;

  // Solo la primera carga reemplaza la página. Al cambiar de día o de vista, la barra de
  // herramientas se mantiene y solo la lista muestra "Cargando" (no se pierde el foco).
  if (!base) {
    return (
      <section className="container py-4">
        <h1>Mi agenda</h1>
        <p role="status">Cargando tus citas...</p>
      </section>
    );
  }

  const paciente = (id) => base.nombres[id] ?? id;
  const servicioDe = (cita) => base.servicios.find((s) => s.codigo === cita.servicioCodigo);

  async function recargar() {
    const nuevas = await listarCitas({ nutricionistaId, desde, hasta });
    setCargadas({ clave, citas: nuevas });
  }

  // RN-02 y RN-04: el service valida la transición y agrega la entrada al historial.
  async function aplicar(cita, nuevoEstado) {
    setProcesando(true);
    setAviso(null);
    try {
      await cambiarEstado(cita.id, nuevoEstado, sesion.id);
      await recargar();
      setAviso({ tipo: "exito", texto: MENSAJE_HECHO[nuevoEstado] });
    } catch (error) {
      setAviso({ tipo: "error", texto: error.message });
    } finally {
      setProcesando(false);
      setPorConfirmar(null);
    }
  }

  // Marcar atendida es lo habitual al terminar la consulta: se aplica directo.
  // La inasistencia no se puede deshacer y pide confirmación.
  function marcar(cita, nuevoEstado) {
    if (nuevoEstado === "INASISTENCIA") setPorConfirmar(cita);
    else aplicar(cita, nuevoEstado);
  }

  function mover(pasos) {
    setAviso(null);
    setFecha((actual) => sumarDias(actual, vista === "dia" ? pasos : pasos * 7));
  }

  function lista(delDia) {
    return (
      <div className="row g-3">
        {delDia.map((cita) => (
          <div key={cita.id} className="col-12 col-md-6">
            <CitaDelNutricionista
              cita={cita}
              paciente={paciente(cita.pacienteId)}
              servicio={servicioDe(cita)}
              procesando={procesando}
              onMarcar={marcar}
            />
          </div>
        ))}
      </div>
    );
  }

  const titulo =
    vista === "dia"
      ? formatearFechaLarga(fecha)
      : `Semana del ${formatearFecha(dias[0])} al ${formatearFecha(dias.at(-1))}`;

  return (
    <section className="container py-4">
      <h1>Mi agenda</h1>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <div className="btn-group" role="group" aria-label="Vista">
          <button
            type="button"
            className={`btn btn-outline-primary${vista === "dia" ? " active" : ""}`}
            aria-pressed={vista === "dia"}
            onClick={() => setVista("dia")}
          >
            Día
          </button>
          <button
            type="button"
            className={`btn btn-outline-primary${vista === "semana" ? " active" : ""}`}
            aria-pressed={vista === "semana"}
            onClick={() => setVista("semana")}
          >
            Semana
          </button>
        </div>
        <div className="btn-group" role="group" aria-label="Cambiar de fecha">
          <button
            type="button"
            className="btn btn-outline-secondary"
            aria-label={vista === "dia" ? "Día anterior" : "Semana anterior"}
            onClick={() => mover(-1)}
          >
            ◀
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setFecha(aFechaIso(new Date()))}
          >
            Hoy
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            aria-label={vista === "dia" ? "Día siguiente" : "Semana siguiente"}
            onClick={() => mover(1)}
          >
            ▶
          </button>
        </div>
      </div>

      <h2 className="h5">{titulo}</h2>

      {aviso && (
        <p
          role={aviso.tipo === "exito" ? "status" : "alert"}
          className={`alert ${aviso.tipo === "exito" ? "alert-success" : "alert-danger"}`}
        >
          {aviso.texto}
        </p>
      )}

      {!citas && <p role="status">Cargando tus citas...</p>}

      {citas &&
        vista === "dia" &&
        (citas.length === 0 ? <p>No tienes citas este día.</p> : lista(citas))}

      {citas &&
        vista === "semana" &&
        (citas.length === 0 ? (
          <p>No tienes citas esta semana.</p>
        ) : (
          dias
            .filter((dia) => citas.some((c) => c.fecha === dia))
            .map((dia) => (
              <section key={dia} className="mb-4" aria-labelledby={`dia-${dia}`}>
                <h3 id={`dia-${dia}`} className="h6 text-capitalize">
                  {formatearFecha(dia)}
                </h3>
                {lista(citas.filter((c) => c.fecha === dia))}
              </section>
            ))
        ))}

      {porConfirmar && (
        <DialogoConfirmacion
          titulo="Marcar inasistencia"
          mensaje={`¿Marcar como inasistencia la cita de ${paciente(porConfirmar.pacienteId)} del ${formatearFechaLarga(porConfirmar.fecha)} a las ${porConfirmar.hora}? No se puede deshacer.`}
          textoConfirmar="Sí, marcar inasistencia"
          procesando={procesando}
          onConfirmar={() => aplicar(porConfirmar, "INASISTENCIA")}
          onCancelar={() => setPorConfirmar(null)}
        />
      )}
    </section>
  );
}
