import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { articulosSemilla } from "../../data/semillas/articulos.js";
import { obtenerNutricionista } from "../../services/serviciosService.js";
import { formatearFechaLarga } from "../../utils/formato.js";

export default function ConsejoDetalle() {
  const { id } = useParams();
  const articulo = articulosSemilla.find((a) => a.id === id);
  const autorId = articulo?.autorNutricionistaId;
  const [autor, setAutor] = useState(null);

  useEffect(() => {
    if (!autorId) return;
    let vigente = true;
    obtenerNutricionista(autorId).then((encontrado) => {
      if (vigente) setAutor(encontrado);
    });
    return () => {
      vigente = false;
    };
  }, [autorId]);

  if (!articulo) {
    return (
      <section className="container py-5">
        <h1>Consejo no encontrado</h1>
        <p>El consejo que buscas no existe.</p>
        <Link className="btn btn-primary" to="/consejos">
          Ver todos los consejos
        </Link>
      </section>
    );
  }

  return (
    <section className="container py-4">
      <nav aria-label="Ruta de navegación">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/consejos">Consejos</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {articulo.titulo}
          </li>
        </ol>
      </nav>
      <div className="row g-4">
        <article className="col-12 col-lg-8">
          <h1>{articulo.titulo}</h1>
          <p className="small text-body-secondary">
            {autor && <span>Por {autor.nombre} · </span>}
            <time dateTime={articulo.fecha}>{formatearFechaLarga(articulo.fecha)}</time>
          </p>
          <p className="lead">{articulo.resumen}</p>
          {articulo.contenido.split("\n\n").map((parrafo) => (
            <p key={parrafo}>{parrafo}</p>
          ))}
          <Link to="/consejos">Volver a los consejos</Link>
        </article>
        {autor && (
          <aside className="col-12 col-lg-4">
            <div className="bg-white border rounded-3 p-3 p-md-4">
              <h2 className="h5">¿Quieres un plan a tu medida?</h2>
              <p className="small text-body-secondary">
                {autor.nombre} atiende {autor.especialidad.toLowerCase()}.
              </p>
              <Link
                className="btn btn-primary w-100"
                to={`/citas/solicitar?nutricionista=${autor.id}`}
              >
                Solicitar cita con {autor.nombre.split(" ")[0]}
              </Link>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
