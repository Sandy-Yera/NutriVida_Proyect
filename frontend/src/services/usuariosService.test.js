import { describe, expect, it } from "vitest";
import {
  actualizarUsuario,
  cambiarEstado,
  cambiarRol,
  listarUsuarios,
  obtenerUsuario,
  registrarPaciente,
} from "./usuariosService.js";
import { iniciarSesion } from "../auth/auth.js";

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

  it("no permite que el administrador se desactive ni cambie su propio rol", async () => {
    iniciarSesion("admin@nutrivida.cl", "Admin2026!");

    await expect(cambiarEstado("U001", false)).rejects.toThrow(
      "No puedes desactivar tu propia cuenta.",
    );
    await expect(cambiarRol("U001", "PACIENTE")).rejects.toThrow(
      "No puedes cambiar tu propio rol.",
    );
    await expect(actualizarUsuario("U001", { telefono: "+56 9 1111 0099" })).resolves.toMatchObject(
      {
        telefono: "+56 9 1111 0099",
      },
    );
    await expect(cambiarEstado("U002", false)).resolves.toMatchObject({ activo: false });
  });
});
