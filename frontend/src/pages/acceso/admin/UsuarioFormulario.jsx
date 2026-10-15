import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FormUsuario from "../../../components/acceso/FormUsuario.jsx";
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
    </section>
  );
}
