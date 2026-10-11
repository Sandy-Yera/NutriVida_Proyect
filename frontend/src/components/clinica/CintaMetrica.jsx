import { marcasCinta } from "../../utils/clinica.js";

const ALTO_CINTA = 34;
const ALTO_TOTAL = 48;
const LARGO_MARCA = { dia: 6, semana: 11, mes: 19 };

function porcentaje(posicion) {
  return `${(posicion * 100).toFixed(3)}%`;
}

export default function CintaMetrica({ dominio, puntos = [] }) {
  const marcas = marcasCinta(dominio);
  const rango = dominio.hasta - dominio.desde;

  return (
    <svg
      className="d-block w-100 overflow-visible"
      height={ALTO_TOTAL}
      aria-hidden="true"
      focusable="false"
      data-testid="cinta-metrica"
    >
      <rect x="0" y="0" width="100%" height={ALTO_CINTA} rx="4" fill="var(--nv-miel)" />
      {marcas.map((marca) => (
        <line
          key={marca.fecha}
          data-tipo={marca.tipo}
          x1={porcentaje(marca.posicion)}
          x2={porcentaje(marca.posicion)}
          y1="0"
          y2={LARGO_MARCA[marca.tipo]}
          stroke="var(--nv-grafito)"
          strokeWidth={marca.tipo === "dia" ? 1 : 1.5}
        />
      ))}
      {marcas
        .filter((marca) => marca.etiqueta)
        .map((marca) => (
          <text
            key={`etiqueta-${marca.fecha}`}
            x={porcentaje(marca.posicion)}
            dx="4"
            y={ALTO_CINTA - 5}
            fill="var(--nv-grafito)"
            fontSize="13"
            fontWeight="700"
          >
            {marca.etiqueta}
          </text>
        ))}
      {puntos.map((dia) => (
        <circle
          key={`punto-${dia}`}
          cx={porcentaje((dia - dominio.desde) / rango)}
          cy={ALTO_CINTA + 8}
          r="4"
          fill="var(--nv-cilantro)"
        />
      ))}
    </svg>
  );
}
