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

  it("aCuerpo arma el mismo JSON que el GlobalExceptionHandler, también para un solo campo", () => {
    expect(errorDeCampo("rut", "RUT inválido").aCuerpo("/api/usuarios")).toEqual({
      timestamp: expect.any(String),
      status: 400,
      error: "Bad Request",
      mensaje: "RUT inválido",
      ruta: "/api/usuarios",
      errores: { rut: "RUT inválido" },
    });
    expect(errorNoEncontrado("No existe.").aCuerpo()).not.toHaveProperty("errores");
  });

  it("desdeRespuesta reconstruye el error que la UI ya sabe mostrar", () => {
    const deUnCampo = desdeRespuesta(
      {
        status: 409,
        error: "Conflict",
        mensaje: "Ya existe un usuario con ese correo.",
        ruta: "/api/usuarios",
        errores: { correo: "Ya existe un usuario con ese correo." },
      },
      409,
    );
    expect(deUnCampo).toBeInstanceOf(ErrorApi);
    expect(deUnCampo).toMatchObject({ estado: 409, campo: "correo" });

    const sinCuerpo = desdeRespuesta(null, 404);
    expect(sinCuerpo).toMatchObject({ estado: 404, codigo: "NO_ENCONTRADO" });
    expect(sinCuerpo.campo).toBeUndefined();
  });

  it("402 del pago rechazado y códigos desconocidos conservan su número", () => {
    expect(
      desdeRespuesta({ status: 402, mensaje: "El banco rechazó la tarjeta." }, 402),
    ).toMatchObject({
      estado: 402,
      codigo: "PAGO_RECHAZADO",
      message: "El banco rechazó la tarjeta.",
    });
    expect(desdeRespuesta({ mensaje: "x" }, 422)).toMatchObject({
      estado: 422,
      codigo: "VALIDACION",
    });
    expect(desdeRespuesta(null, 502)).toMatchObject({ estado: 502, codigo: "ERROR_SERVIDOR" });
  });
});
