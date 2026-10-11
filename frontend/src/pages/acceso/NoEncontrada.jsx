import { Link } from "react-router-dom";

export default function NoEncontrada() {
  return (
    <section className="container py-5">
      <h1>Página no encontrada</h1>
      <p>La dirección que buscas no existe o fue movida.</p>
      <Link className="btn btn-primary" to="/">
        Volver al inicio
      </Link>
    </section>
  );
}
