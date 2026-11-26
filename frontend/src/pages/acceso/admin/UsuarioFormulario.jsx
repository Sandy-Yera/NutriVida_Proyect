import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FormUsuario from "../../../components/acceso/FormUsuario.jsx";
import EditorFotoNutricionista from "../../../components/clinica/EditorFotoNutricionista.jsx";
import { obtenerSesion } from "../../../auth/auth.js";
import { listarNutricionistas } from "../../../services/serviciosService.js";
import {
  actualizarUsuario,
  crearUsuario,
  listarUsuarios,
  obtenerUsuario,
} from "../../../services/usuariosService.js";

export default function UsuarioFormulario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esNuevo = id === undefined;
  const sesion = obtenerSesion();
  const [carga, setCarga] = useState(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      listarNutricionistas(),
      listarUsuarios({ rol: "NUTRICIONISTA" }),
      esNuevo ? null : obtenerUsuario(id),
    ]).then(([nutricionistas, usuariosNutricionistas, usuario]) => {
      if (!vigente) return;
      const conVinculo = nutricionistas.map((nutricionista) => {
        const vinculado = usuariosNutricionistas.find(
          (u) => u.nutricionistaId === nutricionista.id && u.id !== id,
        );
        return {
          ...nutricionista,
          vinculadoA: vinculado ? `${vinculado.nombre} ${vinculado.apellido}` : null,
        };
      });
      setCarga({ id, nutricionistas: conVinculo, usuario });
    });
    return () => {
      vigente = false;
    };
  }, [id, esNuevo]);

  async function guardar(datos) {
    const guardado = esNuevo ? await crearUsuario(datos) : await actualizarUsuario(id, datos);
    const nombreCompleto = `${guardado.nombre} ${guardado.apellido}`;
    navigate("/admin/usuarios", {
      state: {
        mensaje: esNuevo
          ? `Usuario ${nombreCompleto} creado.`
          : `Cambios de ${nombreCompleto} guardados.`,
      },
    });
  }

  // El admin también puede cambiar la foto de un nutricionista (la ve el público en Nosotros).
  function actualizarFoto(actualizado) {
    setCarga((previa) => ({
      ...previa,
      nutricionistas: previa.nutricionistas.map((n) =>
        n.id === actualizado.id ? { ...n, fotoUrl: actualizado.fotoUrl } : n,
      ),
    }));
  }

  const titulo = esNuevo ? "Nuevo usuario" : "Editar usuario";

  if (carga === null || carga.id !== id) {
    return (
      <section>
        <h1>{titulo}</h1>
        <p role="status">Cargando...</p>
      </section>
    );
  }

  if (!esNuevo && carga.usuario === null) {
    return (
      <section>
        <h1>{titulo}</h1>
        <p>El usuario que buscas no existe.</p>
        <Link className="btn btn-outline-primary" to="/admin/usuarios">
          Volver a usuarios
        </Link>
      </section>
    );
  }

  const fichaNutricionista =
    !esNuevo && carga.usuario.rol === "NUTRICIONISTA"
      ? carga.nutricionistas.find((n) => n.id === carga.usuario.nutricionistaId)
      : null;

  return (
    <section>
      <nav aria-label="Ruta de navegación">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/admin/usuarios">Usuarios</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {esNuevo ? "Nuevo" : `${carga.usuario.nombre} ${carga.usuario.apellido}`}
          </li>
        </ol>
      </nav>
      <h1 className="mb-3">{titulo}</h1>
      <FormUsuario
        key={id ?? "nuevo"}
        usuarioInicial={carga.usuario}
        nutricionistas={carga.nutricionistas}
        esCuentaPropia={!esNuevo && sesion?.id === id}
        onGuardar={guardar}
        onCancelar={() => navigate("/admin/usuarios")}
      />
      {fichaNutricionista && (
        <div className="bg-white border rounded-3 p-3 p-md-4 mt-4">
          <h2 className="h5 mb-3">Foto de {fichaNutricionista.nombre}</h2>
          <EditorFotoNutricionista nutricionista={fichaNutricionista} onCambio={actualizarFoto} />
        </div>
      )}
    </section>
  );
}
