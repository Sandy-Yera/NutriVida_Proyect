import { useState } from "react";
import ErrorCampo from "./ErrorCampo.jsx";
import {
  calcularImc,
  clasificarImc,
  formatearMedida,
  validarMedicion,
} from "../../utils/clinica.js";

const CAMPOS = [
  { campo: "pesoKg", etiqueta: "Peso (kg)", paso: "0.1" },
  { campo: "tallaCm", etiqueta: "Talla (cm)", paso: "0.1" },
  { campo: "cinturaCm", etiqueta: "Cintura (cm, opcional)", paso: "0.1" },
  { campo: "caderaCm", etiqueta: "Cadera (cm, opcional)", paso: "0.1" },
  { campo: "grasaPct", etiqueta: "% grasa (opcional)", paso: "0.1" },
];

function numeroOpcional(valor) {
  return valor === "" ? null : Number(valor);
}

function formularioVacio(hoy, tallaCm = "") {
  return {
    fecha: hoy.toLocaleDateString("sv-SE"),
    pesoKg: "",
    tallaCm: String(tallaCm ?? ""),
    cinturaCm: "",
    caderaCm: "",
    grasaPct: "",
    notas: "",
  };
}

function ImcEnVivo({ datos, objetivo, hoy }) {
  const errores = validarMedicion(datos, hoy);
  if (!datos.pesoKg || !datos.tallaCm || errores.pesoKg || errores.tallaCm) {
    return <>Completa el peso y la talla para calcular el IMC.</>;
  }
  const imc = calcularImc(datos.pesoKg, datos.tallaCm);
  const clasificacion = clasificarImc(imc, objetivo);
  return (
    <>
      IMC calculado: <strong>{formatearMedida(imc, "IMC")}</strong>
      {clasificacion ? ` · ${clasificacion}` : " · Sin clasificar (nutrición infantil)"}
    </>
  );
}

export default function FormMedicion({ onGuardar, objetivo, tallaSugerida, hoy = new Date() }) {
  const [datos, setDatos] = useState(() => formularioVacio(hoy, tallaSugerida));
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardada, setGuardada] = useState(false);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((previos) => ({ ...previos, [name]: value }));
    setErrores((previos) => ({ ...previos, [name]: "" }));
    setGuardada(false);
    setErrorGeneral("");
  }

  function propsCampo(campo) {
    return {
      id: `medicion-${campo}`,
      name: campo,
      value: datos[campo],
      onChange: cambiar,
      className: `form-control${errores[campo] ? " is-invalid" : ""}`,
      "aria-invalid": Boolean(errores[campo]),
      "aria-describedby": errores[campo] ? `medicion-${campo}-error` : undefined,
    };
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    const nuevosErrores = validarMedicion(datos, hoy);
    setErrores(nuevosErrores);
    const primerCampoConError = Object.keys(nuevosErrores)[0];
    if (primerCampoConError) {
      document.getElementById(`medicion-${primerCampoConError}`)?.focus();
      return;
    }
    setGuardando(true);
    try {
      await onGuardar({
        fecha: datos.fecha,
        pesoKg: Number(datos.pesoKg),
        tallaCm: Number(datos.tallaCm),
        cinturaCm: numeroOpcional(datos.cinturaCm),
        caderaCm: numeroOpcional(datos.caderaCm),
        grasaPct: numeroOpcional(datos.grasaPct),
        notas: datos.notas.trim(),
      });
      setDatos(formularioVacio(hoy, datos.tallaCm));
      setGuardada(true);
    } catch (error) {
      setErrores(error.errores ?? {});
      setErrorGeneral(error.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} noValidate>
      <div className="row g-3">
        <div className="col-12 col-sm-6">
          <label htmlFor="medicion-fecha" className="form-label">
            Fecha
          </label>
          <input type="date" max={hoy.toLocaleDateString("sv-SE")} {...propsCampo("fecha")} />
          <ErrorCampo id="medicion-fecha" mensaje={errores.fecha} />
        </div>
        {CAMPOS.map(({ campo, etiqueta, paso }) => (
          <div key={campo} className="col-6">
            <label htmlFor={`medicion-${campo}`} className="form-label">
              {etiqueta}
            </label>
            <input type="number" inputMode="decimal" step={paso} {...propsCampo(campo)} />
            <ErrorCampo id={`medicion-${campo}`} mensaje={errores[campo]} />
          </div>
        ))}
        <div className="col-12">
          <label htmlFor="medicion-notas" className="form-label">
            Notas (opcional)
          </label>
          <textarea rows={2} maxLength={300} {...propsCampo("notas")} />
        </div>
        <div className="col-12">
          <p className="border rounded-3 px-3 py-2 mb-0" aria-live="polite">
            <ImcEnVivo datos={datos} objetivo={objetivo} hoy={hoy} />
          </p>
        </div>
        {guardada && (
          <div className="col-12">
            <div className="alert alert-success py-2 mb-0" role="status">
              Medición registrada.
            </div>
          </div>
        )}
        {errorGeneral && (
          <div className="col-12">
            <div className="alert alert-danger py-2 mb-0" role="alert">
              {errorGeneral}
            </div>
          </div>
        )}
        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            Registrar medición
          </button>
        </div>
      </div>
    </form>
  );
}
