import { useEffect, useId, useState } from "react";
import FotoNutricionista from "./FotoNutricionista.jsx";
import {
  actualizarFotoNutricionista,
  eliminarFotoNutricionista,
} from "../../services/serviciosService.js";
import { TIPOS_FOTO, validarArchivoFoto } from "../../utils/fotos.js";

// Elegir, previsualizar, guardar o quitar la foto de un nutricionista.
// Lo usan Mi perfil (el propio nutricionista) y Editar usuario (el administrador).
// Props: nutricionista (con fotoUrl) y onCambio(nutricionistaActualizado).
export default function EditorFotoNutricionista({ nutricionista, onCambio }) {
  const idCampo = useId();
  const [archivo, setArchivo] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  // Cambiar la key vacía el <input type="file"> después de guardar o quitar la foto.
  const [versionInput, setVersionInput] = useState(0);

  // La URL temporal de la vista previa se libera al cambiarla o al salir de la página.
  useEffect(() => {
    if (!vistaPrevia) return undefined;
    return () => URL.revokeObjectURL(vistaPrevia);
  }, [vistaPrevia]);

  function elegirArchivo(elegido) {
    setArchivo(elegido);
    const puedePrevisualizar = elegido && typeof URL.createObjectURL === "function";
    setVistaPrevia(puedePrevisualizar ? URL.createObjectURL(elegido) : null);
  }

  function elegir(evento) {
    const elegido = evento.target.files?.[0] ?? null;
    setMensaje("");
    const problema = validarArchivoFoto(elegido);
    setError(elegido ? problema : "");
    elegirArchivo(problema ? null : elegido);
    if (problema) evento.target.value = "";
  }

  async function ejecutar(accion, exito) {
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const actualizado = await accion();
      elegirArchivo(null);
      setVersionInput((v) => v + 1);
      setMensaje(exito);
      onCambio?.(actualizado);
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setGuardando(false);
    }
  }

  const guardar = (evento) => {
    evento.preventDefault();
    if (!archivo) {
      setError("Elige una imagen.");
      return;
    }
    ejecutar(() => actualizarFotoNutricionista(nutricionista.id, archivo), "Foto actualizada.");
  };

  const quitar = () =>
    ejecutar(() => eliminarFotoNutricionista(nutricionista.id), "Foto eliminada.");

  return (
    <form onSubmit={guardar} noValidate aria-label="Foto de perfil">
      <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-3">
        <FotoNutricionista nutricionista={nutricionista} fotoUrl={vistaPrevia} tamano={112} />
        <div className="flex-grow-1">
          <label htmlFor={idCampo} className="form-label fw-semibold">
            Elegir foto
          </label>
          <input
            key={versionInput}
            id={idCampo}
            type="file"
            accept={TIPOS_FOTO.join(",")}
            className={`form-control${error ? " is-invalid" : ""}`}
            aria-describedby={`${idCampo}-ayuda`}
            aria-invalid={Boolean(error)}
            onChange={elegir}
            disabled={guardando}
          />
          <div id={`${idCampo}-ayuda`} className="form-text">
            JPG, PNG o WebP de hasta 2 MB. Se verá en la página del equipo y al agendar.
          </div>
          {error && (
            <div className="invalid-feedback d-block" role="alert">
              {error}
            </div>
          )}
          {mensaje && (
            <div className="text-success small mt-1" role="status">
              {mensaje}
            </div>
          )}
          <div className="d-flex flex-wrap gap-2 mt-2">
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={guardando || !archivo}
            >
              Guardar foto
            </button>
            {nutricionista.fotoUrl && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={quitar}
                disabled={guardando}
              >
                Quitar foto
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
