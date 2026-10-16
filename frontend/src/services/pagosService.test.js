import { describe, expect, it } from "vitest";
import { obtenerPago, procesarPago } from "./pagosService.js";
import { listar } from "../data/pagosData.js";

const tarjeta = {
  titular: "Javiera Soto",
  numero: "4242 4242 4242 4242",
  vencimiento: "12/30",
  cvv: "123",
  monto: 25000,
};

function leerGuardados() {
  return JSON.parse(localStorage.getItem("nv_pagos"));
}

describe("pagosService: procesarPago", () => {
  it("aprueba la tarjeta de prueba y guarda el pago sin el número completo", async () => {
    const resultado = await procesarPago(tarjeta);

    expect(resultado).toEqual({ estado: "APROBADO", pagoId: "P0006", motivo: null });
    expect(await obtenerPago("P0006")).toMatchObject({
      monto: 25000,
      ultimos4: "4242",
      estado: "APROBADO",
      citaId: null,
    });
    expect(JSON.stringify(leerGuardados())).not.toContain("4242424242424242");
  });

  it("rechaza la tarjeta 4000 0000 0000 0002 y también registra el intento", async () => {
    const resultado = await procesarPago({ ...tarjeta, numero: "4000 0000 0000 0002" });

    expect(resultado).toMatchObject({
      estado: "RECHAZADO",
      motivo: "El banco rechazó la tarjeta.",
    });
    expect((await obtenerPago(resultado.pagoId)).estado).toBe("RECHAZADO");
  });

  it("con datos inválidos lanza un error por campo y no guarda ningún pago", async () => {
    const intento = procesarPago({ ...tarjeta, cvv: "12", numero: "4242 4242 4242 4241" });

    await expect(intento).rejects.toMatchObject({
      message: "Revisa los datos de la tarjeta.",
      errores: {
        cvv: "El CVV debe tener 3 dígitos.",
        numero: "El número de la tarjeta no es válido. Revísalo.",
      },
    });
    expect(listar()).toHaveLength(5);
  });

  it("no acepta un monto en 0 o inválido", async () => {
    await expect(procesarPago({ ...tarjeta, monto: 0 })).rejects.toMatchObject({
      errores: { monto: "El monto a pagar no es válido." },
    });
  });
});

describe("pagosService: obtenerPago", () => {
  it("devuelve pagos de la semilla y nuevos, o null si no existe", async () => {
    expect(await obtenerPago("P0001")).toMatchObject({ citaId: "C0001" });
    const { pagoId } = await procesarPago(tarjeta);
    expect(await obtenerPago(pagoId)).not.toBeNull();
    expect(await obtenerPago("P9999")).toBeNull();
  });
});
