import { describe, expect, it } from "vitest";
import {
  aFechaIso,
  formatearPorcentaje,
  formatearPrecio,
  formatearRut,
  formatearTelefono,
  pluralizar,
} from "./formato.js";

describe("formatearPrecio", () => {
  it("muestra el precio en pesos chilenos con punto de miles", () => {
    expect(formatearPrecio(35000)).toBe("$35.000");
  });
});

describe("formatearRut y formatearTelefono", () => {
  it("dejan el RUT y el teléfono con el formato de la clínica", () => {
    expect(formatearRut("123456785")).toBe("12.345.678-5");
    expect(formatearRut("16222333k")).toBe("16.222.333-K");
    expect(formatearTelefono("+56912345678")).toBe("+56 9 1234 5678");
  });
});

describe("aFechaIso, formatearPorcentaje y pluralizar", () => {
  it("dan fechas locales, porcentajes y plurales en español", () => {
    expect(aFechaIso(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatearPorcentaje(0.125)).toBe("12,5 %");
    expect(pluralizar(1, "cita", "citas")).toBe("1 cita");
    expect(pluralizar(3, "cita", "citas")).toBe("3 citas");
  });
});
