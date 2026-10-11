import { describe, expect, it } from "vitest";
import {
  crearFicha,
  guardarPlan,
  listarFichas,
  listarMediciones,
  obtenerFicha,
  obtenerPlan,
  registrarMedicion,
} from "./fichasData.js";

describe("fichasData", () => {
  it("lista solo las fichas del nutricionista indicado", () => {
    expect(listarFichas("NUT002").map((f) => f.id)).toEqual(["U101"]);
    expect(listarFichas()).toHaveLength(2);
  });

  it("crea la ficha de una paciente nueva y no permite duplicarla", () => {
    const ficha = crearFicha({
      id: "U102",
      nutricionistaId: "NUT003",
      objetivo: "VEGETARIANA",
      antecedentes: "  Sin patologías.  ",
    });

    expect(ficha).toMatchObject({
      id: "U102",
      nutricionistaId: "NUT003",
      antecedentes: "Sin patologías.",
    });
    expect(obtenerFicha("U102")).not.toBeNull();
    expect(() => crearFicha({ id: "U102", nutricionistaId: "NUT003" })).toThrow(
      "Este paciente ya tiene ficha.",
    );
  });

  it("registra una medición válida con id correlativo y rechaza una fuera de rango", () => {
    const medicion = registrarMedicion("U100", {
      fecha: "2026-10-09",
      pesoKg: "71.8",
      tallaCm: "170",
      cinturaCm: "83",
    });

    expect(medicion).toMatchObject({ id: "M0008", pesoKg: 71.8, cinturaCm: 83, grasaPct: null });
    expect(listarMediciones("U100").at(-1).id).toBe("M0008");

    let error;
    try {
      registrarMedicion("U100", { fecha: "2026-10-09", pesoKg: 500, tallaCm: 170 });
    } catch (e) {
      error = e;
    }
    expect(error.errores).toEqual({ pesoKg: "El peso debe estar entre 2 y 300 kg." });
  });

  it("no registra mediciones de un paciente sin ficha", () => {
    expect(() =>
      registrarMedicion("U102", { fecha: "2026-10-09", pesoKg: 60, tallaCm: 160 }),
    ).toThrow("El paciente no tiene ficha: créala antes de continuar.");
  });

  it("las mediciones salen ordenadas por fecha", () => {
    const fechas = listarMediciones("U100").map((m) => m.fecha);

    expect(fechas).toEqual([...fechas].sort());
  });

  it("guardar un plan nuevo lo deja como plan vigente y editarlo conserva su id", () => {
    const nuevo = guardarPlan("U100", {
      vigenteDesde: "2026-10-10",
      objetivo: "Mantener el peso",
      kcalDiarias: "1900",
      comidas: {
        desayuno: "Avena",
        colacion: "Fruta",
        almuerzo: "Legumbres",
        once: "Té",
        cena: "Sopa",
      },
      indicaciones: "Caminar.",
    });

    expect(obtenerPlan("U100")).toMatchObject({ id: "PA003", kcalDiarias: 1900 });

    guardarPlan("U100", { ...nuevo, indicaciones: "Caminar 40 minutos." });

    expect(obtenerPlan("U100")).toMatchObject({ id: "PA003", indicaciones: "Caminar 40 minutos." });
  });
});
