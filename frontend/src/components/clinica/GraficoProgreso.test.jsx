import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GraficoProgreso from "./GraficoProgreso.jsx";
import { medicionesSemilla } from "../../data/semillas/fichas.js";

vi.mock("recharts", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    ResponsiveContainer: ({ children }) => (
      <original.ResponsiveContainer
        width={800}
        height={260}
        initialDimension={{ width: 800, height: 260 }}
      >
        {children}
      </original.ResponsiveContainer>
    ),
  };
});

const medicionesJaviera = medicionesSemilla.filter((medicion) => medicion.pacienteId === "U100");

function simularMovimientoReducido(reducido) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: reducido, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

describe("GraficoProgreso", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("con prefers-reduced-motion dibuja el trazo sin animar y marca el valor actual", () => {
    simularMovimientoReducido(true);
    const { container } = render(
      <GraficoProgreso mediciones={medicionesJaviera} indicador="PESO" />,
    );

    expect(container.querySelector(".recharts-line-curve")).not.toHaveAttribute("stroke-dasharray");
    expect(screen.getByTestId("valor-actual")).toHaveTextContent("72,4 kg");
    expect(
      screen.getByRole("img", {
        name: "Peso: 5 mediciones, de 78,0 kg el vie 3 jul a 72,4 kg el vie 2 oct.",
      }),
    ).toBeInTheDocument();
    expect(container.querySelector("figcaption")).toHaveTextContent(
      "Actual: 72,4 kg (vie 2 oct) · Cambio desde el vie 3 jul: -5,6 kg",
    );
  });

  it("sin esa preferencia el trazo se anima y el valor aparece al terminar", () => {
    simularMovimientoReducido(false);
    const { container } = render(
      <GraficoProgreso mediciones={medicionesJaviera} indicador="PESO" />,
    );

    expect(container.querySelector(".recharts-line-curve")).toHaveAttribute("stroke-dasharray");
    expect(screen.queryByTestId("valor-actual")).not.toBeInTheDocument();
  });

  it("con el indicador IMC grafica el IMC calculado desde peso y talla", () => {
    simularMovimientoReducido(true);
    render(<GraficoProgreso mediciones={medicionesJaviera} indicador="IMC" />);

    expect(screen.getByTestId("valor-actual")).toHaveTextContent("25,1");
    expect(
      screen.getByRole("img", {
        name: "IMC: 5 mediciones, de 27,0 el vie 3 jul a 25,1 el vie 2 oct.",
      }),
    ).toBeInTheDocument();
  });

  it("si ninguna medición tiene el indicador muestra un aviso en vez del gráfico", () => {
    const sinGrasa = medicionesJaviera.map((medicion) => ({ ...medicion, grasaPct: null }));
    const { container } = render(<GraficoProgreso mediciones={sinGrasa} indicador="GRASA" />);

    expect(screen.getByText("Tus mediciones no tienen registros de % grasa.")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });
});
