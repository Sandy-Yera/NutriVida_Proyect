import { describe, expect, it } from "vitest";
import {
  calcularImc,
  clasificarImc,
  filtrarServicios,
  incluyeDelPlan,
  pacientesDeNutricionista,
  tipoDesdeSlug,
  urlSolicitarCita,
  validarMedicion,
} from "./clinica.js";
import { serviciosSemilla } from "../data/semillas/servicios.js";
import { fichasSemilla } from "../data/semillas/fichas.js";

describe("calcularImc y clasificarImc (C-T1)", () => {
  it("calcularImc(72.4, 170) da 25.1 y clasificarImc(25.1) da Sobrepeso", () => {
    expect(calcularImc(72.4, 170)).toBe(25.1);
    expect(clasificarImc(25.1)).toBe("Sobrepeso");
  });
});

describe("filtrarServicios (C-T2)", () => {
  it('con tipo PLAN y texto "VEGANA" devuelve solo PL005', () => {
    const resultado = filtrarServicios(serviciosSemilla, { tipo: "PLAN", texto: "VEGANA" });

    expect(resultado.map((servicio) => servicio.codigo)).toEqual(["PL005"]);
  });

  it("sin filtros devuelve los 18 servicios", () => {
    expect(filtrarServicios(serviciosSemilla)).toHaveLength(18);
  });
});

describe("lógica clínica, casos extra", () => {
  it("clasifica el IMC con los cortes de la OMS y no clasifica el plan infantil", () => {
    expect(clasificarImc(18.4)).toBe("Bajo peso");
    expect(clasificarImc(18.5)).toBe("Normal");
    expect(clasificarImc(24.9)).toBe("Normal");
    expect(clasificarImc(25)).toBe("Sobrepeso");
    expect(clasificarImc(30)).toBe("Obesidad");
    expect(clasificarImc(16, "INFANTIL")).toBeNull();
    expect(calcularImc(70, 0)).toBeNull();
  });

  it("filtrarServicios ignora tildes y mayúsculas y busca también en la descripción", () => {
    expect(
      filtrarServicios(serviciosSemilla, { texto: "NUTRICION DEPORTIVA" }).map((s) => s.codigo),
    ).toEqual(["PL003"]);
    expect(
      filtrarServicios(serviciosSemilla, { texto: "videollamada" }).map((s) => s.codigo),
    ).toEqual(["CN004"]);
    expect(filtrarServicios(serviciosSemilla, { tipo: "TALLER" })).toHaveLength(3);
  });

  it("validarMedicion devuelve los errores por campo y acepta una medición válida", () => {
    const hoy = new Date(2026, 9, 11);
    const valida = {
      fecha: "2026-10-02",
      pesoKg: 72.4,
      tallaCm: 170,
      cinturaCm: 84,
      grasaPct: 29.9,
    };

    expect(validarMedicion(valida, hoy)).toEqual({});
    expect(
      validarMedicion({ fecha: "2026-10-12", pesoKg: 350, tallaCm: "", grasaPct: 1 }, hoy),
    ).toEqual({
      pesoKg: "El peso debe estar entre 2 y 300 kg.",
      tallaCm: "Ingresa la talla.",
      grasaPct: "El % de grasa debe estar entre 2 y 70 %.",
      fecha: "La fecha de la medición no puede ser futura.",
    });
  });

  it("pacientesDeNutricionista deja solo las fichas de ese nutricionista", () => {
    expect(pacientesDeNutricionista(fichasSemilla, "NUT001").map((f) => f.id)).toEqual(["U100"]);
    expect(pacientesDeNutricionista(fichasSemilla, "NUT004")).toEqual([]);
  });

  it("urlSolicitarCita incluye solo los parámetros elegidos y tipoDesdeSlug traduce la categoría", () => {
    expect(urlSolicitarCita({ servicio: "CN001", nutricionista: "NUT003" })).toBe(
      "/citas/solicitar?servicio=CN001&nutricionista=NUT003",
    );
    expect(urlSolicitarCita({ servicio: "", nutricionista: "NUT001" })).toBe(
      "/citas/solicitar?nutricionista=NUT001",
    );
    expect(urlSolicitarCita()).toBe("/citas/solicitar");
    expect(tipoDesdeSlug("planes")).toBe("PLAN");
    expect(tipoDesdeSlug("otra")).toBeNull();
  });

  it("incluyeDelPlan separa lo que incluye un plan y no inventa ítems si no hay detalle", () => {
    expect(
      incluyeDelPlan(
        "Incluye primera consulta + 5 controles + 3 planes mensuales + seguimiento continuo.",
      ),
    ).toEqual(["Primera consulta", "5 controles", "3 planes mensuales", "Seguimiento continuo"]);
    expect(incluyeDelPlan("Plan adaptado para patologías metabólicas.")).toEqual([]);
  });
});
