import { describe, expect, it } from "vitest";
import { cambiarEstado, listarCitas, obtenerCita, reprogramarCita } from "./citasService.js";
import { crear } from "../data/citasData.js";
import { obtener as obtenerPago } from "../data/pagosData.js";

const ids = (citas) => citas.map((c) => c.id);

describe("citasService: listarCitas", () => {
    it("sin filtros devuelve todas las citas ordenadas por fecha y hora", async () => {
        const citas = await listarCitas();

        expect(citas).toHaveLength(5);
        const claves = citas.map((c) => `${c.fecha} ${c.hora}`);
        expect(claves).toEqual([...claves].sort());
    });

    it("filtra por estado (lo usa el dashboard para las citas por confirmar)", async () => {
        expect(ids(await listarCitas({ estado: "PENDIENTE" })).sort()).toEqual(["C0004", "C0005"]);
    });

    it("filtra por paciente (Mi progreso) y por nutricionista (Mis pacientes)", async () => {
        expect(ids(await listarCitas({ pacienteId: "U100" }))).toEqual(["C0001", "C0003"]);
        expect(ids(await listarCitas({ nutricionistaId: "NUT002" }))).toEqual(["C0002", "C0005"]);
    });

    it("filtra por rango de fechas con los extremos incluidos", async () => {
        crear({
            pacienteId: "U102",
            nutricionistaId: "NUT003",
            servicioCodigo: "CN002",
            fecha: "2030-03-04",
            hora: "09:00",
        });
        crear({
            pacienteId: "U102",
            nutricionistaId: "NUT003",
            servicioCodigo: "CN002",
            fecha: "2030-03-06",
            hora: "09:00",
        });

        const citas = await listarCitas({ desde: "2030-03-04", hasta: "2030-03-05" });

        expect(ids(citas)).toEqual(["C0006"]);
    });

    it("combina filtros", async () => {
        expect(ids(await listarCitas({ pacienteId: "U101", estado: "PENDIENTE" }))).toEqual(["C0005"]);
    });

    it("lee las citas guardadas, no solo la semilla", async () => {
        crear({
            pacienteId: "U101",
            nutricionistaId: "NUT003",
            servicioCodigo: "CN002",
            fecha: "2030-01-10",
            hora: "08:00",
        });

        expect(ids(await listarCitas({ estado: "PENDIENTE" }))).toContain("C0006");
    });
});

describe("citasService: obtenerCita", () => {
    it("devuelve la cita guardada o null si no existe", async () => {
        expect(await obtenerCita("C0002")).toMatchObject({ estado: "INASISTENCIA" });
        expect(await obtenerCita("C9999")).toBeNull();
    });
});

describe("citasService: cambiarEstado", () => {
    it("confirma una cita pendiente y registra quién lo hizo", async () => {
        const cita = await cambiarEstado("C0004", "CONFIRMADA", "U002");

        expect(cita.estado).toBe("CONFIRMADA");
        expect(cita.historial.at(-1)).toMatchObject({ de: "PENDIENTE", a: "CONFIRMADA", por: "U002" });
        expect(obtenerPago("P0004").estado).toBe("APROBADO");
    });

    it("al cancelar una cita deja su pago como REEMBOLSADO", async () => {
        await cambiarEstado("C0004", "CANCELADA", "U102");

        expect((await obtenerCita("C0004")).estado).toBe("CANCELADA");
        expect(obtenerPago("P0004").estado).toBe("REEMBOLSADO");
    });

    it("rechaza una transición no permitida sin tocar la cita ni el pago", async () => {
        await expect(cambiarEstado("C0001", "CANCELADA", "U100")).rejects.toThrow("No se puede pasar");

        expect((await obtenerCita("C0001")).estado).toBe("ATENDIDA");
        expect(obtenerPago("P0001").estado).toBe("APROBADO");
    });

    it("avisa si la cita no existe", async () => {
        await expect(cambiarEstado("C9999", "CONFIRMADA", "U002")).rejects.toThrow("no existe");
    });
});

describe("citasService: reprogramarCita", () => {
    it("mueve la cita, la deja PENDIENTE y anota quién la reprogramó", async () => {
        const cita = await reprogramarCita("C0003", "2030-02-01", "11:30", "U100");

        expect(cita).toMatchObject({ fecha: "2030-02-01", hora: "11:30", estado: "PENDIENTE" });
        expect(cita.historial.at(-1)).toMatchObject({ de: "CONFIRMADA", a: "PENDIENTE", por: "U100" });
    });

    it("no reprograma una cita cancelada", async () => {
        await cambiarEstado("C0005", "CANCELADA", "U101");

        await expect(reprogramarCita("C0005", "2030-02-01", "11:30", "U101")).rejects.toThrow(
            "Solo se puede reprogramar",
        );
    });
});