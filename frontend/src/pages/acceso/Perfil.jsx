import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FormCambioClave from "../../components/acceso/FormCambioClave.jsx";
import FormDatosPerfil from "../../components/acceso/FormDatosPerfil.jsx";
import { obtenerSesion } from "../../auth/auth.js";
import { NOMBRE_ROL } from "../../config/roles.js";
import { actualizarUsuario, cambiarClave, obtenerUsuario } from "../../services/usuariosService.js";
import { formatearFechaLarga } from "../../utils/formato.js";

export default function Perfil() {
  const navigate = useNavigate();
  const idSesion = obtenerSesion()?.id;
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    let vigente = true;
    obtenerUsuario(idSesion).then((encontrado) => {
      if (vigente) setUsuario(encontrado);
    });
    return () => {
      vigente = false;
    };
  }, [idSesion]);

  function avisar(mensaje) {
    navigate("/perfil", { replace: true, state: { mensaje, tipo: "exito" } });
  }

  async function guardarDatos(cambios) {
    const actualizado = await actualizarUsuario(idSesion, cambios);
    setUsuario(actualizado);
    avisar("Datos actualizados.");
  }

  async function guardarClave({ claveActual, claveNueva }) {
    await cambiarClave(idSesion, claveActual, claveNueva);
    avisar("Contraseña actualizada.");
  }

  if (usuario === null) {
    return (
      <section className="container py-4">
        <h1>Mi perfil</h1>
        <p role="status">Cargando tus datos...</p>
      </section>
    );
  }

  return (
    <section className="container py-4">
      <h1 className="mb-3">Mi perfil</h1>
      <div className="row g-4">
        <div className="col-12 col-lg-7">
          <div className="bg-white border rounded-3 p-3 p-md-4 h-100">
            <h2 className="h4 mb-3">Datos personales</h2>
            <dl className="row small mb-4">
              <dt className="col-5 col-sm-4 fw-semibold">RUT</dt>
              <dd className="col-7 col-sm-8">{usuario.rut}</dd>
              <dt className="col-5 col-sm-4 fw-semibold">Correo</dt>
              <dd className="col-7 col-sm-8 text-break">{usuario.correo}</dd>
              <dt className="col-5 col-sm-4 fw-semibold">Rol</dt>
              <dd className="col-7 col-sm-8">{NOMBRE_ROL[usuario.rol] ?? usuario.rol}</dd>
              <dt className="col-5 col-sm-4 fw-semibold">Fecha de nacimiento</dt>
              <dd className="col-7 col-sm-8 mb-0">
                {usuario.fechaNacimiento
                  ? formatearFechaLarga(usuario.fechaNacimiento)
                  : "No registrada"}
              </dd>
            </dl>
            <FormDatosPerfil usuario={usuario} onGuardar={guardarDatos} />
          </div>
        </div>
        <div className="col-12 col-lg-5">
          <div className="bg-white border rounded-3 p-3 p-md-4 h-100">
            <h2 className="h4 mb-3">Cambiar contraseña</h2>
            <FormCambioClave onGuardar={guardarClave} />
          </div>
        </div>
      </div>
    </section>
  );
}
