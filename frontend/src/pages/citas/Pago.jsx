import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormPago from "../../components/citas/FormPago.jsx";
import ResumenCita from "../../components/citas/ResumenCita.jsx";
import { obtenerSesion } from "../../auth/auth.js";
import { borrarReserva, guardarReserva, leerReserva } from "../../data/reservaData.js";
import {
  crearCita,
  horariosDisponibles,
  puedeAgendarTeleconsulta,
} from "../../services/citasService.js";
import { procesarPago, reembolsarPagoSinCita } from "../../services/pagosService.js";
import { obtenerNutricionista, obtenerServicio } from "../../services/serviciosService.js";
import { primerPasoIncompleto, validarFechaCita, validarMotivo } from "../../utils/citas.js";

const esPresencial = (servicio) => servicio.modalidad.startsWith("Presencial");

// Antes de cobrar se revisa que la reserva siga siendo válida (RN-10 a RN-14 y RN-16).
// Así no se cobra una reserva que crearCita rechazaría. Devuelve "" si está todo bien.
async function revisarReserva(reserva, servicio, nutricionista, pacienteId) {
  if (!servicio || !servicio.activo) return "El servicio elegido ya no está disponible.";
  if (!nutricionista) return "El nutricionista elegido no existe.";
  const errorFecha = validarFechaCita(reserva.fecha, new Date());
  if (errorFecha) return errorFecha;
  const errorMotivo = validarMotivo(reserva.motivo);
  if (errorMotivo) return errorMotivo;
  if (!esPresencial(servicio) && !(await puedeAgendarTeleconsulta(pacienteId))) {
    return "La teleconsulta requiere haber tenido antes una consulta presencial.";
  }
  const libres = await horariosDisponibles(nutricionista.id, reserva.fecha, servicio.duracionMin);
  if (!libres.includes(reserva.hora)) return `La hora ${reserva.hora} ya no está disponible.`;
  return "";
}

// S-04 (RN-03, RN-18 a RN-23): paga la reserva guardada en nv_reserva y, si el pago se
// aprueba, crea la cita PENDIENTE. Si se rechaza, va a /citas/pago/error con el motivo.
export default function Pago() {
  const navigate = useNavigate();
  const [sesion] = useState(() => obtenerSesion());
  const [reserva] = useState(() => leerReserva(sesion?.id));
  const completa = Boolean(reserva) && primerPasoIncompleto(reserva) === 4;
  const [carga, setCarga] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");

  useEffect(() => {
    if (!completa) return undefined;
    let vigente = true;
    Promise.all([
      obtenerServicio(reserva.servicioCodigo),
      obtenerNutricionista(reserva.nutricionistaId),
    ])
      .then(async ([servicio, nutricionista]) => {
        const problema = await revisarReserva(reserva, servicio, nutricionista, sesion.id);
        if (vigente) setCarga({ servicio, nutricionista, problema });
      })
      .catch(() => {
        if (vigente) setCarga({ problema: "No pudimos cargar tu solicitud. Intenta de nuevo." });
      });
    return () => {
      vigente = false;
    };
  }, [completa, reserva, sesion?.id]);

  function volverASolicitud() {
    guardarReserva(sesion.id, { ...reserva, hora: undefined, paso: 3 });
    navigate("/citas/solicitar");
  }

  async function pagar(datosTarjeta) {
    setProcesando(true);
    setErrores({});
    setErrorGeneral("");
    let resultado;
    try {
      resultado = await procesarPago({ ...datosTarjeta, monto: carga.servicio.precio });
    } catch (error) {
      if (error.errores) setErrores(error.errores);
      else setErrorGeneral(error.message);
      setProcesando(false);
      return;
    }

    // RN-22: rechazado → pantalla de error; la reserva sigue en nv_reserva para reintentar.
    if (resultado.estado !== "APROBADO") {
      navigate("/citas/pago/error", { state: { motivo: resultado.motivo } });
      return;
    }

    // RN-03 y RN-35: la cita nace PENDIENTE con el pago aprobado.
    try {
      const cita = await crearCita({
        pacienteId: sesion.id,
        servicioCodigo: reserva.servicioCodigo,
        nutricionistaId: reserva.nutricionistaId,
        fecha: reserva.fecha,
        hora: reserva.hora,
        motivo: reserva.motivo,
        pagoId: resultado.pagoId,
      });
      borrarReserva();
      navigate(`/citas/pago/exito/${cita.id}`, { replace: true });
    } catch (error) {
      // El pago se aprobó, pero la cita no se pudo crear: se devuelve el dinero.
      let reembolsado = true;
      try {
        await reembolsarPagoSinCita(resultado.pagoId);
      } catch {
        reembolsado = false;
      }
      setErrorGeneral(
        reembolsado
          ? `${error.message} No se hizo ningún cobro: el pago quedó reembolsado.`
          : `${error.message} Tu pago ${resultado.pagoId} quedó aprobado sin cita: llama a la clínica.`,
      );
      setProcesando(false);
    }
  }

  if (!completa) {
    return (
      <section className="container py-4">
        <h1>Pago</h1>
        <p>No tienes una solicitud de cita en curso.</p>
        <Link className="btn btn-primary" to="/citas/solicitar">
          Solicitar cita
        </Link>
      </section>
    );
  }

  if (!carga) {
    return (
      <section className="container py-4">
        <h1>Pago</h1>
        <p role="status">Preparando el pago...</p>
      </section>
    );
  }

  if (carga.problema) {
    return (
      <section className="container py-4">
        <h1>Pago</h1>
        <p role="alert" className="alert alert-danger">
          {carga.problema} No se hizo ningún cobro.
        </p>
        <button type="button" className="btn btn-primary" onClick={volverASolicitud}>
          Volver a la solicitud
        </button>
      </section>
    );
  }

  return (
    <section className="container py-4">
      <h1>Pago</h1>
      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="bg-white border rounded-3 p-3">
            <h2 className="h5">Tu solicitud</h2>
            <ResumenCita
              servicio={carga.servicio}
              nutricionista={carga.nutricionista}
              fecha={reserva.fecha}
              hora={reserva.hora}
              motivo={reserva.motivo}
            />
            <Link to="/citas/solicitar" className="d-inline-block mt-3">
              Cambiar la solicitud
            </Link>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="bg-white border rounded-3 p-3">
            <h2 className="h5">Datos de la tarjeta</h2>
            {errorGeneral && (
              <p role="alert" className="alert alert-danger">
                {errorGeneral}
              </p>
            )}
            <FormPago
              monto={carga.servicio.precio}
              procesando={procesando}
              errores={errores}
              onPagar={pagar}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
