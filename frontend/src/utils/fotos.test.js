import { describe, expect, it } from "vitest";
import { iniciales, medidasReducidas, prepararFoto, validarArchivoFoto } from "./fotos.js";

const archivo = (tipo, bytes = 10) => new File([new Uint8Array(bytes)], "foto", { type: tipo });

describe("fotos de nutricionistas", () => {
  it("acepta JPG, PNG y WebP de hasta 2 MB", () => {
    expect(validarArchivoFoto(archivo("image/jpeg"))).toBe("");
    expect(validarArchivoFoto(archivo("image/webp"))).toBe("");
    expect(validarArchivoFoto(archivo("image/gif"))).toBe("La foto debe ser JPG, PNG o WebP.");
    expect(validarArchivoFoto(archivo("image/png", 2 * 1024 * 1024 + 1))).toBe(
      "La foto puede pesar como máximo 2 MB.",
    );
    expect(validarArchivoFoto(null)).toBe("Elige una imagen.");
  });

  it("reduce sin agrandar y saca las iniciales sin la inicial del segundo apellido", () => {
    expect(medidasReducidas(1280, 960)).toEqual({ ancho: 320, alto: 240 });
    expect(medidasReducidas(200, 100)).toEqual({ ancho: 200, alto: 100 });
    expect(iniciales("Carolina Fuentes M.")).toBe("CF");
    expect(iniciales("Felipe")).toBe("F");
  });

  it("sin canvas (jsdom) guarda la imagen como data:", async () => {
    const url = await prepararFoto(new File(["abc"], "a.png", { type: "image/png" }));
    expect(url).toBe("data:image/png;base64,YWJj");
  });
});
