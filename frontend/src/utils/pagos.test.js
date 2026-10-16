import { describe, expect, it } from "vitest";
import {
    pasaLuhn,
    simularPago,
    validarCvv,
    validarPago,
    validarTarjeta,
    validarTitular,
    validarVencimiento,
} from "./pagos.js";

const OCTUBRE_2026 = new Date(2026, 9, 16);

describe("validarTarjeta", () => {
    it("acepta las dos tarjetas de prueba, con o sin espacios", () => {
        expect(validarTarjeta("4242 4242 4242 4242")).toBe("");
        expect(validarTarjeta("4000000000000002")).toBe("");
    });

    it("rechaza un número que no pasa el algoritmo de Luhn", () => {
        expect(pasaLuhn("4242424242424241")).toBe(false);
        expect(validarTarjeta("4242 4242 4242 4241")).toBe(
            "El número de la tarjeta no es válido. Revísalo.",
        );
    });

    it("pide 16 dígitos y avisa si viene vacío", () => {
        expect(validarTarjeta("4242 4242")).toBe("El número de la tarjeta debe tener 16 dígitos.");
        expect(validarTarjeta("")).toBe("Ingresa el número de la tarjeta.");
    });
});

describe("validarVencimiento", () => {
    it("acepta una tarjeta que vence este mes o después", () => {
        expect(validarVencimiento("10/26", OCTUBRE_2026)).toBe("");
        expect(validarVencimiento("01/28", OCTUBRE_2026)).toBe("");
    });

    it("rechaza una tarjeta vencida", () => {
        expect(validarVencimiento("09/26", OCTUBRE_2026)).toBe("La tarjeta está vencida.");
    });

    it("exige el formato MM/AA y un mes válido", () => {
        expect(validarVencimiento("1026", OCTUBRE_2026)).toBe("Escribe el vencimiento como MM/AA.");
        expect(validarVencimiento("13/27", OCTUBRE_2026)).toBe(
            "El mes del vencimiento debe estar entre 01 y 12.",
        );
    });
});

describe("validarCvv y validarTitular", () => {
    it("el CVV debe tener exactamente 3 dígitos", () => {
        expect(validarCvv("123")).toBe("");
        expect(validarCvv("12")).toBe("El CVV debe tener 3 dígitos.");
        expect(validarCvv("12a")).toBe("El CVV debe tener 3 dígitos.");
    });

    it("el titular es obligatorio", () => {
        expect(validarTitular("Javiera Soto")).toBe("");
        expect(validarTitular("   ")).toBe("Ingresa el nombre del titular.");
    });
});

describe("validarPago", () => {
    it("devuelve un objeto vacío si todo es válido y un mensaje por campo si no", () => {
        const valido = {
            titular: "Javiera Soto",
            numero: "4242 4242 4242 4242",
            vencimiento: "12/27",
            cvv: "123",
        };

        expect(validarPago(valido, OCTUBRE_2026)).toEqual({});
        expect(
            Object.keys(validarPago({ ...valido, cvv: "", vencimiento: "01/20" }, OCTUBRE_2026)),
        ).toEqual(["vencimiento", "cvv"]);
    });
});

describe("simularPago", () => {
    it("rechaza la tarjeta 4000 0000 0000 0002 con un motivo", () => {
        expect(simularPago("4000 0000 0000 0002")).toEqual({
            estado: "RECHAZADO",
            motivo: "El banco rechazó la tarjeta.",
        });
    });

    it("aprueba cualquier otra tarjeta", () => {
        expect(simularPago("4242424242424242")).toEqual({ estado: "APROBADO", motivo: null });
    });
});