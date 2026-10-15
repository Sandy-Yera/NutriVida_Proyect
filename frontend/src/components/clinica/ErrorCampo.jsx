export default function ErrorCampo({ id, mensaje }) {
  if (!mensaje) return null;
  return (
    <div id={`${id}-error`} className="invalid-feedback" role="alert">
      {mensaje}
    </div>
  );
}
