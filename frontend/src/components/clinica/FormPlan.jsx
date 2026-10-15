import { useState } from "react";
import ErrorCampo from "./ErrorCampo.jsx";
import { COMIDAS_PLAN, validarPlan } from "../../utils/clinica.js";

function datosIniciales(plan) {
  return {
    objetivo: plan?.objetivo ?? "",
    kcalDiarias: plan?.kcalDiarias ? String(plan.kcalDiarias) : "",
    comidas: Object.fromEntries(
      COMIDAS_PLAN.map(({ clave }) => [clave, plan?.comidas?.[clave] ?? ""]),
    ),
    indicaciones: plan?.indicaciones ?? "",
  };
}

export default function FormPlan({ plan, onGuardar }) {
  const [datos, setDatos] = useState(() => datosIniciales(plan));
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((previos) =>
      COMIDAS_PLAN.some(({ clave }) => clave === name)
        ? { ...previos, comidas: { ...previos.comidas, [name]: value } }
        : { ...previos, [name]: value },
    );
    setErrores((previos) => ({ ...previos, [name]: "" }));
    setGuardado(false);
  }

  function propsCampo(campo, valor) {
    return {
      id: `plan-${campo}`,
      name: campo,
      value: valor,
      onChange: cambiar,
      className: `form-control${errores[campo] ? " is-invalid" : ""}`,
      "aria-invalid": Boolean(errores[campo]),
      "aria-describedby": errores[campo] ? `plan-${campo}-error` : undefined,
    };
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    const nuevosErrores = validarPlan(datos);
    setErrores(nuevosErrores);
    const primerCampoConError = Object.keys(nuevosErrores)[0];
    if (primerCampoConError) {
      document.getElementById(`plan-${primerCampoConError}`)?.focus();
      return;
    }
    setGuardando(true);
    try {
      await onGuardar({
        objetivo: datos.objetivo.trim(),
        kcalDiarias: Number(datos.kcalDiarias),
        comidas: Object.fromEntries(
          COMIDAS_PLAN.map(({ clave }) => [clave, datos.comidas[clave].trim()]),
        ),
        indicaciones: datos.indicaciones.trim(),
      });
      setGuardado(true);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} noValidate>
      <div className="row g-3">
        <div className="col-12 col-md-8">
          <label htmlFor="plan-objetivo" className="form-label">
            Objetivo del plan
          </label>
          <input {...propsCampo("objetivo", datos.objetivo)} />
          <ErrorCampo id="plan-objetivo" mensaje={errores.objetivo} />
        </div>
        <div className="col-12 col-md-4">
          <label htmlFor="plan-kcalDiarias" className="form-label">
            Kcal diarias
          </label>
          <input
            type="number"
            inputMode="numeric"
            step="50"
            {...propsCampo("kcalDiarias", datos.kcalDiarias)}
          />
          <ErrorCampo id="plan-kcalDiarias" mensaje={errores.kcalDiarias} />
        </div>
        {COMIDAS_PLAN.map(({ clave, nombre }) => (
          <div key={clave} className="col-12 col-md-6 col-xl">
            <label htmlFor={`plan-${clave}`} className="form-label">
              {nombre}
            </label>
            <textarea rows={3} maxLength={300} {...propsCampo(clave, datos.comidas[clave])} />
            <ErrorCampo id={`plan-${clave}`} mensaje={errores[clave]} />
          </div>
        ))}
        <div className="col-12">
          <label htmlFor="plan-indicaciones" className="form-label">
            Indicaciones (opcional)
          </label>
          <textarea rows={2} maxLength={500} {...propsCampo("indicaciones", datos.indicaciones)} />
        </div>
        {guardado && (
          <div className="col-12">
            <div className="alert alert-success py-2 mb-0" role="status">
              Plan guardado. El paciente ya lo ve en Mi progreso.
            </div>
          </div>
        )}
        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            Guardar plan
          </button>
        </div>
      </div>
    </form>
  );
}
