import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ConfirmarDesactivacion from "../../../components/clinica/ConfirmarDesactivacion.jsx";
import FormServicio from "../../../components/clinica/FormServicio.jsx";
import {
  actualizarServicio,
  crearServicio,
  obtenerServicio,
} from "../../../services/serviciosService.js";

function Formulario({ codigo }) {
  const esNuevo = !codigo;
  const navigate = useNavigate();
  const [carga, setCarga] = useState({ lista: esNuevo, servicio: null });
  const [pendiente, setPendiente] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (esNuevo) return undefined;
    let vigente = true;
    obtenerServicio(codigo).then((servicio) => {
      if (vigente) setCarga({ lista: true, servicio });
    });
    return () => {
      vigente = false;
    };
  }, [codigo, esNuevo]);

  function volverConMensaje(servicio, accion) {
    navigate("/admin/servicios", {
      state: { mensaje: `${servicio.nombre} (${servicio.codigo}) ${accion}.` },
    });
  }

  async function actualizar(datos) {
    const actualizado = await actualizarServicio(codigo, datos);
    volverConMensaje(actualizado, "actualizado");
  }

  async function guardar(datos) {
    if (esNuevo) {
      volverConMensaje(await crearServicio(datos), "creado");
    } else if (carga.servicio.activo && !datos.activo) {
      setPendiente(datos);
    } else {
      await actualizar(datos);
    }
  }

  async function confirmarDesactivacion() {
    setProcesando(true);
    try {
      await actualizar(pendiente);
    } catch (problema) {
      setError(problema.message);
      setPendiente(null);
    } finally {
      setProcesando(false);
    }
  }

  if (!carga.lista) return <p role="status">Cargando servicio...</p>;

  if (!esNuevo && !carga.servicio) {
    return (
      <section>
        <h1>Servicio no encontrado</h1>
        <p>No existe un servicio con el código {codigo}.</p>
        <Link to="/admin/servicios" className="btn btn-outline-primary">
          Volver a servicios
        </Link>
      </section>
    );
  }

  return (
    <section>
      <Link to="/admin/servicios" className="d-inline-block mb-3">
        <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
        Servicios
      </Link>
      <h1>{esNuevo ? "Nuevo servicio" : `Editar ${carga.servicio.codigo}`}</h1>
      {!esNuevo && <p className="text-body-secondary">{carga.servicio.nombre}</p>}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <div className="bg-white border rounded-3 p-3 p-md-4">
        <FormServicio servicio={carga.servicio} onGuardar={guardar} />
      </div>
      {pendiente && (
        <ConfirmarDesactivacion
          servicio={carga.servicio}
          procesando={procesando}
          onConfirmar={confirmarDesactivacion}
          onCancelar={() => setPendiente(null)}
        />
      )}
    </section>
  );
}

export default function ServicioFormulario() {
  const { codigo } = useParams();
  return <Formulario key={codigo ?? "nuevo"} codigo={codigo} />;
}
