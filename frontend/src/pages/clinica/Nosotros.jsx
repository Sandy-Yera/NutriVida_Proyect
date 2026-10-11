import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TarjetaNutricionista from "../../components/clinica/TarjetaNutricionista.jsx";
import { listarNutricionistas } from "../../services/serviciosService.js";

const ENFOQUES = [
  "Pérdida de peso",
  "Control de enfermedades metabólicas",
  "Nutrición deportiva",
  "Alimentación vegetariana o vegana",
];

export default function Nosotros() {
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

  return (
    <>
      <section className="container py-4">
        <h1>Nosotros</h1>
        <div className="row g-4">
          <div className="col-12 col-lg-7">
            <p className="lead">
              NutriVida es una clínica de nutrición y dietética fundada en 2016 en Temuco, Región de
              La Araucanía.
            </p>
            <p>
              Nuestro equipo de 4 nutricionistas atiende a cerca de 60 pacientes por semana, con
              controles de seguimiento cada 15 días o cada mes. La mayoría de nuestros pacientes
              llega por derivación médica o por recomendación.
            </p>
            <p className="mb-0">
              En cada control medimos tu progreso y ajustamos tu plan alimenticio. Ahora puedes
              agendar, revisar tus mediciones y consultar tu plan desde cualquier dispositivo, sin
              llamar por teléfono.
            </p>
          </div>
          <div className="col-12 col-lg-5">
            <div className="bg-white border rounded-3 p-3 p-md-4">
              <h2 className="h5">Nuestros enfoques</h2>
              <ul className="mb-0">
                {ENFOQUES.map((enfoque) => (
                  <li key={enfoque}>{enfoque}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container pb-5" aria-labelledby="titulo-equipo">
        <h2 id="titulo-equipo" className="mb-3">
          Nuestro equipo
        </h2>
        {nutricionistas === null ? (
          <p role="status">Cargando equipo...</p>
        ) : (
          <div className="row g-3">
            {nutricionistas.map((nutricionista) => (
              <div className="col-12 col-md-6 col-xl-3" key={nutricionista.id}>
                <TarjetaNutricionista nutricionista={nutricionista} />
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 mb-0">
          ¿No sabes con quién agendar? <Link to="/servicios">Revisa nuestros servicios</Link> o{" "}
          <Link to="/contacto">escríbenos</Link>.
        </p>
      </section>
    </>
  );
}
