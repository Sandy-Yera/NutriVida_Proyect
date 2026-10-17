import { useEffect, useState } from "react";
import FiltroCitas from "../../../components/citas/FiltroCitas.jsx";
import TablaCitasAdmin from "../../../components/citas/TablaCitasAdmin.jsx";
import { listarCitas } from "../../../services/citasService.js";
import { listarPagos } from "../../../services/pagosService.js";
import { listarNutricionistas, listarServicios } from "../../../services/serviciosService.js";
import { listarUsuarios } from "../../../services/usuariosService.js";
import { formatearPrecio, pluralizar } from "../../../utils/formato.js";
import { totalRecaudado } from "../../../utils/pagos.js";
import { validarRango } from "../../../utils/reportes.js";

const FILTROS_INICIALES = { estado: "", nutricionistaId: "", desde: "", hasta: "" };

// S-08 (RN-27): todas las citas con filtros por estado, nutricionista y rango de fechas,
// y el total recaudado de las citas filtradas. Cada cita abre su detalle con el comprobante.
export default function AdminCitas() {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [base, setBase] = useState(null);
  const [resultado, setResultado] = useState(null);

  // Las fechas son opcionales; si están las dos, la de inicio no puede ser posterior.
  const errorRango =
    filtros.desde && filtros.hasta
      ? validarRango({ desde: filtros.desde, hasta: filtros.hasta })
      : "";

  useEffect(() => {
    let vigente = true;
    Promise.all([
      listarNutricionistas(),
      listarServicios({ soloActivos: false }),
      listarUsuarios({ rol: "PACIENTE" }),
    ]).then(([nutricionistas, servicios, pacientes]) => {
      if (!vigente) return;
      const nombres = Object.fromEntries(
        pacientes.map((p) => [p.id, `${p.nombre} ${p.apellido}`.trim()]),
      );
      setBase({ nutricionistas, servicios, nombres });
    });
    return () => {
      vigente = false;
    };
  }, []);

  // El filtro lo aplica el service (listarCitas); los pagos se piden solo de esas citas.
  useEffect(() => {
    if (errorRango) return undefined;
    let vigente = true;
    const consulta = {
      estado: filtros.estado || undefined,
      nutricionistaId: filtros.nutricionistaId || undefined,
      desde: filtros.desde || undefined,
      hasta: filtros.hasta || undefined,
    };
    listarCitas(consulta).then(async (citas) => {
      const pagos = await listarPagos({ citaIds: citas.map((c) => c.id) });
      if (vigente) setResultado({ filtros, citas: [...citas].reverse(), pagos });
    });
    return () => {
      vigente = false;
    };
  }, [filtros, errorRango]);

  if (!base) {
    return (
      <section>
        <h1>Citas</h1>
        <p role="status">Cargando las citas...</p>
      </section>
    );
  }

  const listo = resultado?.filtros === filtros && !errorRango;
  const filas = listo
    ? resultado.citas.map((cita) => ({
        cita,
        paciente: base.nombres[cita.pacienteId] ?? cita.pacienteId,
        nutricionista: base.nutricionistas.find((n) => n.id === cita.nutricionistaId)?.nombre,
        servicio: base.servicios.find((s) => s.codigo === cita.servicioCodigo)?.nombre,
        pago: resultado.pagos.find((p) => p.id === cita.pagoId) ?? null,
      }))
    : [];
  const hayFiltros = Object.values(filtros).some(Boolean);

  return (
    <section>
      <h1>Citas</h1>

      <FiltroCitas filtros={filtros} nutricionistas={base.nutricionistas} onCambiar={setFiltros} />
      {hayFiltros && (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary mb-3"
          onClick={() => setFiltros(FILTROS_INICIALES)}
        >
          Limpiar filtros
        </button>
      )}

      {errorRango && (
        <p role="alert" className="text-danger">
          {errorRango}
        </p>
      )}

      {!errorRango && !listo && <p role="status">Cargando las citas...</p>}

      {listo && (
        <>
          <div className="d-flex flex-wrap gap-4 mb-3" aria-live="polite">
            <p className="mb-0">
              <strong className="cifra">{pluralizar(filas.length, "cita", "citas")}</strong>
            </p>
            <p className="mb-0">
              Total recaudado:{" "}
              <strong className="cifra">{formatearPrecio(totalRecaudado(resultado.pagos))}</strong>{" "}
              <span className="small text-body-secondary">(solo pagos aprobados)</span>
            </p>
          </div>

          {filas.length === 0 ? (
            <p>No hay citas que coincidan con los filtros.</p>
          ) : (
            <TablaCitasAdmin filas={filas} />
          )}
        </>
      )}
    </section>
  );
}
