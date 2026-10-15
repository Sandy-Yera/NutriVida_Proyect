import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CintaMetrica from "./CintaMetrica.jsx";
import { diaDesdeFecha } from "../../utils/clinica.js";

describe("CintaMetrica", () => {
  it("dibuja una marca por día, más larga los lunes y con el mes en cada día 1", () => {
    const dominio = { desde: diaDesdeFecha("2026-07-01"), hasta: diaDesdeFecha("2026-10-12") };
    const puntos = [diaDesdeFecha("2026-07-03"), diaDesdeFecha("2026-10-02")];
    const { container } = render(<CintaMetrica dominio={dominio} puntos={puntos} />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg.querySelectorAll("line")).toHaveLength(104);
    expect(svg.querySelectorAll('line[data-tipo="mes"]')).toHaveLength(4);
    expect(svg.querySelectorAll('line[data-tipo="semana"]')).toHaveLength(15);
    expect([...svg.querySelectorAll("text")].map((texto) => texto.textContent)).toEqual([
      "jul",
      "ago",
      "sep",
      "oct",
    ]);
    const circulos = svg.querySelectorAll("circle");
    expect(circulos).toHaveLength(2);
    expect(circulos[0]).toHaveAttribute("cx", "1.942%");
    expect(circulos[1]).toHaveAttribute("cx", "90.291%");
  });
});
