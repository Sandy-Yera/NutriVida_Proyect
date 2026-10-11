import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PALETA } from "../../config/paleta.js";

const ESTILO_EJE = { fill: PALETA.textoSecundario, fontSize: 13 };

function Globo({ active, payload, label, nombreValor }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-2 px-2 py-1 small">
      <div className="fw-semibold fs-6">{payload[0].value}</div>
      <div className="text-body-secondary">
        {nombreValor} · {label}
      </div>
    </div>
  );
}

export default function GraficoBarras({
  datos,
  claveEtiqueta,
  claveValor = "total",
  nombreValor = "Atenciones",
  horizontal = false,
}) {
  const alto = horizontal ? Math.max(180, datos.length * 48 + 40) : 280;

  return (
    <div style={{ width: "100%", height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={datos}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke={PALETA.grilla} vertical={horizontal} horizontal={!horizontal} />
          <XAxis
            type={horizontal ? "number" : "category"}
            dataKey={horizontal ? undefined : claveEtiqueta}
            allowDecimals={false}
            tick={ESTILO_EJE}
            tickLine={false}
            axisLine={{ stroke: PALETA.grilla }}
          />
          <YAxis
            type={horizontal ? "category" : "number"}
            dataKey={horizontal ? claveEtiqueta : undefined}
            allowDecimals={false}
            width={horizontal ? 150 : 36}
            tick={ESTILO_EJE}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: PALETA.neblina }}
            content={<Globo nombreValor={nombreValor} />}
          />
          <Bar
            dataKey={claveValor}
            name={nombreValor}
            fill={PALETA.maqui}
            maxBarSize={24}
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
