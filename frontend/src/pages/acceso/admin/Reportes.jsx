import { useEffect, useState } from "react";
import GraficoBarras from "../../../components/acceso/GraficoBarras.jsx";
import MedidorInasistencia from "../../../components/acceso/MedidorInasistencia.jsx";
import TarjetaKpi from "../../../components/acceso/TarjetaKpi.jsx";
import { estadisticas } from "../../../services/citasService.js";
import { listarNutricionistas } from "../../../services/serviciosService.js";
import {
  etiquetaSemana,
  rangoDelMes,
  rangoUltimosMeses,
  textoTasaInasistencia,
  validarRango,
} from "../../../utils/reportes.js";

const ATAJOS = [
  { id: "mes", texto: "Este mes", rango: () => rangoDelMes() },
  { id: "trimestre", texto: "Últimos 3 meses", rango: () => rangoUltimosMeses(3) },
  { id: "semestre", texto: "Últimos 6 meses", rango: () => rangoUltimosMeses(6) },
];

function TablaDatos({ titulo, columna, filas }) {
  return (
    <table className="table table-sm mt-3 mb-0">
      <caption className="visually-hidden">{titulo}</caption>
      <thead>
        <tr>
          <th scope="col">{columna}</th>
          <th scope="col" className="text-end">
            Atenciones
          </th>
        </tr>
      </thead>
      <tbody>
        {filas.map((fila) => (
          <tr key={fila.etiqueta}>
            <td>{fila.etiqueta}</td>
            <td className="text-end cifra">{fila.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Reportes() {
  const [rango, setRango] = useState(() => rangoUltimosMeses(3));
  const [datos, setDatos] = useState(null);
  const errorRango = validarRango(rango);
  const claveRango = `${rango.desde}|${rango.hasta}`;

  useEffect(() => {
    if (validarRango({ desde: rango.desde, hasta: rango.hasta })) return;
    let vigente = true;
    Promise.all([estadisticas(rango.desde, rango.hasta), listarNutricionistas()]).then(
      ([resultado, nutricionistas]) => {
        if (vigente) {
          setDatos({ clave: `${rango.desde}|${rango.hasta}`, resultado, nutricionistas });
        }
      },
    );
    return () => {
      vigente = false;
    };
  }, [rango.desde, rango.hasta]);

  function cambiarFecha(evento) {
    setRango((anterior) => ({ ...anterior, [evento.target.name]: evento.target.value }));
  }

  function contenido() {
    if (datos === null) return <p role="status">Cargando reportes...</p>;
    const { resultado, nutricionistas } = datos;
    if (resultado.total === 0) {
      return (
        <div className="bg-white border rounded-3 p-4">
          <p className="fw-semibold mb-1">Sin datos en este período</p>
          <p className="text-body-secondary">Prueba con un rango de fechas más amplio.</p>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => setRango(rangoUltimosMeses(6))}
          >
            Ver últimos 6 meses
          </button>
        </div>
      );
    }
    const porSemana = resultado.porSemana.map((fila) => ({
      etiqueta: etiquetaSemana(fila.semana),
      total: fila.total,
    }));
    const porNutricionista = resultado.porNutricionista.map((fila) => ({
      etiqueta:
        nutricionistas.find((n) => n.id === fila.nutricionistaId)?.nombre ?? fila.nutricionistaId,
      total: fila.total,
    }));

    return (
      <div className={datos.clave === claveRango ? "" : "opacity-50"}>
        <div className="row g-3 mb-3">
          <div className="col-6 col-lg-3">
            <TarjetaKpi etiqueta="Citas del período" valor={resultado.total} />
          </div>
          <div className="col-6 col-lg-3">
            <TarjetaKpi etiqueta="Atendidas" valor={resultado.atendidas} />
          </div>
          <div className="col-6 col-lg-3">
            <TarjetaKpi etiqueta="Inasistencias" valor={resultado.inasistencias} />
          </div>
          <div className="col-6 col-lg-3">
            <TarjetaKpi
              etiqueta="Tasa de inasistencia"
              valor={textoTasaInasistencia(resultado)}
              detalle="Inasistencias / (atendidas + inasistencias)"
            >
              {resultado.atendidas + resultado.inasistencias > 0 && (
                <MedidorInasistencia tasa={resultado.tasaInasistencia} />
              )}
            </TarjetaKpi>
          </div>
        </div>
        <div className="row g-3">
          <div className="col-12 col-xl-7">
            <figure className="bg-white border rounded-3 p-3 h-100 mb-0">
              <figcaption className="h6 mb-3">Atenciones por semana</figcaption>
              <GraficoBarras datos={porSemana} claveEtiqueta="etiqueta" />
              <TablaDatos titulo="Atenciones por semana" columna="Semana" filas={porSemana} />
            </figure>
          </div>
          <div className="col-12 col-xl-5">
            <figure className="bg-white border rounded-3 p-3 h-100 mb-0">
              <figcaption className="h6 mb-3">Atenciones por nutricionista</figcaption>
              <GraficoBarras datos={porNutricionista} claveEtiqueta="etiqueta" horizontal />
              <TablaDatos
                titulo="Atenciones por nutricionista"
                columna="Nutricionista"
                filas={porNutricionista}
              />
            </figure>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section>
      <h1 className="mb-3">Reportes</h1>
      <div className="d-flex flex-wrap align-items-end gap-3 mb-3">
        <div className="btn-group flex-wrap" role="group" aria-label="Períodos frecuentes">
          {ATAJOS.map((atajo) => {
            const valor = atajo.rango();
            const activo = valor.desde === rango.desde && valor.hasta === rango.hasta;
            return (
              <button
                key={atajo.id}
                type="button"
                className={`btn btn-sm ${activo ? "btn-primary" : "btn-outline-primary"}`}
                aria-pressed={activo}
                onClick={() => setRango(valor)}
              >
                {atajo.texto}
              </button>
            );
          })}
        </div>
        <div>
          <label htmlFor="desde" className="form-label small mb-1">
            Desde
          </label>
          <input
            id="desde"
            name="desde"
            type="date"
            className="form-control form-control-sm"
            value={rango.desde}
            onChange={cambiarFecha}
          />
        </div>
        <div>
          <label htmlFor="hasta" className="form-label small mb-1">
            Hasta
          </label>
          <input
            id="hasta"
            name="hasta"
            type="date"
            className="form-control form-control-sm"
            value={rango.hasta}
            onChange={cambiarFecha}
          />
        </div>
      </div>
      {errorRango ? (
        <div className="alert alert-danger" role="alert">
          {errorRango}
        </div>
      ) : (
        contenido()
      )}
    </section>
  );
}
