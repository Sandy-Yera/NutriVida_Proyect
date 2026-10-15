import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DialogoConfirmacion from "../../../components/comunes/DialogoConfirmacion.jsx";
import FiltroUsuarios from "../../../components/acceso/FiltroUsuarios.jsx";
import TablaUsuarios from "../../../components/acceso/TablaUsuarios.jsx";
import { obtenerSesion } from "../../../auth/auth.js";
import { cambiarEstado, listarUsuarios } from "../../../services/usuariosService.js";

const FILTROS_INICIALES = { texto: "", rol: "", estado: "" };

function aConsulta(filtros) {
  return {
    texto: filtros.texto,
    rol: filtros.rol || undefined,
    activo: filtros.estado === "" ? undefined : filtros.estado === "activos",
  };
}

export default function AdminUsuarios() {
  const navigate = useNavigate();
  const location = useLocation();
  const sesion = obtenerSesion();
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [usuarios, setUsuarios] = useState(null);
  const [version, setVersion] = useState(0);
  const [pendiente, setPendiente] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState(() =>
    location.state?.mensaje ? { tipo: "exito", texto: location.state.mensaje } : null,
  );

  useEffect(() => {
    let vigente = true;
    listarUsuarios(aConsulta(filtros)).then((lista) => {
      if (vigente) setUsuarios(lista);
    });
    return () => {
      vigente = false;
    };
  }, [filtros, version]);

  async function confirmarCambioEstado() {
    const nombreCompleto = `${pendiente.nombre} ${pendiente.apellido}`;
    setProcesando(true);
    try {
      const actualizado = await cambiarEstado(pendiente.id, !pendiente.activo);
      setAviso({
        tipo: "exito",
        texto: `Cuenta de ${nombreCompleto} ${actualizado.activo ? "activada" : "desactivada"}.`,
      });
      setVersion((anterior) => anterior + 1);
    } catch (error) {
      setAviso({ tipo: "error", texto: error.message });
    } finally {
      setProcesando(false);
      setPendiente(null);
    }
  }

  function contenido() {
    if (usuarios === null) {
      return <p role="status">Cargando usuarios...</p>;
    }
    if (usuarios.length === 0) {
      return (
        <div className="bg-white border rounded-3 p-4">
          <p>No hay usuarios que coincidan con la búsqueda.</p>
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
          {usuarios.length} {usuarios.length === 1 ? "usuario" : "usuarios"}
        </p>
        <TablaUsuarios
          usuarios={usuarios}
          idSesion={sesion?.id}
          onEditar={(usuario) => navigate(`/admin/usuarios/${usuario.id}`)}
          onCambiarEstado={setPendiente}
        />
      </>
    );
  }

  return (
    <section>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h1 className="mb-0">Usuarios</h1>
        <Link className="btn btn-primary" to="/admin/usuarios/nuevo">
          <i className="bi bi-person-plus me-1" aria-hidden="true" />
          Nuevo usuario
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
      <FiltroUsuarios filtros={filtros} onCambiar={setFiltros} />
      {contenido()}
      {pendiente && (
        <DialogoConfirmacion
          titulo={pendiente.activo ? "Desactivar cuenta" : "Activar cuenta"}
          mensaje={
            pendiente.activo
              ? `${pendiente.nombre} ${pendiente.apellido} no podrá iniciar sesión. Su historial de citas y fichas se conserva.`
              : `${pendiente.nombre} ${pendiente.apellido} podrá volver a iniciar sesión.`
          }
          textoConfirmar={pendiente.activo ? "Desactivar" : "Activar"}
          variante={pendiente.activo ? "danger" : "primary"}
          procesando={procesando}
          onConfirmar={confirmarCambioEstado}
          onCancelar={() => setPendiente(null)}
        />
      )}
    </section>
  );
}
