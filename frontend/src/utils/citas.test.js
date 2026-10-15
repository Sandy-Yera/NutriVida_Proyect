import { describe, expect, it } from "vitest";
import { bloquesQueOcupa, puedeTransicionar } from "./citas.js";

describe("bloquesQueOcupa", () => {
    it("muestra el precio en pesos chilenos con punto de miles", () => {
        expect(bloquesQueOcupa("08:30", 38)).toBe("$35.000");
    });
});
