import { describe, expect, it } from "vitest";
import { bloquesQueOcupa } from "./citas.js";
import { filtrarCitas } from "./citas.js";

const citas = [
    { id: "C1", pacienteId: "U100", nutricionistaId: "NUT001", estado: "CONFIRMADA", fecha: "2026-10-20", hora: "11:00" },
    { id: "C2", pacienteId: "U101", nutricionistaId: "NUT002", estado: "PENDIENTE", fecha: "2026-10-18", hora: "10:00" },
    { id: "C3", pacienteId: "U100", nutricionistaId: "NUT001", estado: "ATENDIDA", fecha: "2026-09-10", hora: "10:00" },
    { id: "C4", pacienteId: "U102", nutricionistaId: "NUT003", estado: "PENDIENTE", fecha: "2026-10-18", hora: "08:30" },
];
const ids = (lista) => lista.map((c) => c.id);

describe("bloquesQueOcupa", () => {
    it("muestra el precio en pesos chilenos con punto de miles", () => {
        expect(bloquesQueOcupa("08:30", 38)).toEqual(["08:30", "09:00"]);
    });
});

describe("filtrarCitas", () => {
    it("sin filtros devuelve todas, ordenadas por fecha y hora", () => {
        expect(ids(filtrarCitas(citas))).toEqual(["C3", "C4", "C2", "C1"]);
    });
    it("filtra por estado, paciente y nutricionista", () => {
        expect(ids(filtrarCitas(citas, { estado: "PENDIENTE" }))).toEqual(["C4", "C2"]);
        expect(ids(filtrarCitas(citas, { pacienteId: "U100" }))).toEqual(["C3", "C1"]);
        expect(ids(filtrarCitas(citas, { nutricionistaId: "NUT003" }))).toEqual(["C4"]);
    });
    it("filtra por rango de fechas, con los extremos incluidos", () => {
        expect(ids(filtrarCitas(citas, { desde: "2026-10-18", hasta: "2026-10-18" }))).toEqual(["C4", "C2"]);
    });
    it("combina filtros", () => {
        expect(ids(filtrarCitas(citas, { pacienteId: "U100", estado: "ATENDIDA" }))).toEqual(["C3"]);
    });
});