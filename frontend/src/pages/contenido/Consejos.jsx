import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ArticuloCard from "../../components/acceso/ArticuloCard.jsx";
import { articulosSemilla } from "../../data/semillas/articulos.js";
import { listarNutricionistas } from "../../services/serviciosService.js";

const ARTICULOS = [...articulosSemilla].sort((a, b) => b.fecha.localeCompare(a.fecha));

export default function Consejos() {
  const [nutricionistas, setNutricionistas] = useState(null);

  useEffect(() => {
    let vigente = true;
    listarNutricionistas().then((lista) => {
      if (vigente) setNutricionistas(lista);
    });
    return () => {
      vigente = false;
    };
  }, []);

  function contenido() {
    if (nutricionistas === null) return <p role="status">Cargando consejos...</p>;
    if (ARTICULOS.length === 0) {
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
        {ARTICULOS.map((articulo) => (
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
