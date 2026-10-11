import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TarjetaKpi from "../../../components/acceso/TarjetaKpi.jsx";
import { menuAdmin } from "../../../config/menu.js";
import { estadisticas, listarCitas } from "../../../services/citasService.js";
import { listarUsuarios } from "../../../services/usuariosService.js";
import { pluralizar } from "../../../utils/formato.js";
import { rangoDelMes, textoTasaInasistencia } from "../../../utils/reportes.js";

export default function Dashboard() {
  const [resumen, setResumen] = useState(null);
  const mes = new Date().toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  useEffect(() => {
    let vigente = true;
    const { desde, hasta } = rangoDelMes();
    Promise.all([
      estadisticas(desde, hasta),
      listarUsuarios({ rol: "PACIENTE", activo: true }),
      listarCitas({ estado: "PENDIENTE" }),
    ]).then(([delMes, pacientes, pendientes]) => {
      if (vigente) {
        setResumen({ delMes, pacientes: pacientes.length, pendientes: pendientes.length });
      }
    });
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <section>
      <h1 className="mb-1">Panel de administración</h1>
      <p className="text-body-secondary mb-4">Resumen de {mes}</p>
      {resumen === null ? (
        <p role="status">Cargando resumen...</p>
      ) : (
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-xl-3">
            <TarjetaKpi
              etiqueta="Citas del mes"
              icono="bi-calendar3"
              valor={resumen.delMes.total}
              detalle={pluralizar(resumen.delMes.atendidas, "atendida", "atendidas")}
            />
          </div>
          <div className="col-12 col-sm-6 col-xl-3">
            <TarjetaKpi
              etiqueta="Inasistencia del mes"
              icono="bi-person-x"
              valor={textoTasaInasistencia(resumen.delMes)}
              detalle={pluralizar(
                resumen.delMes.inasistencias,
                "cita sin asistir",
                "citas sin asistir",
              )}
            />
          </div>
          <div className="col-12 col-sm-6 col-xl-3">
            <TarjetaKpi
              etiqueta="Pacientes activos"
              icono="bi-people"
              valor={resumen.pacientes}
              detalle="Con cuenta habilitada"
            />
          </div>
          <div className="col-12 col-sm-6 col-xl-3">
            <TarjetaKpi
              etiqueta="Citas por confirmar"
              icono="bi-hourglass-split"
              valor={resumen.pendientes}
              detalle="En estado pendiente"
            />
          </div>
        </div>
      )}
      <h2 className="h4 mb-3">Accesos</h2>
      <div className="row g-3">
        {menuAdmin
          .filter((item) => item.descripcion)
          .map((item) => (
            <div className="col-12 col-md-6" key={item.ruta}>
              <Link
                className="d-flex gap-3 align-items-start bg-white border rounded-3 p-3 h-100 text-decoration-none text-body"
                to={item.ruta}
              >
                <i className={`bi ${item.icono} fs-4 text-primary`} aria-hidden="true" />
                <span>
                  <span className="d-block fw-semibold text-primary">{item.texto}</span>
                  <span className="small text-body-secondary">{item.descripcion}</span>
                </span>
              </Link>
            </div>
          ))}
      </div>
    </section>
  );
}
