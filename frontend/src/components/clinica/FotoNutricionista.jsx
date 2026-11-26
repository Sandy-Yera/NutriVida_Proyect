import { iniciales } from "../../utils/fotos.js";

// Foto circular del nutricionista. Sin foto, muestra sus iniciales sobre el color del tema.
// "fotoUrl" permite mostrar una vista previa antes de guardarla (EditorFotoNutricionista).
// "decorativa" la oculta a los lectores de pantalla cuando el nombre ya está al lado.
export default function FotoNutricionista({ nutricionista, fotoUrl, tamano = 96, decorativa }) {
  const url = fotoUrl ?? nutricionista.fotoUrl;
  const estilo = { width: tamano, height: tamano };

  if (url) {
    return (
      <img
        src={url}
        alt={decorativa ? "" : `Foto de ${nutricionista.nombre}`}
        width={tamano}
        height={tamano}
        className="rounded-circle object-fit-cover border flex-shrink-0"
        style={estilo}
      />
    );
  }

  return (
    <span
      role={decorativa ? undefined : "img"}
      aria-label={decorativa ? undefined : `${nutricionista.nombre}, sin foto`}
      aria-hidden={decorativa || undefined}
      className="rounded-circle bg-primary-subtle text-primary-emphasis fw-bold d-inline-flex align-items-center justify-content-center flex-shrink-0"
      style={{ ...estilo, fontSize: tamano * 0.36 }}
    >
      <span aria-hidden="true">{iniciales(nutricionista.nombre)}</span>
    </span>
  );
}
