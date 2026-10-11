import { useEffect, useRef } from "react";

export default function DialogoConfirmacion({
  titulo,
  mensaje,
  textoConfirmar = "Confirmar",
  variante = "primary",
  procesando = false,
  onConfirmar,
  onCancelar,
}) {
  const botonCancelar = useRef(null);

  useEffect(() => {
    botonCancelar.current?.focus();
  }, []);

  function manejarTecla(evento) {
    if (evento.key === "Escape" && !procesando) onCancelar();
  }

  return (
    <>
      <div
        className="modal d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        aria-describedby="dialogo-mensaje"
        tabIndex={-1}
        onKeyDown={manejarTecla}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="dialogo-titulo" className="modal-title h5">
                {titulo}
              </h2>
            </div>
            <div className="modal-body">
              <p id="dialogo-mensaje" className="mb-0">
                {mensaje}
              </p>
            </div>
            <div className="modal-footer">
              <button
                ref={botonCancelar}
                type="button"
                className="btn btn-outline-secondary"
                disabled={procesando}
                onClick={onCancelar}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`btn btn-${variante}`}
                disabled={procesando}
                onClick={onConfirmar}
              >
                {textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
