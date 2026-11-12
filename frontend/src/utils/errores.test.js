import { describe, expect, it } from "vitest";
import {
  ErrorApi,
  desdeRespuesta,
  errorConflicto,
  errorDeCampo,
  errorNoEncontrado,
} from "./errores.js";

describe("errores (contrato de errores para EP3)", () => {
  it("cada error lleva el código HTTP que devolverá el microservicio", () => {
    expect(errorNoEncontrado("La cita C9 no existe.")).toMatchObject({
      estado: 404,
      codigo: "NO_ENCONTRADO",
      message: "La cita C9 no existe.",
    });
    expect(errorConflicto("Ya existe.", { campo: "correo" })).toMatchObject({
      estado: 409,
      campo: "correo",
    });
    expect(errorDeCampo("rut", "RUT inválido")).toBeInstanceOf(Error);
  });

  it("aCuerpo arma el JSON del @RestControllerAdvice, también para un solo campo", () => {
    expect(errorDeCampo("rut", "RUT inválido").aCuerpo()).toEqual({
      estado: 400,
      codigo: "VALIDACION",
      mensaje: "RUT inválido",
      errores: { rut: "RUT inválido" },
    });
  });

  it("desdeRespuesta reconstruye el error que la UI ya sabe mostrar", () => {
    const deUnCampo = desdeRespuesta(
      {
        codigo: "CONFLICTO",
        mensaje: "Ya existe un usuario con ese correo.",
        errores: { correo: "x" },
      },
      409,
    );
    expect(deUnCampo).toBeInstanceOf(ErrorApi);
    expect(deUnCampo).toMatchObject({ estado: 409, campo: "correo" });

    const sinCuerpo = desdeRespuesta(null, 404);
    expect(sinCuerpo).toMatchObject({ estado: 404, codigo: "NO_ENCONTRADO" });
    expect(sinCuerpo.campo).toBeUndefined();
  });
});
