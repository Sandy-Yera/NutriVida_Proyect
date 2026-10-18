import { afterEach, describe, expect, it } from "vitest";
import { borrarReserva, guardarReserva, leerReserva } from "./reservaData.js";

afterEach(() => sessionStorage.clear());

describe("reservaData (RN-17)", () => {
  it("guarda la reserva en sessionStorage y la devuelve al mismo paciente", () => {
    guardarReserva("U100", { servicioCodigo: "CN002", nutricionistaId: "NUT003", paso: 3 });

    expect(sessionStorage.getItem("nv_reserva")).not.toBeNull();
    expect(localStorage.getItem("nv_reserva")).toBeNull();
    expect(leerReserva("U100")).toEqual({
      pacienteId: "U100",
      servicioCodigo: "CN002",
      nutricionistaId: "NUT003",
      paso: 3,
    });
  });

  it("no entrega la reserva de otro paciente", () => {
    guardarReserva("U100", { servicioCodigo: "CN002" });

    expect(leerReserva("U102")).toBeNull();
  });

  it("descarta campos desconocidos y contenido dañado", () => {
    expect(guardarReserva("U100", { hora: "09:00", numeroTarjeta: "4242" })).toEqual({
      pacienteId: "U100",
      hora: "09:00",
    });

    sessionStorage.setItem("nv_reserva", "{no es json");
    expect(leerReserva("U100")).toBeNull();
  });

  it("borrarReserva la elimina", () => {
    guardarReserva("U100", { servicioCodigo: "CN002" });
    borrarReserva();

    expect(leerReserva("U100")).toBeNull();
  });
});
