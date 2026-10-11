import { Link } from "react-router-dom";
import { INFO_CLINICA } from "../../data/infoClinica.js";

const ENLACES = [
  { texto: "Servicios", ruta: "/servicios" },
  { texto: "Planes", ruta: "/planes" },
  { texto: "Nosotros", ruta: "/nosotros" },
  { texto: "Consejos", ruta: "/consejos" },
  { texto: "Contacto", ruta: "/contacto" },
];

export default function Footer() {
  const telefonoEnlace = INFO_CLINICA.telefono.replace(/\s/g, "");

  return (
    <footer className="border-top bg-white mt-auto">
      <div className="container py-4">
        <div className="row g-4">
          <div className="col-12 col-md-4">
            <p className="fw-bold mb-1">NutriVida</p>
            <p className="small text-body-secondary mb-0">
              Clínica de nutrición y dietética en Temuco desde 2016.
            </p>
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <h2 className="h6">Visítanos</h2>
            <address className="small mb-0">
              {INFO_CLINICA.direccion}
              {INFO_CLINICA.horario.map((tramo) => (
                <span key={tramo.dias} className="d-block">
                  {tramo.dias}: {tramo.horas}
                </span>
              ))}
              <span className="d-block">
                Teléfono: <a href={`tel:${telefonoEnlace}`}>{INFO_CLINICA.telefono}</a>
              </span>
              <span className="d-block">
                Correo: <a href={`mailto:${INFO_CLINICA.correo}`}>{INFO_CLINICA.correo}</a>
              </span>
            </address>
          </div>
          <nav className="col-12 col-sm-6 col-md-4" aria-label="Enlaces del pie de página">
            <h2 className="h6">Enlaces</h2>
            <ul className="list-unstyled small mb-0">
              {ENLACES.map((enlace) => (
                <li key={enlace.ruta} className="mb-1">
                  <Link to={enlace.ruta}>{enlace.texto}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="small text-body-secondary border-top pt-3 mt-4 mb-0">
          © {new Date().getFullYear()} NutriVida · Clínica de nutrición en Temuco
        </p>
      </div>
    </footer>
  );
}
