import { useState } from "react";
import { validarPago } from "../../utils/pagos.js";
import { formatearPrecio } from "../../utils/formato.js";

const VACIO = { titular: "", numero: "", vencimiento: "", cvv: "" };

const CAMPOS = [
  {
    nombre: "titular",
    etiqueta: "Nombre del titular",
    autoComplete: "cc-name",
    placeholder: "Como aparece en la tarjeta",
  },
  {
    nombre: "numero",
    etiqueta: "Número de tarjeta",
    autoComplete: "cc-number",
    inputMode: "numeric",
    placeholder: "4242 4242 4242 4242",
    maxLength: 19,
  },
  {
    nombre: "vencimiento",
    etiqueta: "Vencimiento (MM/AA)",
    autoComplete: "cc-exp",
    inputMode: "numeric",
    placeholder: "12/30",
    maxLength: 5,
  },
  {
    nombre: "cvv",
    etiqueta: "CVV",
    autoComplete: "cc-csc",
    inputMode: "numeric",
    placeholder: "123",
    maxLength: 3,
  },
];

// RN-18 y RN-21: formulario de la tarjeta. Valida en el navegador con validarPago (mismas
// reglas que pagosService) y, si todo está bien, entrega los datos al padre con onPagar.
// El padre decide qué hacer con ellos; este componente no llama a ningún service.
// errores: mensajes por campo que devolvió el service (error.errores), si los hubo.
export default function FormPago({ monto, procesando = false, errores = {}, onPagar }) {
  const [datos, setDatos] = useState(VACIO);
  const [erroresLocales, setErroresLocales] = useState({});
  const mensajes = { ...errores, ...erroresLocales };

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((actual) => ({ ...actual, [name]: value }));
  }

  function enviar(evento) {
    evento.preventDefault();
    if (procesando) return;
    const encontrados = validarPago(datos, new Date());
    setErroresLocales(encontrados);
    if (Object.keys(encontrados).length === 0) onPagar(datos);
  }

  return (
    <form noValidate onSubmit={enviar} aria-busy={procesando}>
      <p className="alert alert-info small" role="note">
        Pago simulado: no se envían datos a ningún banco.
      </p>

      <div className="row g-3">
        {CAMPOS.map((campo) => {
          const id = `pago-${campo.nombre}`;
          const error = mensajes[campo.nombre];
          const ancho = campo.nombre === "titular" || campo.nombre === "numero" ? 12 : 6;
          return (
            <div key={campo.nombre} className={`col-${ancho}`}>
              <label htmlFor={id} className="form-label">
                {campo.etiqueta}
              </label>
              <input
                id={id}
                name={campo.nombre}
                className={`form-control${error ? " is-invalid" : ""}`}
                value={datos[campo.nombre]}
                onChange={cambiar}
                autoComplete={campo.autoComplete}
                inputMode={campo.inputMode}
                placeholder={campo.placeholder}
                maxLength={campo.maxLength}
                disabled={procesando}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
              />
              {error && (
                <p id={`${id}-error`} role="alert" className="invalid-feedback d-block mb-0">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <button type="submit" className="btn btn-primary w-100 mt-4" disabled={procesando}>
        {procesando ? "Procesando pago..." : `Pagar ${formatearPrecio(monto)}`}
      </button>
    </form>
  );
}
