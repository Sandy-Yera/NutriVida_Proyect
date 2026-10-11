import { describe, expect, it } from "vitest";
import {
  etiquetaSemana,
  rangoDelMes,
  rangoUltimosMeses,
  textoTasaInasistencia,
  validarRango,
} from "./reportes.js";

const hoy = new Date(2026, 9, 11);

describe("reportes", () => {
  it("calcula el mes actual y los últimos meses completos", () => {
    expect(rangoDelMes(hoy)).toEqual({ desde: "2026-10-01", hasta: "2026-10-31" });
    expect(rangoUltimosMeses(3, hoy)).toEqual({ desde: "2026-08-01", hasta: "2026-10-31" });
    expect(rangoUltimosMeses(6, new Date(2026, 1, 15))).toEqual({
      desde: "2025-09-01",
      hasta: "2026-02-28",
    });
  });

  it("valida que el rango tenga ambas fechas en orden", () => {
    expect(validarRango({ desde: "2026-10-01", hasta: "2026-10-31" })).toBe("");
    expect(validarRango({ desde: "2026-10-31", hasta: "2026-10-01" })).toBe(
      "La fecha de inicio debe ser anterior o igual a la de término.",
    );
    expect(validarRango({ desde: "", hasta: "2026-10-01" })).not.toBe("");
  });

  it("muestra la tasa de inasistencia como porcentaje y Sin datos cuando no hay base", () => {
    expect(textoTasaInasistencia({ atendidas: 4, inasistencias: 1, tasaInasistencia: 0.2 })).toBe(
      "20 %",
    );
    expect(textoTasaInasistencia({ atendidas: 0, inasistencias: 0, tasaInasistencia: 0 })).toBe(
      "Sin datos",
    );
  });

  it("nombra cada semana por su lunes", () => {
    expect(etiquetaSemana("2026-10-05")).toBe("Sem. lun 5 oct");
    expect(etiquetaSemana("2026-W41")).toBe("2026-W41");
  });
});
