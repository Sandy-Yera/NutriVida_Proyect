import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PanelReprogramar from "../../components/citas/PanelReprogramar.jsx";
import TarjetaCita from "../../components/citas/TarjetaCita.jsx";
import DialogoConfirmacion from "../../components/comunes/DialogoConfirmacion.jsx";
import { obtenerSesion } from "../../auth/auth.js";
import { cambiarEstado, listarCitas, reprogramarCita } from "../../services/citasService.js";
import { listarNutricionistas, listarServicios } from "../../services/serviciosService.js";
import {
  necesitaRecordatorio,
  puedeCancelar,
  rangoFechasCita,
  separarProximasEHistorial,
} from "../../utils/citas.js";
import { formatearFechaLarga } from "../../utils/formato.js";
import { useHorasLibres } from "./useHorasLibres.js";

// RN-06: texto del caso para cuando faltan 24 h o menos.
const BLOQUEO_24H = "Ya no puedes cancelar: faltan menos de 24 h. Llama a la clínica.";

// S-05 (RN-05 a RN-08, RN-24, RN-32): las citas del paciente en sesión, con cancelar y reprogramar.
export default function MisCitas() {
  const [sesion] = useState(() => obtenerSesion());
  const [ahora] = useState(() => new Date());
  const [datos, setDatos] = useState(null);
  const [pestana, setPestana] = useState("proximas");
  const [aviso, setAviso] = useState(null);
  const [aCancelar, setACancelar] = useState(null);
  const [reprogramando, setReprogramando] = useState(null);
  const [procesando, setProcesando] = useState(false);

  // RN-24: solo las citas del paciente en sesión.
  useEffect(() => {
    let vigente = true;
    Promise.all([
      listarCitas({ pacienteId: sesion?.id }),
      listarServicios({ soloActivos: false }),
      listarNutricionistas(),
    ]).then(([citas, servicios, nutricionistas]) => {
      if (vigente) setDatos({ citas, servicios, nutricionistas });
    });
    return () => {
      vigente = false;
    };
  }, [sesion?.id]);

  // Reprogramar (RN-10 a RN-13): horas libres sin contar la propia cita.
  const citaReprogramada = reprogramando?.cita;
  const { errorFecha, horarios, horas } = useHorasLibres({
    cita: citaReprogramada,
    nutricionista: datos?.nutricionistas.find((n) => n.id === citaReprogramada?.nutricionistaId),
    fecha: reprogramando?.fecha,
    ahora,
  });

  if (!datos) {
    return (
      <section className="container py-4">
        <h1>Mis citas</h1>
        <p role="status">Cargando tus citas...</p>
      </section>
    );
  }

  const servicioDe = (cita) => datos.servicios.find((s) => s.codigo === cita.servicioCodigo);
  const nutricionistaDe = (cita) => datos.nutricionistas.find((n) => n.id === cita.nutricionistaId);
  const { proximas, historial } = separarProximasEHistorial(datos.citas, ahora);
  const recordatorios = datos.citas.filter((cita) => necesitaRecordatorio(cita, ahora));

  // Actualiza la lista pidiendo de nuevo las citas al service: se ve el cambio sin recargar (F5).
  async function recargarCitas() {
    const citas = await listarCitas({ pacienteId: sesion.id });
    setDatos((actual) => ({ ...actual, citas }));
  }

  // RN-06, RN-08: se vuelve a revisar la regla de 24 h al confirmar, por si la página estuvo abierta.
  async function confirmarCancelacion() {
    const cita = aCancelar;
    if (!puedeCancelar(cita, new Date())) {
      setACancelar(null);
      setAviso({ tipo: "error", texto: BLOQUEO_24H });
      return;
    }
    setProcesando(true);
    try {
      await cambiarEstado(cita.id, "CANCELADA", sesion.id);
      await recargarCitas();
      setAviso({ tipo: "exito", texto: "Cita cancelada. El pago quedó reembolsado." });
    } catch (error) {
      setAviso({ tipo: "error", texto: error.message });
    } finally {
      setProcesando(false);
      setACancelar(null);
    }
  }

  function abrirReprogramar(cita) {
    setAviso(null);
    setReprogramando({ cita, fecha: undefined, hora: undefined });
  }

  // RN-05: la cita queda PENDIENTE con la nueva fecha y hora; el service repite las reglas de agenda.
  async function confirmarReprogramacion() {
    const { cita, fecha, hora } = reprogramando;
    if (!puedeCancelar(cita, new Date())) {
      setReprogramando(null);
      setAviso({ tipo: "error", texto: BLOQUEO_24H });
      return;
    }
    setProcesando(true);
    try {
      await reprogramarCita(cita.id, fecha, hora, sesion.id);
      await recargarCitas();
      setReprogramando(null);
      setAviso({
        tipo: "exito",
        texto: `Cita reprogramada para el ${formatearFechaLarga(fecha)} a las ${hora}. Queda pendiente hasta que la clínica la confirme.`,
      });
    } catch (error) {
      setAviso({ tipo: "error", texto: error.message });
    } finally {
      setProcesando(false);
    }
  }

  // RN-32: sin ninguna cita, estado vacío con la acción sugerida.
  if (datos.citas.length === 0) {
    return (
      <section className="container py-4">
        <h1>Mis citas</h1>
        <p>Aún no tienes citas.</p>
        <Link className="btn btn-primary" to="/citas/solicitar">
          Solicitar cita
        </Link>
      </section>
    );
  }

  const lista = pestana === "proximas" ? proximas : historial;

  return (
    <section className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="mb-0">Mis citas</h1>
        <Link className="btn btn-primary" to="/citas/solicitar">
          Solicitar cita
        </Link>
      </div>

      {/* RN-07: recordatorio visible en EP2 (automático en EP3). */}
      {recordatorios.map((cita) => (
        <p key={cita.id} role="status" className="alert alert-info">
          Recordatorio: tienes una cita confirmada el {formatearFechaLarga(cita.fecha)} a las{" "}
          {cita.hora} con {nutricionistaDe(cita)?.nombre ?? cita.nutricionistaId}.
        </p>
      ))}

      {aviso && (
        <p
          role={aviso.tipo === "exito" ? "status" : "alert"}
          className={`alert ${aviso.tipo === "exito" ? "alert-success" : "alert-danger"}`}
        >
          {aviso.texto}
        </p>
      )}

      {reprogramando && (
        <PanelReprogramar
          titulo={`Reprogramar: ${servicioDe(citaReprogramada)?.nombre} del ${formatearFechaLarga(citaReprogramada.fecha)}, ${citaReprogramada.hora}`}
          rango={rangoFechasCita(ahora)}
          fecha={reprogramando.fecha}
          errorFecha={errorFecha}
          horarios={horarios}
          horas={horas}
          hora={reprogramando.hora}
          procesando={procesando}
          onCambiarFecha={(fecha) =>
            setReprogramando((actual) => ({ ...actual, fecha, hora: undefined }))
          }
          onElegirHora={(hora) => setReprogramando((actual) => ({ ...actual, hora }))}
          onConfirmar={confirmarReprogramacion}
          onCerrar={() => setReprogramando(null)}
        />
      )}

      <div className="nav nav-tabs mb-3" role="tablist" aria-label="Mis citas">
        {[
          { id: "proximas", titulo: "Próximas", cantidad: proximas.length },
          { id: "historial", titulo: "Historial", cantidad: historial.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={pestana === tab.id}
            aria-controls="panel-citas"
            className={`nav-link${pestana === tab.id ? " active" : ""}`}
            onClick={() => setPestana(tab.id)}
          >
            {tab.titulo} ({tab.cantidad})
          </button>
        ))}
      </div>

      <div id="panel-citas" role="tabpanel" aria-labelledby={`tab-${pestana}`}>
        {lista.length === 0 && pestana === "proximas" && (
          <p>
            No tienes citas próximas. <Link to="/citas/solicitar">Solicitar cita</Link>
          </p>
        )}
        {lista.length === 0 && pestana === "historial" && <p>Aún no tienes citas pasadas.</p>}

        <div className="row g-3">
          {lista.map((cita) => (
            <div key={cita.id} className="col-12 col-md-6">
              {pestana === "proximas" ? (
                <TarjetaCita
                  cita={cita}
                  servicio={servicioDe(cita)}
                  nutricionista={nutricionistaDe(cita)}
                  bloqueo={puedeCancelar(cita, ahora) ? "" : BLOQUEO_24H}
                  onCancelar={setACancelar}
                  onReprogramar={abrirReprogramar}
                />
              ) : (
                <TarjetaCita
                  cita={cita}
                  servicio={servicioDe(cita)}
                  nutricionista={nutricionistaDe(cita)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {aCancelar && (
        <DialogoConfirmacion
          titulo="Cancelar cita"
          mensaje={`¿Quieres cancelar tu cita del ${formatearFechaLarga(aCancelar.fecha)} a las ${aCancelar.hora}? El pago se reembolsará.`}
          textoConfirmar="Sí, cancelar la cita"
          variante="danger"
          procesando={procesando}
          onConfirmar={confirmarCancelacion}
          onCancelar={() => setACancelar(null)}
        />
      )}
    </section>
  );
}
