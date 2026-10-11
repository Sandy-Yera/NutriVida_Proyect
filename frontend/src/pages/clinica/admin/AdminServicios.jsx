import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ConfirmarDesactivacion from "../../../components/clinica/ConfirmarDesactivacion.jsx";
import TablaServicios from "../../../components/clinica/TablaServicios.jsx";
import { cambiarEstadoServicio, listarServicios } from "../../../services/serviciosService.js";
import { NOMBRE_TIPO_SERVICIO } from "../../../utils/clinica.js";

const FILTROS_INICIALES = { texto: "", tipo: "", estado: "" };

export default function AdminServicios() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [servicios, setServicios] = useState(null);
  const [version, setVersion] = useState(0);
  const [pendiente, setPendiente] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState(() =>
    location.state?.mensaje ? { tipo: "exito", texto: location.state.mensaje } : null,
  );

  useEffect(() => {
    let vigente = true;
    listarServicios({
      tipo: filtros.tipo || undefined,
      texto: filtros.texto,
      soloActivos: false,
    }).then((lista) => {
      if (vigente) setServicios(lista);
    });
    return () => {
      vigente = false;
    };
  }, [filtros.tipo, filtros.texto, version]);

  function cambiarFiltro(evento) {
    const { name, value } = evento.target;
    setFiltros((previos) => ({ ...previos, [name]: value }));
  }

  async function cambiarEstado(servicio, activo) {
    setProcesando(true);
    try {
      await cambiarEstadoServicio(servicio.codigo, activo);
      setAviso({
        tipo: "exito",
        texto: `${servicio.nombre} (${servicio.codigo}) ${activo ? "activado" : "desactivado"}.`,
      });
      setVersion((anterior) => anterior + 1);
    } catch (error) {
      setAviso({ tipo: "error", texto: error.message });
    } finally {
      setProcesando(false);
      setPendiente(null);
    }
  }

  function solicitarCambioEstado(servicio) {
    if (servicio.activo) setPendiente(servicio);
    else cambiarEstado(servicio, true);
  }

  function contenido() {
    if (servicios === null) return <p role="status">Cargando servicios...</p>;
    const visibles = servicios.filter(
      (servicio) => filtros.estado === "" || servicio.activo === (filtros.estado === "activos"),
    );
    if (visibles.length === 0) {
      return (
        <div className="bg-white border rounded-3 p-4">
          <p>No hay servicios que coincidan con los filtros.</p>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => setFiltros(FILTROS_INICIALES)}
          >
            Limpiar filtros
          </button>
        </div>
      );
    }
    return (
      <>
        <p className="text-body-secondary small mb-2">
          {visibles.length} {visibles.length === 1 ? "servicio" : "servicios"}
        </p>
        <TablaServicios
          servicios={visibles}
          onEditar={(servicio) => navigate(`/admin/servicios/${servicio.codigo}`)}
          onCambiarEstado={solicitarCambioEstado}
        />
      </>
    );
  }

  return (
    <section>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h1 className="mb-0">Servicios</h1>
        <Link className="btn btn-primary" to="/admin/servicios/nuevo">
          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
          Nuevo servicio
        </Link>
      </div>
      {aviso && (
        <div
          className={`alert ${aviso.tipo === "exito" ? "alert-success" : "alert-danger"}`}
          role={aviso.tipo === "exito" ? "status" : "alert"}
        >
          {aviso.texto}
        </div>
      )}
      <div className="row g-2 mb-3" role="search">
        <div className="col-12 col-md-5">
          <label htmlFor="filtro-texto" className="form-label">
            Buscar
          </label>
          <input
            id="filtro-texto"
            name="texto"
            type="search"
            className="form-control"
            placeholder="Nombre o descripción"
            value={filtros.texto}
            onChange={cambiarFiltro}
          />
        </div>
        <div className="col-6 col-md-4">
          <label htmlFor="filtro-tipo" className="form-label">
            Tipo
          </label>
          <select
            id="filtro-tipo"
            name="tipo"
            className="form-select"
            value={filtros.tipo}
            onChange={cambiarFiltro}
          >
            <option value="">Todos</option>
            {Object.entries(NOMBRE_TIPO_SERVICIO).map(([clave, nombre]) => (
              <option key={clave} value={clave}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-3">
          <label htmlFor="filtro-estado" className="form-label">
            Estado
          </label>
          <select
            id="filtro-estado"
            name="estado"
            className="form-select"
            value={filtros.estado}
            onChange={cambiarFiltro}
          >
            <option value="">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>
      </div>
      {contenido()}
      {pendiente && (
        <ConfirmarDesactivacion
          servicio={pendiente}
          procesando={procesando}
          onConfirmar={() => cambiarEstado(pendiente, false)}
          onCancelar={() => setPendiente(null)}
        />
      )}
    </section>
  );
}
