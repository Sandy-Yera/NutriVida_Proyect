import { useEffect, useRef } from "react";

export default function ConfirmarDesactivacion({
  servicio,
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
        aria-labelledby="desactivar-titulo"
        aria-describedby="desactivar-mensaje"
        tabIndex={-1}
        onKeyDown={manejarTecla}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="desactivar-titulo" className="modal-title h5">
                Desactivar servicio
              </h2>
            </div>
            <div className="modal-body">
              <p id="desactivar-mensaje" className="mb-0">
                {servicio.nombre} ({servicio.codigo}) dejará de aparecer en el catálogo y en
                Solicitar cita. Las citas ya agendadas se mantienen y puedes volver a activarlo
                cuando quieras.
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
                className="btn btn-danger"
                disabled={procesando}
                onClick={onConfirmar}
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
