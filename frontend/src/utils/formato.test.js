import { describe, expect, it } from "vitest";
import { formatearPrecio } from "./formato.js";

describe("formatearPrecio", () => {
  it("muestra el precio en pesos chilenos con punto de miles", () => {
    expect(formatearPrecio(35000)).toBe("$35.000");
  });
});
