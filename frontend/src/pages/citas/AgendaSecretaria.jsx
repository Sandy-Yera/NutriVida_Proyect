import { useEffect, useState } from "react";
import ChipEstado from "../../components/citas/ChipEstado.jsx";
import GrillaAgenda from "../../components/citas/GrillaAgenda.jsx";
import HistorialCita from "../../components/citas/HistorialCita.jsx";
import PanelReprogramar from "../../components/citas/PanelReprogramar.jsx";
import DialogoConfirmacion from "../../components/comunes/DialogoConfirmacion.jsx";
import { obtenerSesion } from "../../auth/auth.js";
import { cambiarEstado, listarCitas, reprogramarCita } from "../../services/citasService.js";
import { listarNutricionistas, listarServicios } from "../../services/serviciosService.js";
import { listarUsuarios } from "../../services/usuariosService.js";
import {
  ESTADOS_QUE_OCUPAN,
  ETIQUETAS_ESTADO,
  TRANSICIONES,
  accionesSecretaria,
  armarAgenda,
  rangoFechasCita,
  sumarDias,
} from "../../utils/citas.js";
import { aFechaIso, formatearFechaLarga } from "../../utils/formato.js";
import { useHorasLibres } from "./useHorasLibres.js";

// Texto de cada acción (RN-25). Las finales piden confirmación en un diálogo.
const ACCIONES = {
  CONFIRMADA: { texto: "Confirmar", variante: "btn-primary", confirmar: false },
  INASISTENCIA: {
    texto: "Marcar inasistencia",
    variante: "btn-outline-secondary",
    confirmar: true,
  },
  CANCELADA: { texto: "Cancelar cita", variante: "btn-outline-danger", confirmar: true },
};

const MENSAJE_HECHO = {
  CONFIRMADA: "Cita confirmada.",
  INASISTENCIA: "Inasistencia registrada.",
  CANCELADA: "Cita cancelada. El pago quedó reembolsado.",
};

