import { Link, useLocation } from "react-router-dom";

export default function NoEncontrada() {
  const { pathname } = useLocation();

  return (
    <section className="container py-5">
      <h1>Página no encontrada</h1>
      <p>
        No encontramos la dirección <strong className="text-break">{pathname}</strong>. Puede que no
        exista o que haya cambiado.
      </p>
      <div className="d-flex flex-wrap gap-2">
        <Link className="btn btn-primary" to="/">
          Volver al inicio
        </Link>
        <Link className="btn btn-outline-primary" to="/consejos">
          Ver consejos nutricionales
        </Link>
      </div>
    </section>
  );
}
