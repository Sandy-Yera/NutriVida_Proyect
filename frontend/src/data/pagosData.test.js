import { describe, expect, it } from "vitest";
import { actualizar, crear, listar, obtener } from "./pagosData.js";

const aprobado = { monto: 25000, ultimos4: "4242", estado: "APROBADO" };

function leerGuardados() {
  return JSON.parse(localStorage.getItem("nv_pagos"));
}

describe("pagosData", () => {
  it("parte con los 5 pagos de la semilla", () => {
    expect(listar()).toHaveLength(5);
    expect(obtener("P0001")).toMatchObject({ citaId: "C0001", estado: "APROBADO" });
  });

  it("crea el pago con id correlativo, sin cita aún, y lo deja guardado en localStorage", () => {
    const pago = crear(aprobado);

    expect(pago).toMatchObject({ id: "P0006", citaId: null, monto: 25000, estado: "APROBADO" });
    expect(leerGuardados().some((p) => p.id === "P0006")).toBe(true);
  });

  it("guarda solo los 4 últimos dígitos aunque reciba el número completo", () => {
    const pago = crear({ ...aprobado, ultimos4: "4242 4242 4242 4242" });

    expect(pago.ultimos4).toBe("4242");
    expect(JSON.stringify(leerGuardados())).not.toContain("4242424242424242");
  });

  it("guarda un pago rechazado como rechazado, con su motivo", () => {
    const pago = crear({
      monto: 35000,
      ultimos4: "0002",
      estado: "RECHAZADO",
      motivo: "  Fondos insuficientes ",
    });

    expect(pago).toMatchObject({ estado: "RECHAZADO", motivo: "Fondos insuficientes" });
  });

  it("rechaza un estado que no es de pago", () => {
    expect(() => crear({ ...aprobado, estado: "PENDIENTE" })).toThrow(
      "El estado del pago no es válido.",
    );
  });

  it("enlaza el pago con su cita una sola vez", () => {
    const pago = crear(aprobado);

    expect(actualizar(pago.id, { citaId: "C0006" }).citaId).toBe("C0006");
    expect(actualizar(pago.id, { citaId: "C0099" }).citaId).toBe("C0006");
  });

  it("marca un pago como reembolsado sin cambiar su id, monto ni tarjeta", () => {
    const pago = actualizar("P0004", {
      estado: "REEMBOLSADO",
      id: "OTRO",
      monto: 1,
      ultimos4: "9999",
    });

    expect(pago).toMatchObject({
      id: "P0004",
      estado: "REEMBOLSADO",
      monto: 35000,
      ultimos4: "4242",
    });
    expect(obtener("P0004").estado).toBe("REEMBOLSADO");
  });

  it("no acepta un estado inválido al actualizar ni un pago inexistente", () => {
    expect(() => actualizar("P0001", { estado: "HOLA" })).toThrow("no es válido");
    expect(() => actualizar("P9999", { estado: "REEMBOLSADO" })).toThrow(
      "El pago P9999 no existe.",
    );
  });
});
