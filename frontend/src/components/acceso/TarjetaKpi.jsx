export default function TarjetaKpi({ etiqueta, valor, detalle, icono, children }) {
  return (
    <div className="bg-white border rounded-3 p-3 h-100">
      <p className="d-flex align-items-center gap-2 text-body-secondary mb-1">
        {icono && <i className={`bi ${icono} text-primary`} aria-hidden="true" />}
        {etiqueta}
      </p>
      <p className="fs-2 fw-semibold lh-sm mb-1">{valor}</p>
      {detalle && <p className="small text-body-secondary mb-0">{detalle}</p>}
      {children}
    </div>
  );
}
