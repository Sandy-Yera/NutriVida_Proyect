import { describe, expect, it } from "vitest";
import { actualizar, cambiarEstado, crear, listar, obtener, reprogramar } from "./citasData.js";

const datos = {
  pacienteId: "U102",
  nutricionistaId: "NUT003",
  servicioCodigo: "CN002",
  fecha: "2026-10-20",
  hora: "10:00",
  duracionMin: 30,
  motivo: "Control mensual",
};

function leerGuardadas() {
  return JSON.parse(localStorage.getItem("nv_citas"));
}

describe("citasData: lectura y creación", () => {
  it("parte con las 5 citas de la semilla", () => {
    expect(listar()).toHaveLength(5);
    expect(obtener("C0003")).toMatchObject({ pacienteId: "U100", estado: "CONFIRMADA" });
  });

  it("devuelve null al buscar una cita que no existe", () => {
    expect(obtener("C9999")).toBeNull();
  });

  it("crea la cita con id correlativo, en estado PENDIENTE y guardada en localStorage", () => {
    const nueva = crear({ ...datos, estado: "ATENDIDA" });

    expect(nueva).toMatchObject({ id: "C0006", estado: "PENDIENTE" });
    expect(leerGuardadas().some((c) => c.id === "C0006")).toBe(true);
  });

  it("guarda solo los campos del modelo, con motivo limpio, historial vacío y fecha de creación", () => {
    const nueva = crear({ ...datos, motivo: "  Control mensual  ", extra: "no va" });

    expect(nueva.motivo).toBe("Control mensual");
    expect(nueva.historial).toEqual([]);
    expect(nueva.pagoId).toBeNull();
    expect(nueva.creadaEn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(nueva).not.toHaveProperty("extra");
  });
});

describe("citasData: validaciones al crear", () => {
  it("exige paciente, nutricionista y servicio", () => {
    expect(() => crear({ ...datos, pacienteId: undefined })).toThrow("Faltan datos de la cita");
  });

  it("exige fecha AAAA-MM-DD y hora HH:mm", () => {
    expect(() => crear({ ...datos, fecha: "20/10/2026" })).toThrow("AAAA-MM-DD");
    expect(() => crear({ ...datos, hora: "9:00" })).toThrow("HH:mm");
  });

  it("no permite tomar un horario ocupado por otra cita del mismo nutricionista", () => {
    const c0004 = obtener("C0004"); // Daniela, 50 min desde las 08:30: ocupa 08:30 y 09:00

    expect(() => crear({ ...datos, fecha: c0004.fecha, hora: "09:00" })).toThrow(
      "Ese horario ya está tomado",
    );
    expect(listar()).toHaveLength(5);
  });

  it("permite tomar el horario de una cita cancelada", () => {
    const c0004 = obtener("C0004");
    cambiarEstado("C0004", "CANCELADA", "U102");

    expect(crear({ ...datos, fecha: c0004.fecha, hora: "08:30" }).id).toBe("C0006");
  });

  it("no acepta un historial inventado", () => {
    const nueva = crear({ ...datos, historial: [{ de: "X", a: "ATENDIDA" }] });

    expect(nueva.historial).toEqual([]);
  });
});

describe("citasData: cambiarEstado", () => {
  it("confirma una cita pendiente y registra el cambio en el historial", () => {
    const cita = cambiarEstado("C0004", "CONFIRMADA", "U002");

    expect(cita.estado).toBe("CONFIRMADA");
    expect(cita.historial).toHaveLength(1);
    expect(cita.historial[0]).toMatchObject({ de: "PENDIENTE", a: "CONFIRMADA", por: "U002" });
    expect(cita.historial[0].fecha).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(obtener("C0004").estado).toBe("CONFIRMADA");
  });

  it("acumula el historial en cada cambio", () => {
    cambiarEstado("C0004", "CONFIRMADA", "U002");
    const cita = cambiarEstado("C0004", "ATENDIDA", "U012");

    expect(cita.historial.map((h) => `${h.de}>${h.a}`)).toEqual([
      "PENDIENTE>CONFIRMADA",
      "CONFIRMADA>ATENDIDA",
    ]);
  });

  it("rechaza una transición no permitida y no guarda nada", () => {
    expect(() => cambiarEstado("C0001", "CANCELADA", "U100")).toThrow("No se puede pasar");
    expect(obtener("C0001")).toMatchObject({ estado: "ATENDIDA", historial: [] });
  });

  it("lanza un error si la cita no existe", () => {
    expect(() => cambiarEstado("C9999", "CONFIRMADA", "U002")).toThrow("no existe");
  });
});

describe("citasData: reprogramar", () => {
  it("cambia fecha y hora de una cita confirmada y la deja PENDIENTE", () => {
    const cita = reprogramar("C0003", "2026-11-04", "09:30", "U100");

    expect(cita).toMatchObject({ fecha: "2026-11-04", hora: "09:30", estado: "PENDIENTE" });
    expect(cita.historial.at(-1)).toMatchObject({ de: "CONFIRMADA", a: "PENDIENTE", por: "U100" });
    expect(obtener("C0003").fecha).toBe("2026-11-04");
  });

  it("no permite reprogramar una cita que ya terminó", () => {
    expect(() => reprogramar("C0002", "2026-11-04", "09:30", "U002")).toThrow(
      "Solo se puede reprogramar",
    );
    expect(obtener("C0002").estado).toBe("INASISTENCIA");
  });
});

describe("citasData: reprogramar sin choques", () => {
  it("no permite mover una cita a un horario ocupado", () => {
    const c0004 = obtener("C0004");
    crear({ ...datos, fecha: c0004.fecha, hora: "11:00" });

    expect(() => reprogramar("C0004", c0004.fecha, "10:30", "U102")).toThrow(
      "Ese horario ya está tomado",
    );
    expect(obtener("C0004").hora).toBe("08:30");
  });

  it("permite correr una cita dentro de su propio horario", () => {
    const c0004 = obtener("C0004");

    expect(reprogramar("C0004", c0004.fecha, "09:00", "U102").hora).toBe("09:00");
  });
});

describe("citasData: actualizar", () => {
  it("actualiza otros campos sin permitir cambiar el id ni la fecha de creación", () => {
    const original = obtener("C0004");
    const cita = actualizar("C0004", {
      motivo: "Nuevo motivo",
      id: "OTRO",
      creadaEn: "1999-01-01",
    });

    expect(cita).toMatchObject({
      id: "C0004",
      motivo: "Nuevo motivo",
      creadaEn: original.creadaEn,
    });
    expect(obtener("C0004").motivo).toBe("Nuevo motivo");
  });

  it("no permite cambiar el estado ni el historial por esta vía", () => {
    expect(() => actualizar("C0004", { estado: "CONFIRMADA" })).toThrow("cambiarEstado");
    expect(() => actualizar("C0004", { historial: [] })).toThrow("cambiarEstado");
    expect(obtener("C0004").estado).toBe("PENDIENTE");
  });

  it("no permite cambiar fecha ni hora por esta vía", () => {
    expect(() => actualizar("C0004", { hora: "12:00" })).toThrow("reprogramar");
  });

  it("lanza un error al actualizar una cita que no existe", () => {
    expect(() => actualizar("C9999", { motivo: "x" })).toThrow("no existe");
  });
});
