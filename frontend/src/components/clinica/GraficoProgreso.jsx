import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import CintaMetrica from "./CintaMetrica.jsx";
import { formatearFecha } from "../../utils/formato.js";
import {
  INDICADORES_PROGRESO,
  dominioCinta,
  dominioValores,
  formatearMedida,
  resumenProgreso,
  serieProgreso,
} from "../../utils/clinica.js";

const MARGEN = { top: 28, right: 12, bottom: 4, left: 0 };
const ANCHO_EJE = 44;
const ESTILO_EJE = { fill: "var(--bs-secondary-color)", fontSize: 13 };

function prefiereMenosMovimiento() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function Globo({ active, payload, indicador }) {
  if (!active || !payload?.length) return null;
  const punto = payload[0].payload;
  return (
    <div className="bg-white border rounded-2 px-2 py-1 small">
      <div className="fw-semibold fs-6">
        {formatearMedida(punto.valor, indicador, { conUnidad: true })}
      </div>
      <div className="text-body-secondary">{formatearFecha(punto.fecha)}</div>
    </div>
  );
}

function EtiquetaFinal({ x, y, index, serie, indicador }) {
  if (index !== serie.length - 1) return null;
  const bajando = serie.length > 1 && serie[index].valor < serie[index - 1].valor;
  return (
    <text
      x={x}
      y={bajando ? y + 26 : y - 14}
      textAnchor="end"
      fill="var(--nv-grafito)"
      fontSize="15"
      fontWeight="700"
      data-testid="valor-actual"
    >
      {formatearMedida(serie[index].valor, indicador, { conUnidad: true })}
    </text>
  );
}

export default function GraficoProgreso({ mediciones, indicador }) {
  const { nombre } = INDICADORES_PROGRESO[indicador];
  const serie = serieProgreso(mediciones, indicador);

  if (serie.length === 0) {
    return (
      <p className="text-body-secondary mb-0">
        Tus mediciones no tienen registros de {nombre.toLowerCase()}.
      </p>
    );
  }

  const dominio = dominioCinta(serie);
  const { inicial, actual, cambio } = resumenProgreso(serie);
  const medida = (valor) => formatearMedida(valor, indicador, { conUnidad: true });
  const tramoFinal = `${medida(actual.valor)} el ${formatearFecha(actual.fecha)}`;
  const descripcion =
    serie.length === 1
      ? `${nombre}: una medición, ${tramoFinal}.`
      : `${nombre}: ${serie.length} mediciones, de ${medida(inicial.valor)} el ${formatearFecha(inicial.fecha)} a ${tramoFinal}.`;

  return (
    <figure className="mb-0">
      <div role="img" aria-label={descripcion} style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={serie} margin={MARGEN}>
            <CartesianGrid stroke="var(--bs-border-color)" vertical={false} />
            <XAxis dataKey="dia" type="number" domain={[dominio.desde, dominio.hasta]} hide />
            <YAxis
              width={ANCHO_EJE}
              domain={dominioValores(serie.map((punto) => punto.valor))}
              allowDecimals={false}
              tickFormatter={(valor) => valor.toLocaleString("es-CL")}
              tick={ESTILO_EJE}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<Globo indicador={indicador} />} />
            <Line
              type="monotone"
              dataKey="valor"
              name={nombre}
              stroke="var(--nv-cilantro)"
              strokeWidth={3}
              dot={{ r: 4, fill: "var(--bs-white)", stroke: "var(--nv-cilantro)", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "var(--nv-cilantro)" }}
              label={<EtiquetaFinal serie={serie} indicador={indicador} />}
              isAnimationActive={!prefiereMenosMovimiento()}
              animationDuration={1200}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ paddingLeft: MARGEN.left + ANCHO_EJE, paddingRight: MARGEN.right }}>
        <CintaMetrica dominio={dominio} puntos={serie.map((punto) => punto.dia)} />
      </div>
      <figcaption className="mt-2">
        Actual: <strong>{medida(actual.valor)}</strong> ({formatearFecha(actual.fecha)})
        {serie.length > 1 && (
          <>
            {" · "}Cambio desde el {formatearFecha(inicial.fecha)}:{" "}
            <strong>
              {formatearMedida(cambio, indicador, { conUnidad: true, conSigno: true })}
            </strong>
          </>
        )}
      </figcaption>
    </figure>
  );
}
