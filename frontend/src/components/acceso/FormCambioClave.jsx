import { useState } from "react";
import CampoTexto from "./CampoTexto.jsx";
import { validarCambioClave } from "../../utils/validaciones.js";

const VACIO = { claveActual: "", claveNueva: "", confirmacion: "" };

export default function FormCambioClave({ onGuardar }) {
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((previos) => ({ ...previos, [name]: value }));
    setErrores((previos) => ({ ...previos, [name]: "" }));
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    const nuevosErrores = validarCambioClave(datos);
    setErrores(nuevosErrores);
    const primerCampoConError = Object.keys(nuevosErrores)[0];
    if (primerCampoConError) {
      document.getElementById(primerCampoConError)?.focus();
      return;
    }
    setGuardando(true);
    try {
      await onGuardar({ claveActual: datos.claveActual, claveNueva: datos.claveNueva });
      setDatos(VACIO);
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
          id="claveActual"
          etiqueta="Contraseña actual"
          type="password"
          autoComplete="current-password"
          value={datos.claveActual}
          onChange={cambiar}
          error={errores.claveActual}
        />
        <CampoTexto
          id="claveNueva"
          etiqueta="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          ayuda="Mínimo 8 caracteres, con al menos una mayúscula y un número."
          value={datos.claveNueva}
          onChange={cambiar}
          error={errores.claveNueva}
        />
        <CampoTexto
          id="confirmacion"
          etiqueta="Repite la nueva contraseña"
          type="password"
          autoComplete="new-password"
          value={datos.confirmacion}
          onChange={cambiar}
          error={errores.confirmacion}
        />
        {errores.general && (
          <div className="col-12">
            <div className="alert alert-danger py-2 mb-0" role="alert">
              {errores.general}
            </div>
          </div>
        )}
        <div className="col-12">
          <button type="submit" className="btn btn-outline-primary" disabled={guardando}>
            Cambiar contraseña
          </button>
        </div>
      </div>
    </form>
  );
}
