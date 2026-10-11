import { describe, expect, it } from "vitest";
import { listarUsuarios, obtenerUsuario, registrarPaciente } from "./usuariosService.js";

describe("usuariosService", () => {
  it("nunca devuelve la clave de los usuarios", async () => {
    const usuarios = await listarUsuarios();

    expect(usuarios.length).toBeGreaterThan(0);
    expect(usuarios.every((u) => !("clave" in u))).toBe(true);
    expect(await obtenerUsuario("U001")).not.toHaveProperty("clave");
  });

  it("rechaza registrar un paciente con un correo que ya existe", async () => {
    await expect(
      registrarPaciente({ nombre: "Ana", rut: "5.126.663-3", correo: "ana.perez@correo.cl" }),
    ).rejects.toThrow("Ya existe un usuario con ese correo.");
  });
});
