import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { iniciarSesion, rutaInicioPorRol } from "../../auth/auth.js";

export default function Login() {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");

  function manejarEnvio(evento) {
    evento.preventDefault();
    const resultado = iniciarSesion(correo, clave);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    navigate(rutaInicioPorRol(resultado.usuario.rol), { replace: true });
  }

  return (
    <section className="container py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-4">
          <h1 className="h3 mb-3">Iniciar sesión</h1>
          <form onSubmit={manejarEnvio} noValidate>
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
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary w-100">
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
