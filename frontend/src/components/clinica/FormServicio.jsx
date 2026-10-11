import { useState } from "react";
import { Link } from "react-router-dom";
import ErrorCampo from "./ErrorCampo.jsx";
import {
  MODALIDADES_SERVICIO,
  TIPO_SERVICIO_SINGULAR,
  validarServicio,
} from "../../utils/clinica.js";

function datosIniciales(servicio) {
  return {
    codigo: servicio?.codigo ?? "",
    tipo: servicio?.tipo ?? "",
    nombre: servicio?.nombre ?? "",
    duracionMin: servicio?.duracionMin ? String(servicio.duracionMin) : "",
    modalidad: servicio?.modalidad ?? "",
    precio: servicio ? String(servicio.precio) : "",
    descripcion: servicio?.descripcion ?? "",
    destacado: servicio?.destacado ?? false,
    cupoMax: servicio?.cupoMax ? String(servicio.cupoMax) : "",
    activo: servicio?.activo ?? true,
  };
}

export default function FormServicio({ servicio, onGuardar }) {
  const esNuevo = !servicio;
  const [datos, setDatos] = useState(() => datosIniciales(servicio));
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  function cambiar(evento) {
    const { name, value, type, checked } = evento.target;
    setDatos((previos) => ({ ...previos, [name]: type === "checkbox" ? checked : value }));
    setErrores((previos) => ({ ...previos, [name]: "" }));
    setErrorGeneral("");
  }

  function propsCampo(campo) {
    return {
      id: `servicio-${campo}`,
      name: campo,
      value: datos[campo],
      onChange: cambiar,
      "aria-invalid": Boolean(errores[campo]),
      "aria-describedby": errores[campo] ? `servicio-${campo}-error` : undefined,
    };
  }

  const clase = (base, campo) => `${base}${errores[campo] ? " is-invalid" : ""}`;

  async function manejarEnvio(evento) {
    evento.preventDefault();
    const nuevosErrores = validarServicio(datos, { esNuevo });
    setErrores(nuevosErrores);
    const primerCampoConError = Object.keys(nuevosErrores)[0];
    if (primerCampoConError) {
      document.getElementById(`servicio-${primerCampoConError}`)?.focus();
      return;
    }
    setGuardando(true);
    try {
      await onGuardar({
        ...(esNuevo && { codigo: datos.codigo.trim().toUpperCase() }),
        tipo: datos.tipo,
        nombre: datos.nombre.trim(),
        duracionMin: datos.tipo === "PLAN" ? null : Number(datos.duracionMin),
        modalidad: datos.modalidad,
        precio: Number(datos.precio),
        descripcion: datos.descripcion.trim(),
        destacado: datos.destacado,
        cupoMax: datos.tipo === "TALLER" ? Number(datos.cupoMax) : null,
        activo: datos.activo,
      });
    } catch (error) {
      if (error.campo) {
        setErrores({ [error.campo]: error.message });
        document.getElementById(`servicio-${error.campo}`)?.focus();
      } else {
        setErrorGeneral(error.message);
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} noValidate>
      <div className="row g-3">
        <div className="col-12 col-sm-4 col-xl-3">
          <label htmlFor="servicio-codigo" className="form-label">
            Código
          </label>
          <input
            className={clase("form-control text-uppercase", "codigo")}
            placeholder="CN006"
            maxLength={5}
            readOnly={!esNuevo}
            {...propsCampo("codigo")}
          />
          {esNuevo ? (
            <ErrorCampo id="servicio-codigo" mensaje={errores.codigo} />
          ) : (
            <div className="form-text">El código no se puede cambiar.</div>
          )}
        </div>
        <div className="col-12 col-sm-8 col-xl-4">
          <label htmlFor="servicio-tipo" className="form-label">
            Tipo
          </label>
          <select className={clase("form-select", "tipo")} {...propsCampo("tipo")}>
            <option value="">Elige un tipo</option>
            {Object.entries(TIPO_SERVICIO_SINGULAR).map(([clave, nombre]) => (
              <option key={clave} value={clave}>
                {nombre}
              </option>
            ))}
          </select>
          <ErrorCampo id="servicio-tipo" mensaje={errores.tipo} />
        </div>
        <div className="col-12 col-xl-5">
          <label htmlFor="servicio-nombre" className="form-label">
            Nombre
          </label>
          <input
            className={clase("form-control", "nombre")}
            maxLength={80}
            {...propsCampo("nombre")}
          />
          <ErrorCampo id="servicio-nombre" mensaje={errores.nombre} />
        </div>
        <div className="col-12 col-sm-4">
          <label htmlFor="servicio-duracionMin" className="form-label">
            Duración (min)
          </label>
          {datos.tipo === "PLAN" ? (
            <>
              <input id="servicio-duracionMin" className="form-control" value="" disabled />
              <div className="form-text">Los planes no tienen duración por sesión.</div>
            </>
          ) : (
            <>
              <input
                type="number"
                inputMode="numeric"
                className={clase("form-control", "duracionMin")}
                {...propsCampo("duracionMin")}
              />
              <ErrorCampo id="servicio-duracionMin" mensaje={errores.duracionMin} />
            </>
          )}
        </div>
        <div className="col-12 col-sm-4">
          <label htmlFor="servicio-modalidad" className="form-label">
            Modalidad
          </label>
          <select className={clase("form-select", "modalidad")} {...propsCampo("modalidad")}>
            <option value="">Elige una modalidad</option>
            {MODALIDADES_SERVICIO.map((modalidad) => (
              <option key={modalidad} value={modalidad}>
                {modalidad}
              </option>
            ))}
          </select>
          <ErrorCampo id="servicio-modalidad" mensaje={errores.modalidad} />
        </div>
        <div className="col-12 col-sm-4">
          <label htmlFor="servicio-precio" className="form-label">
            Precio (CLP)
          </label>
          <input
            type="number"
            inputMode="numeric"
            className={clase("form-control", "precio")}
            {...propsCampo("precio")}
          />
          <ErrorCampo id="servicio-precio" mensaje={errores.precio} />
        </div>
        {datos.tipo === "TALLER" && (
          <div className="col-12 col-sm-4">
            <label htmlFor="servicio-cupoMax" className="form-label">
              Cupo máximo
            </label>
            <input
              type="number"
              inputMode="numeric"
              className={clase("form-control", "cupoMax")}
              {...propsCampo("cupoMax")}
            />
            <ErrorCampo id="servicio-cupoMax" mensaje={errores.cupoMax} />
          </div>
        )}
        <div className="col-12">
          <label htmlFor="servicio-descripcion" className="form-label">
            Descripción
          </label>
          <textarea
            className={clase("form-control", "descripcion")}
            rows={3}
            maxLength={300}
            {...propsCampo("descripcion")}
          />
          <div className="form-text">{datos.descripcion.length} de 300 caracteres (mínimo 10).</div>
          <ErrorCampo id="servicio-descripcion" mensaje={errores.descripcion} />
        </div>
        <div className="col-12 d-flex flex-wrap gap-4">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="servicio-destacado"
              name="destacado"
              checked={datos.destacado}
              onChange={cambiar}
            />
            <label htmlFor="servicio-destacado" className="form-check-label">
              Destacado
            </label>
          </div>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="servicio-activo"
              name="activo"
              checked={datos.activo}
              onChange={cambiar}
            />
            <label htmlFor="servicio-activo" className="form-check-label">
              Activo (visible en el catálogo y en Solicitar cita)
            </label>
          </div>
        </div>
        {errorGeneral && (
          <div className="col-12">
            <div className="alert alert-danger py-2 mb-0" role="alert">
              {errorGeneral}
            </div>
          </div>
        )}
        <div className="col-12 d-flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            {esNuevo ? "Crear servicio" : "Guardar cambios"}
          </button>
          <Link to="/admin/servicios" className="btn btn-outline-secondary">
            Cancelar
          </Link>
        </div>
      </div>
    </form>
  );
}
