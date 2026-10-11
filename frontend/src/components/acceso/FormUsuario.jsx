import { useState } from "react";
import CampoSelect from "./CampoSelect.jsx";
import CampoTexto from "./CampoTexto.jsx";
import { NOMBRE_ROL, ROLES } from "../../config/roles.js";
import { formatearRut, formatearTelefono } from "../../utils/formato.js";
import { validarUsuario } from "../../utils/validaciones.js";

function datosIniciales(usuario) {
  return {
    nombre: usuario?.nombre ?? "",
    apellido: usuario?.apellido ?? "",
    rut: usuario?.rut ?? "",
    correo: usuario?.correo ?? "",
    telefono: usuario?.telefono ?? "",
    rol: usuario?.rol ?? "",
    nutricionistaId: usuario?.nutricionistaId ?? "",
    activo: usuario?.activo ?? true,
    clave: "",
  };
}

function prepararDatos(datos, esNuevo) {
  const preparados = {
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    rut: formatearRut(datos.rut),
    correo: datos.correo.trim(),
    telefono: formatearTelefono(datos.telefono),
    rol: datos.rol,
    nutricionistaId: datos.rol === "NUTRICIONISTA" ? datos.nutricionistaId : null,
    activo: datos.activo,
  };
  if (esNuevo) preparados.clave = datos.clave;
  return preparados;
}

export default function FormUsuario({
  usuarioInicial = null,
  nutricionistas = [],
  esCuentaPropia = false,
  onGuardar,
  onCancelar,
}) {
  const esNuevo = usuarioInicial === null;
  const [datos, setDatos] = useState(() => datosIniciales(usuarioInicial));
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  function cambiar(evento) {
    const { name, value, type, checked } = evento.target;
    setDatos((previos) => ({ ...previos, [name]: type === "checkbox" ? checked : value }));
    setErrores((previos) => ({ ...previos, [name]: "" }));
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setErrorGeneral("");
    const nuevosErrores = validarUsuario(datos, { esNuevo });
    setErrores(nuevosErrores);
    const primerCampoConError = Object.keys(nuevosErrores)[0];
    if (primerCampoConError) {
      document.getElementById(primerCampoConError)?.focus();
      return;
    }
    setGuardando(true);
    try {
      await onGuardar(prepararDatos(datos, esNuevo));
    } catch (error) {
      if (error.campo) {
        setErrores({ [error.campo]: error.message });
      } else {
        setErrorGeneral(error.message);
      }
      setGuardando(false);
    }
  }

  return (
    <form className="bg-white border rounded-3 p-3 p-md-4" onSubmit={manejarEnvio} noValidate>
      <div className="row g-3">
        <CampoTexto
          id="nombre"
          etiqueta="Nombre"
          className="col-12 col-md-6"
          value={datos.nombre}
          onChange={cambiar}
          error={errores.nombre}
        />
        <CampoTexto
          id="apellido"
          etiqueta="Apellido"
          className="col-12 col-md-6"
          value={datos.apellido}
          onChange={cambiar}
          error={errores.apellido}
        />
        <CampoTexto
          id="rut"
          etiqueta="RUT"
          className="col-12 col-md-6"
          placeholder="12.345.678-5"
          value={datos.rut}
          onChange={cambiar}
          error={errores.rut}
        />
        <CampoTexto
          id="telefono"
          etiqueta="Teléfono celular"
          type="tel"
          className="col-12 col-md-6"
          placeholder="+56 9 1234 5678"
          value={datos.telefono}
          onChange={cambiar}
          error={errores.telefono}
        />
        <CampoTexto
          id="correo"
          etiqueta="Correo"
          type="email"
          className="col-12 col-md-6"
          value={datos.correo}
          onChange={cambiar}
          error={errores.correo}
        />
        <CampoSelect
          id="rol"
          etiqueta="Rol"
          className="col-12 col-md-6"
          value={datos.rol}
          onChange={cambiar}
          disabled={esCuentaPropia}
          ayuda={esCuentaPropia ? "No puedes cambiar tu propio rol." : undefined}
          error={errores.rol}
        >
          <option value="">Selecciona un rol</option>
          {ROLES.map((rol) => (
            <option key={rol} value={rol}>
              {NOMBRE_ROL[rol]}
            </option>
          ))}
        </CampoSelect>
        {datos.rol === "NUTRICIONISTA" && (
          <CampoSelect
            id="nutricionistaId"
            etiqueta="Nutricionista vinculado"
            value={datos.nutricionistaId}
            onChange={cambiar}
            ayuda="Cada nutricionista de la clínica se vincula a un solo usuario."
            error={errores.nutricionistaId}
          >
            <option value="">Selecciona un nutricionista</option>
            {nutricionistas.map((nutricionista) => (
              <option
                key={nutricionista.id}
                value={nutricionista.id}
                disabled={Boolean(nutricionista.vinculadoA)}
              >
                {nutricionista.nombre} · {nutricionista.especialidad}
                {nutricionista.vinculadoA ? ` (vinculado a ${nutricionista.vinculadoA})` : ""}
              </option>
            ))}
          </CampoSelect>
        )}
        {esNuevo && (
          <CampoTexto
            id="clave"
            etiqueta="Clave temporal"
            className="col-12 col-md-6"
            autoComplete="new-password"
            ayuda="Mínimo 8 caracteres, con una mayúscula y un número. El usuario podrá cambiarla en Mi perfil."
            value={datos.clave}
            onChange={cambiar}
            error={errores.clave}
          />
        )}
        <div className="col-12">
          <div className="form-check">
            <input
              id="activo"
              name="activo"
              type="checkbox"
              className={`form-check-input${errores.activo ? " is-invalid" : ""}`}
              checked={datos.activo}
              disabled={esCuentaPropia}
              aria-describedby={errores.activo ? "activo-error" : undefined}
              onChange={cambiar}
            />
            <label htmlFor="activo" className="form-check-label">
              Cuenta activa (puede iniciar sesión)
            </label>
            {errores.activo && (
              <div id="activo-error" className="invalid-feedback" role="alert">
                {errores.activo}
              </div>
            )}
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
            {esNuevo ? "Crear usuario" : "Guardar cambios"}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}
