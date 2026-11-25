import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { iniciarSesion, ingresar, rutaInicioPorRol } from "../../auth/auth.js";
import { usarApi } from "../../services/http.js";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const desde = location.state?.desde;
  // Mensaje de SesionExpirada o RutaProtegida cuando el token venció (401).
  const aviso = location.state?.aviso;

  function terminar(resultado) {
    if (!resultado.ok) {
      setError(resultado.error);
      setEnviando(false);
      return;
    }
    navigate(desde ?? rutaInicioPorRol(resultado.usuario.rol), { replace: true });
  }

  function manejarEnvio(evento) {
    evento.preventDefault();
    if (correo.trim() === "" || clave === "") {
      setError("Debe completar correo y contraseña.");
      return;
    }
    // Modo local: el login de EP2, síncrono. Modo API: POST /api/auth/login (G-32).
    if (!usarApi()) {
      terminar(iniciarSesion(correo, clave));
      return;
    }
    setEnviando(true);
    ingresar(correo, clave).then(terminar);
  }

  return (
    <section className="container py-4 py-md-5">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-6 col-lg-5 col-xl-4">
          <h1 className="h3 mb-2">Iniciar sesión</h1>
          {aviso && (
            <div className="alert alert-warning py-2" role="status">
              {aviso}
            </div>
          )}
          {desde && !aviso && (
            <p className="text-body-secondary">
              Inicia sesión para continuar con lo que estabas haciendo.
            </p>
          )}
          <form className="bg-white border rounded-3 p-3 p-md-4" onSubmit={manejarEnvio} noValidate>
            <div className="mb-3">
              <label htmlFor="correo" className="form-label">
                Correo
              </label>
              <input
                id="correo"
                type="email"
                className="form-control"
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="clave" className="form-label">
                Contraseña
              </label>
              <input
                id="clave"
                type="password"
                className="form-control"
                autoComplete="current-password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
              />
            </div>
            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary w-100" disabled={enviando}>
              {enviando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
          <p className="mt-3 mb-0">
            ¿No tienes cuenta? <Link to="/registro">Regístrate como paciente</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
