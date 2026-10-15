export default function CampoTexto({
  id,
  etiqueta,
  error,
  ayuda,
  className = "col-12",
  ...propsInput
}) {
  const idAyuda = ayuda ? `${id}-ayuda` : null;
  const idError = error ? `${id}-error` : null;
  const descritoPor = [idAyuda, idError].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="form-label">
        {etiqueta}
      </label>
      <input
        id={id}
        name={id}
        className={`form-control${error ? " is-invalid" : ""}`}
        aria-invalid={Boolean(error)}
        aria-describedby={descritoPor}
        {...propsInput}
      />
      {ayuda && (
        <div id={idAyuda} className="form-text">
          {ayuda}
        </div>
      )}
      {error && (
        <div id={idError} className="invalid-feedback" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
