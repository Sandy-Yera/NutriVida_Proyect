export default function MedidorInasistencia({ tasa }) {
  const porcentaje = Math.round(Math.min(Math.max(tasa, 0), 1) * 1000) / 10;

  return (
    <div
      className="progress medidor-inasistencia mt-2"
      role="meter"
      aria-label="Tasa de inasistencia"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={porcentaje}
    >
      <div className="progress-bar bg-danger" style={{ width: `${porcentaje}%` }} />
    </div>
  );
}
