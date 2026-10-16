import { describe, expect, it } from "vitest";
import { actualizar, crear, obtener, listar } from "./citasData.js";

const datos = {
    pacienteId: "U102", nutricionistaId: "NUT003", servicioCodigo: "CN002",
    fecha: "2026-10-20", hora: "10:00", duracionMin: 30, motivo: "Control mensual",
};

describe("citasData", () => {
    it("parte con las 5 citas de la semilla", () => {
        expect(listar()).toHaveLength(5);
        expect(obtener("C0003")).toMatchObject({ pacienteId: "U100", estado: "CONFIRMADA" });
    });

    it("guarda solo los campos del modelo, con motivo limpio, historial vacío y fecha de creación", () => {
        const nueva = crear({ ...datos, motivo: "  Control mensual  ", extra: "no va" });
        expect(nueva.motivo).toBe("Control mensual");
        expect(nueva.historial).toEqual([]);
        expect(nueva.creadaEn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(nueva).not.toHaveProperty("extra");
    });

    it("crea la cita con id correlativo, en estado PENDIENTE y guardada en localStorage", () => {
        const nueva = crear({ ...datos, estado: "ATENDIDA" });
        expect(nueva).toMatchObject({ id: "C0006", estado: "PENDIENTE" });
        expect(JSON.parse(localStorage.getItem("nv_citas")).some((c) => c.id === "C0006")).toBe(true);
    });

    it("actualiza una cita sin permitir cambiar su id", () => {
        const cita = actualizar("C0004", { estado: "CONFIRMADA", id: "OTRO" });
        expect(cita.id).toBe("C0004");
        expect(obtener("C0004").estado).toBe("CONFIRMADA");
    });

    it("lanza un error al actualizar una cita que no existe", () => {
        expect(() => actualizar("C9999", {})).toThrow("no existe");
    });
});