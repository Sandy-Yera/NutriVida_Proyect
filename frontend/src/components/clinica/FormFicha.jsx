import { useState } from "react";
import ErrorCampo from "./ErrorCampo.jsx";
import { OBJETIVOS_FICHA, validarFicha } from "../../utils/clinica.js";

export default function FormFicha({ onCrear }) {
  const [datos, setDatos] = useState({ objetivo: "", antecedentes: "" });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [creando, setCreando] = useState(false);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((previos) => ({ ...previos, [name]: value }));
    setErrores((previos) => ({ ...previos, [name]: "" }));
  }

  function propsCampo(campo) {
    return {
      id: `ficha-${campo}`,
      name: campo,
      value: datos[campo],
      onChange: cambiar,
      "aria-invalid": Boolean(errores[campo]),
      "aria-describedby": errores[campo] ? `ficha-${campo}-error` : undefined,
    };
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setErrorGeneral("");
    const nuevosErrores = validarFicha(datos);
    setErrores(nuevosErrores);
    const primerCampoConError = Object.keys(nuevosErrores)[0];
    if (primerCampoConError) {
      document.getElementById(`ficha-${primerCampoConError}`)?.focus();
      return;
    }
    setCreando(true);
    try {
      await onCrear({ objetivo: datos.objetivo, antecedentes: datos.antecedentes.trim() });
    } catch (error) {
      // Errores del backend (contrato EP3): por campo bajo cada input y el mensaje arriba del botón.
      setErrores(error.errores ?? (error.campo ? { [error.campo]: error.message } : {}));
      setErrorGeneral(error.message);
    } finally {
      setCreando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} noValidate>
      <div className="mb-3">
        <label htmlFor="ficha-objetivo" className="form-label">
          Objetivo
        </label>
        <select
          className={`form-select${errores.objetivo ? " is-invalid" : ""}`}
          {...propsCampo("objetivo")}
        >
          <option value="">Elige un objetivo</option>
          {Object.entries(OBJETIVOS_FICHA).map(([clave, nombre]) => (
            <option key={clave} value={clave}>
              {nombre}
            </option>
          ))}
        </select>
        <ErrorCampo id="ficha-objetivo" mensaje={errores.objetivo} />
      </div>
      <div className="mb-3">
        <label htmlFor="ficha-antecedentes" className="form-label">
          Antecedentes
        </label>
        <textarea
          className={`form-control${errores.antecedentes ? " is-invalid" : ""}`}
          rows={3}
          maxLength={500}
          {...propsCampo("antecedentes")}
        />
        <ErrorCampo id="ficha-antecedentes" mensaje={errores.antecedentes} />
      </div>
      {errorGeneral && (
        <div className="alert alert-danger py-2" role="alert">
          {errorGeneral}
        </div>
      )}
      <button type="submit" className="btn btn-primary" disabled={creando}>
        Crear ficha
      </button>
    </form>
  );
}
