import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ArticuloCard from "../../components/acceso/ArticuloCard.jsx";
import { listarArticulos } from "../../services/articulosService.js";
import { listarNutricionistas } from "../../services/serviciosService.js";

export default function Consejos() {
  const [carga, setCarga] = useState(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([listarArticulos(), listarNutricionistas()]).then(([articulos, nutricionistas]) => {
      if (vigente) setCarga({ articulos, nutricionistas });
    });
    return () => {
      vigente = false;
    };
  }, []);

  function contenido() {
    if (carga === null) return <p role="status">Cargando consejos...</p>;
    const { articulos, nutricionistas } = carga;
    if (articulos.length === 0) {
      return (
        <div className="bg-white border rounded-3 p-4">
          <p>Aún no hay consejos publicados.</p>
          <Link className="btn btn-outline-primary" to="/servicios">
            Ver servicios de la clínica
          </Link>
        </div>
      );
    }
    return (
      <div className="row g-3">
        {articulos.map((articulo) => (
          <div className="col-12 col-md-6" key={articulo.id}>
            <ArticuloCard
              articulo={articulo}
              autor={nutricionistas.find((n) => n.id === articulo.autorNutricionistaId)?.nombre}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="container py-4">
      <h1>Consejos nutricionales</h1>
      <p className="text-body-secondary mb-4">
        Recomendaciones breves de las nutricionistas y los nutricionistas de NutriVida.
      </p>
      {contenido()}
    </section>
  );
}
