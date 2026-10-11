import { useState } from "react";
import CampoTexto from "./CampoTexto.jsx";
import { formatearTelefono } from "../../utils/formato.js";
import { validarPerfil } from "../../utils/validaciones.js";

export default function FormDatosPerfil({ usuario, onGuardar }) {
  const [datos, setDatos] = useState({
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    telefono: usuario.telefono,
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((previos) => ({ ...previos, [name]: value }));
    setErrores((previos) => ({ ...previos, [name]: "" }));
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    const nuevosErrores = validarPerfil(datos);
    setErrores(nuevosErrores);
    const primerCampoConError = Object.keys(nuevosErrores)[0];
    if (primerCampoConError) {
      document.getElementById(primerCampoConError)?.focus();
      return;
    }
    setGuardando(true);
    try {
      await onGuardar({
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        telefono: formatearTelefono(datos.telefono),
      });
    } catch (error) {
      setErrores(error.campo ? { [error.campo]: error.message } : { general: error.message });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} noValidate>
      <div className="row g-3">
        <CampoTexto
          id="nombre"
          etiqueta="Nombre"
          className="col-12 col-md-6"
          autoComplete="given-name"
          value={datos.nombre}
          onChange={cambiar}
          error={errores.nombre}
        />
        <CampoTexto
          id="apellido"
          etiqueta="Apellido"
          className="col-12 col-md-6"
          autoComplete="family-name"
          value={datos.apellido}
          onChange={cambiar}
          error={errores.apellido}
        />
        <CampoTexto
          id="telefono"
          etiqueta="Teléfono celular"
          type="tel"
          className="col-12"
          placeholder="+56 9 1234 5678"
          autoComplete="tel"
          value={datos.telefono}
          onChange={cambiar}
          error={errores.telefono}
        />
        {errores.general && (
          <div className="col-12">
            <div className="alert alert-danger py-2 mb-0" role="alert">
              {errores.general}
            </div>
          </div>
        )}
        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            Guardar datos
          </button>
        </div>
      </div>
    </form>
  );
}
