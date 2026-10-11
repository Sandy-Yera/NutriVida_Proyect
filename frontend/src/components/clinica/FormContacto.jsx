import { useState } from "react";
import { MOTIVOS_CONTACTO, validarContacto } from "../../utils/clinica.js";

const VACIO = { nombre: "", correo: "", telefono: "", motivo: "", mensaje: "" };

function Error({ campo, errores }) {
  if (!errores[campo]) return null;
  return (
    <div id={`contacto-${campo}-error`} className="invalid-feedback" role="alert">
      {errores[campo]}
    </div>
  );
}

export default function FormContacto({ onEnviar }) {
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((previos) => ({ ...previos, [name]: value }));
    setErrores((previos) => ({ ...previos, [name]: "" }));
    setEnviado(false);
  }

  function propsCampo(campo) {
    return {
      id: `contacto-${campo}`,
      name: campo,
      value: datos[campo],
      onChange: cambiar,
      "aria-invalid": Boolean(errores[campo]),
      "aria-describedby": errores[campo] ? `contacto-${campo}-error` : undefined,
    };
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    const nuevosErrores = validarContacto(datos);
    setErrores(nuevosErrores);
    const primerCampoConError = Object.keys(nuevosErrores)[0];
    if (primerCampoConError) {
      document.getElementById(`contacto-${primerCampoConError}`)?.focus();
      return;
    }
    setEnviando(true);
    try {
      await onEnviar({
        nombre: datos.nombre.trim(),
        correo: datos.correo.trim(),
        telefono: datos.telefono.trim(),
        motivo: datos.motivo,
        mensaje: datos.mensaje.trim(),
      });
      setDatos(VACIO);
      setEnviado(true);
    } finally {
      setEnviando(false);
    }
  }

  const invalido = (campo) => (errores[campo] ? " is-invalid" : "");

  return (
    <form onSubmit={manejarEnvio} noValidate>
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label htmlFor="contacto-nombre" className="form-label">
            Nombre
          </label>
          <input
            className={`form-control${invalido("nombre")}`}
            autoComplete="name"
            {...propsCampo("nombre")}
          />
          <Error campo="nombre" errores={errores} />
        </div>
        <div className="col-12 col-md-6">
          <label htmlFor="contacto-correo" className="form-label">
            Correo
          </label>
          <input
            type="email"
            className={`form-control${invalido("correo")}`}
            autoComplete="email"
            {...propsCampo("correo")}
          />
          <Error campo="correo" errores={errores} />
        </div>
        <div className="col-12 col-md-6">
          <label htmlFor="contacto-telefono" className="form-label">
            Teléfono (opcional)
          </label>
          <input
            type="tel"
            className={`form-control${invalido("telefono")}`}
            placeholder="+56 9 1234 5678"
            autoComplete="tel"
            {...propsCampo("telefono")}
          />
          <Error campo="telefono" errores={errores} />
        </div>
        <div className="col-12 col-md-6">
          <label htmlFor="contacto-motivo" className="form-label">
            Motivo
          </label>
          <select className={`form-select${invalido("motivo")}`} {...propsCampo("motivo")}>
            <option value="">Elige un motivo</option>
            {MOTIVOS_CONTACTO.map((motivo) => (
              <option key={motivo} value={motivo}>
                {motivo}
              </option>
            ))}
          </select>
          <Error campo="motivo" errores={errores} />
        </div>
        <div className="col-12">
          <label htmlFor="contacto-mensaje" className="form-label">
            Mensaje
          </label>
          <textarea
            className={`form-control${invalido("mensaje")}`}
            rows={5}
            maxLength={500}
            {...propsCampo("mensaje")}
          />
          <div className="form-text">{datos.mensaje.length} de 500 caracteres (mínimo 10).</div>
          <Error campo="mensaje" errores={errores} />
        </div>
        {enviado && (
          <div className="col-12">
            <div className="alert alert-success py-2 mb-0" role="status">
              Mensaje enviado. Te responderemos al correo que indicaste.
            </div>
          </div>
        )}
        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            Enviar mensaje
          </button>
        </div>
      </div>
    </form>
  );
}
