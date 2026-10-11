import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CampoTexto from "../../components/acceso/CampoTexto.jsx";
import { iniciarSesion } from "../../auth/auth.js";
import { registrarPaciente } from "../../services/usuariosService.js";
import { formatearRut, formatearTelefono } from "../../utils/formato.js";
import { validarRegistro } from "../../utils/validaciones.js";

const DATOS_INICIALES = {
  nombre: "",
  apellido: "",
  rut: "",
  correo: "",
  telefono: "",
  fechaNacimiento: "",
  clave: "",
  confirmacion: "",
  acepta: false,
};

export default function Registro() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(DATOS_INICIALES);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const hoy = new Date().toLocaleDateString("sv-SE");

  function cambiar(evento) {
    const { name, value, type, checked } = evento.target;
    setDatos((previos) => ({ ...previos, [name]: type === "checkbox" ? checked : value }));
    setErrores((previos) => ({ ...previos, [name]: "" }));
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setErrorGeneral("");
    const nuevosErrores = validarRegistro(datos);
    setErrores(nuevosErrores);
    const primerCampoConError = Object.keys(nuevosErrores)[0];
    if (primerCampoConError) {
      document.getElementById(primerCampoConError)?.focus();
      return;
    }
    setEnviando(true);
    try {
      await registrarPaciente({
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        rut: formatearRut(datos.rut),
        correo: datos.correo,
        telefono: formatearTelefono(datos.telefono),
        fechaNacimiento: datos.fechaNacimiento,
        clave: datos.clave,
      });
      iniciarSesion(datos.correo, datos.clave);
      navigate("/mis-citas", {
        replace: true,
        state: { mensaje: "Cuenta creada. Ya puedes solicitar tu primera cita.", tipo: "exito" },
      });
    } catch (error) {
      if (error.campo) {
        setErrores({ [error.campo]: error.message });
        document.getElementById(error.campo)?.focus();
      } else {
        setErrorGeneral("No pudimos crear tu cuenta. Inténtalo de nuevo.");
      }
      setEnviando(false);
    }
  }

  return (
    <section className="container py-4 py-md-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-9 col-xl-7">
          <h1 className="h3 mb-2">Crear cuenta de paciente</h1>
          <p className="text-body-secondary">
            Con tu cuenta podrás solicitar, cancelar y reprogramar citas, y ver tu progreso.
          </p>
          <form className="bg-white border rounded-3 p-3 p-md-4" onSubmit={manejarEnvio} noValidate>
            <div className="row g-3">
              <CampoTexto
                id="nombre"
                etiqueta="Nombre"
                className="col-12 col-md-6"
                autoComplete="given-name"
                value={datos.nombre}
                onChange={cambiar}
                error={errores.nombre}
              />
              <CampoTexto
                id="apellido"
                etiqueta="Apellido"
                className="col-12 col-md-6"
                autoComplete="family-name"
                value={datos.apellido}
                onChange={cambiar}
                error={errores.apellido}
              />
              <CampoTexto
                id="rut"
                etiqueta="RUT"
                className="col-12 col-md-6"
                placeholder="12.345.678-5"
                ayuda="Con o sin puntos y guion."
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
                autoComplete="tel"
                value={datos.telefono}
                onChange={cambiar}
                error={errores.telefono}
              />
              <CampoTexto
                id="correo"
                etiqueta="Correo"
                type="email"
                className="col-12 col-md-6"
                autoComplete="email"
                value={datos.correo}
                onChange={cambiar}
                error={errores.correo}
              />
              <CampoTexto
                id="fechaNacimiento"
                etiqueta="Fecha de nacimiento"
                type="date"
                className="col-12 col-md-6"
                max={hoy}
                autoComplete="bday"
                value={datos.fechaNacimiento}
                onChange={cambiar}
                error={errores.fechaNacimiento}
              />
              <CampoTexto
                id="clave"
                etiqueta="Contraseña"
                type="password"
                className="col-12 col-md-6"
                autoComplete="new-password"
                ayuda="Mínimo 8 caracteres, con al menos una mayúscula y un número."
                value={datos.clave}
                onChange={cambiar}
                error={errores.clave}
              />
              <CampoTexto
                id="confirmacion"
                etiqueta="Repite la contraseña"
                type="password"
                className="col-12 col-md-6"
                autoComplete="new-password"
                value={datos.confirmacion}
                onChange={cambiar}
                error={errores.confirmacion}
              />
              <div className="col-12">
                <div className="form-check">
                  <input
                    id="acepta"
                    name="acepta"
                    type="checkbox"
                    className={`form-check-input${errores.acepta ? " is-invalid" : ""}`}
                    aria-invalid={Boolean(errores.acepta)}
                    aria-describedby={errores.acepta ? "acepta-error" : undefined}
                    checked={datos.acepta}
                    onChange={cambiar}
                  />
                  <label htmlFor="acepta" className="form-check-label">
                    Acepto que NutriVida trate mis datos de salud solo para mi atención nutricional.
                  </label>
                  {errores.acepta && (
                    <div id="acepta-error" className="invalid-feedback" role="alert">
                      {errores.acepta}
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
              <div className="col-12">
                <button type="submit" className="btn btn-primary w-100" disabled={enviando}>
                  {enviando ? "Creando cuenta..." : "Crear cuenta"}
                </button>
              </div>
            </div>
          </form>
          <p className="mt-3 mb-0">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