// S-06 (RN-02, RN-04, RN-05, RN-25, RN-33): agenda de los 4 nutricionistas por día.
// La secretaria confirma, reprograma, cancela y marca inasistencias. No ve fichas ni mediciones.
// La regla de 24 h es solo del paciente: la secretaria gestiona las ausencias del nutricionista.
export default function AgendaSecretaria() {
  const [sesion] = useState(() => obtenerSesion());
  const [ahora] = useState(() => new Date());
  const [fecha, setFecha] = useState(() => aFechaIso(ahora));
  const [filtro, setFiltro] = useState("");
  const [base, setBase] = useState(null);
  const [delDia, setDelDia] = useState(null);
  const [seleccionadaId, setSeleccionadaId] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [porConfirmar, setPorConfirmar] = useState(null);
  const [reprogramando, setReprogramando] = useState(null);
  const [procesando, setProcesando] = useState(false);

  // Catálogo, equipo y nombres de usuarios: se cargan una vez.
  useEffect(() => {
    let vigente = true;
    Promise.all([
      listarNutricionistas(),
      listarServicios({ soloActivos: false }),
      listarUsuarios(),
    ]).then(([nutricionistas, servicios, usuarios]) => {
      if (!vigente) return;
      const nombres = Object.fromEntries(
        usuarios.map((u) => [u.id, `${u.nombre} ${u.apellido}`.trim()]),
      );
      setBase({ nutricionistas, servicios, nombres });
    });
    return () => {
      vigente = false;
    };
  }, []);

  // Citas del día elegido (todas, de los 4 nutricionistas).
  useEffect(() => {
    let vigente = true;
    listarCitas({ desde: fecha, hasta: fecha }).then((citas) => {
      if (vigente) setDelDia({ fecha, citas });
    });
    return () => {
      vigente = false;
    };
  }, [fecha]);

  const citas = delDia?.fecha === fecha ? delDia.citas : null;
  const seleccionada = citas?.find((c) => c.id === seleccionadaId) ?? null;
  const citaReprogramada = reprogramando?.cita;
  const { errorFecha, horarios, horas } = useHorasLibres({
    cita: citaReprogramada,
    nutricionista: base?.nutricionistas.find((n) => n.id === citaReprogramada?.nutricionistaId),
    fecha: reprogramando?.fecha,
    ahora,
  });

  // Solo la primera carga reemplaza la página. Al cambiar de día, la barra de herramientas se
  // mantiene y solo la grilla muestra "Cargando" (no se pierde el foco del botón).
  if (!base) {
    return (
      <section className="container py-4">
        <h1>Agenda de la clínica</h1>
        <p role="status">Cargando la agenda...</p>
      </section>
    );
  }

  const nombre = (id) => base.nombres[id] ?? id;
  const servicioDe = (cita) => base.servicios.find((s) => s.codigo === cita.servicioCodigo);
  const nutricionistaDe = (cita) => base.nutricionistas.find((n) => n.id === cita.nutricionistaId);
  const cargando = !citas;
  const delDiaActual = citas ?? [];
  const visibles = filtro ? delDiaActual.filter((c) => c.estado === filtro) : delDiaActual;
  const filas = armarAgenda(base.nutricionistas, fecha, visibles);
  const pendientes = delDiaActual.filter((c) => c.estado === "PENDIENTE").length;

  function irA(nuevaFecha) {
    if (!nuevaFecha) return;
    setFecha(nuevaFecha);
    setSeleccionadaId(null);
    setReprogramando(null);
    setAviso(null);
  }

  async function recargar() {
    const nuevas = await listarCitas({ desde: fecha, hasta: fecha });
    setDelDia({ fecha, citas: nuevas });
  }

  // RN-02 y RN-04: solo transiciones permitidas; el service agrega la entrada al historial.
  // Al cancelar, el service deja el pago REEMBOLSADO (RN-08).
  async function aplicar(cita, nuevoEstado) {
    setProcesando(true);
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

  function elegirAccion(nuevoEstado) {
    setAviso(null);
    if (ACCIONES[nuevoEstado].confirmar) setPorConfirmar(nuevoEstado);
    else aplicar(seleccionada, nuevoEstado);
  }

  // RN-05: la cita queda PENDIENTE con la nueva fecha y hora.
  async function confirmarReprogramacion() {
    const { cita, fecha: fechaNueva, hora } = reprogramando;
    setProcesando(true);
    try {
      await reprogramarCita(cita.id, fechaNueva, hora, sesion.id);
      await recargar();
      setReprogramando(null);
      if (fechaNueva !== fecha) setSeleccionadaId(null);
      setAviso({
        tipo: "exito",
        texto: `Cita reprogramada para el ${formatearFechaLarga(fechaNueva)} a las ${hora}. Queda pendiente.`,
      });
    } catch (error) {
      setAviso({ tipo: "error", texto: error.message });
    } finally {
      setProcesando(false);
    }
  }

  const acciones = seleccionada ? accionesSecretaria(seleccionada.estado) : [];
  const esFinal = seleccionada && TRANSICIONES[seleccionada.estado].length === 0;

  return (
    <section className="container-fluid container-lg py-4">
      <h1>Agenda de la clínica</h1>

      {/* Navegación por día, filtro por estado y contador de pendientes. */}
      <div className="d-flex flex-wrap align-items-end gap-2 mb-3">
        <div className="btn-group" role="group" aria-label="Cambiar de día">
          <button
            type="button"
            className="btn btn-outline-secondary"
            aria-label="Día anterior"
            onClick={() => irA(sumarDias(fecha, -1))}
          >
            ◀
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => irA(aFechaIso(new Date()))}
          >
            Hoy
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            aria-label="Día siguiente"
            onClick={() => irA(sumarDias(fecha, 1))}
          >
            ▶
          </button>
        </div>
        <div>
          <label htmlFor="agenda-fecha" className="form-label small mb-1">
            Fecha
          </label>
          <input
            id="agenda-fecha"
            type="date"
            className="form-control"
            value={fecha}
            onChange={(evento) => irA(evento.target.value)}
          />
        </div>
        <div>
          <label htmlFor="agenda-filtro" className="form-label small mb-1">
            Estado
          </label>
          <select
            id="agenda-filtro"
            className="form-select"
            value={filtro}
            onChange={(evento) => setFiltro(evento.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(ETIQUETAS_ESTADO).map(([estado, etiqueta]) => (
              <option key={estado} value={estado}>
                {etiqueta}
              </option>
            ))}
          </select>
        </div>
        <p className="mb-0 ms-md-auto" aria-live="polite">
          Pendientes del día: <strong>{cargando ? "…" : pendientes}</strong>
        </p>
      </div>

      <h2 className="h5">{formatearFechaLarga(fecha)}</h2>

      {aviso && (
        <p
          role={aviso.tipo === "exito" ? "status" : "alert"}
          className={`alert ${aviso.tipo === "exito" ? "alert-success" : "alert-danger"}`}
        >
          {aviso.texto}
        </p>
      )}

      <div className="row g-3">
        <div className="col-12 col-lg-8">
          {cargando && <p role="status">Cargando la agenda...</p>}
          {!cargando && (
            <>
              {visibles.length === 0 && (
                <p className="text-body-secondary">
                  {filtro
                    ? `No hay citas en estado ${ETIQUETAS_ESTADO[filtro].toLowerCase()} este día.`
                    : "No hay citas este día."}
                </p>
              )}
              <GrillaAgenda
                filas={filas}
                nutricionistas={base.nutricionistas}
                pacientes={base.nombres}
                seleccionadaId={seleccionadaId}
                onSeleccionar={(id) => {
                  setSeleccionadaId(id);
                  setReprogramando(null);
                  setAviso(null);
                }}
              />
            </>
          )}
        </div>

        <div className="col-12 col-lg-4">
          {!seleccionada && (
            <p className="text-body-secondary">Toca una cita para ver su detalle y sus acciones.</p>
          )}

          {seleccionada && (
            <article className="bg-white border rounded-3 p-3" aria-labelledby="detalle-cita">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <h2 id="detalle-cita" className="h5 mb-1">
                  {nombre(seleccionada.pacienteId)}
                </h2>
                <ChipEstado estado={seleccionada.estado} />
              </div>
              <dl className="small mb-3">
                <dt>Servicio</dt>
                <dd>{servicioDe(seleccionada)?.nombre ?? seleccionada.servicioCodigo}</dd>
                <dt>Nutricionista</dt>
                <dd>{nutricionistaDe(seleccionada)?.nombre}</dd>
                <dt>Fecha y hora</dt>
                <dd>
                  {formatearFechaLarga(seleccionada.fecha)}, {seleccionada.hora}
                </dd>
                <dt>Motivo</dt>
                <dd className="text-break">{seleccionada.motivo || "—"}</dd>
              </dl>

              <h3 className="h6">Historial</h3>
              <HistorialCita cita={seleccionada} nombre={nombre} />

              {esFinal ? (
                <p className="small text-body-secondary mb-0">
                  Estado final: esta cita ya no cambia.
                </p>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {acciones.map((estado) => (
                    <button
                      key={estado}
                      type="button"
                      className={`btn btn-sm ${ACCIONES[estado].variante}`}
                      disabled={procesando}
                      onClick={() => elegirAccion(estado)}
                    >
                      {ACCIONES[estado].texto}
                    </button>
                  ))}
                  {ESTADOS_QUE_OCUPAN.includes(seleccionada.estado) && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      disabled={procesando}
                      onClick={() => {
                        setAviso(null);
                        setReprogramando({ cita: seleccionada });
                      }}
                    >
                      Reprogramar
                    </button>
                  )}
                </div>
              )}
            </article>
          )}

          {reprogramando && (
            <div className="mt-3">
              <PanelReprogramar
                titulo={`Reprogramar la cita de ${nombre(citaReprogramada.pacienteId)}`}
                rango={rangoFechasCita(ahora)}
                fecha={reprogramando.fecha}
                errorFecha={errorFecha}
                horarios={horarios}
                horas={horas}
                hora={reprogramando.hora}
                procesando={procesando}
                onCambiarFecha={(nueva) =>
                  setReprogramando((actual) => ({ ...actual, fecha: nueva, hora: undefined }))
                }
                onElegirHora={(hora) => setReprogramando((actual) => ({ ...actual, hora }))}
                onConfirmar={confirmarReprogramacion}
                onCerrar={() => setReprogramando(null)}
              />
            </div>
          )}
        </div>
      </div>

      {porConfirmar && seleccionada && (
        <DialogoConfirmacion
          titulo={ACCIONES[porConfirmar].texto}
          mensaje={
            porConfirmar === "CANCELADA"
              ? `¿Cancelar la cita de ${nombre(seleccionada.pacienteId)} del ${formatearFechaLarga(seleccionada.fecha)} a las ${seleccionada.hora}? El pago se reembolsará.`
              : `¿Marcar como inasistencia la cita de ${nombre(seleccionada.pacienteId)} del ${formatearFechaLarga(seleccionada.fecha)} a las ${seleccionada.hora}? No se puede deshacer.`
          }
          textoConfirmar={`Sí, ${ACCIONES[porConfirmar].texto.toLowerCase()}`}
          variante={porConfirmar === "CANCELADA" ? "danger" : "primary"}
          procesando={procesando}
          onConfirmar={() => aplicar(seleccionada, porConfirmar)}
          onCancelar={() => setPorConfirmar(null)}
        />
      )}
    </section>
  );
}
