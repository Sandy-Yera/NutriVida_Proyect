import { describe, expect, it } from "vitest";
import {
  actualizarUsuario,
  cambiarEstado,
  cambiarRol,
  listarUsuarios,
  obtenerUsuario,
  registrarPaciente,
} from "./usuariosService.js";
import { cerrarSesion, iniciarSesion } from "../auth/auth.js";

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

// Preparación EP3: las mismas reglas que tendrá ms-usuarios con @PreAuthorize.
describe("usuariosService: permisos", () => {
  it("cada persona edita solo nombre, apellido y teléfono de su propia cuenta", async () => {
    iniciarSesion("cfuentes@nutrivida.cl", "Nutri2026!"); // U010

    await expect(actualizarUsuario("U010", { telefono: "+56 9 3333 0010" })).resolves.toMatchObject(
      {
        telefono: "+56 9 3333 0010",
      },
    );
    await expect(actualizarUsuario("U010", { correo: "otro@nutrivida.cl" })).rejects.toMatchObject({
      estado: 403,
      campo: "correo",
    });
    await expect(actualizarUsuario("U011", { nombre: "X" })).rejects.toMatchObject({
      estado: 403,
    });
  });

  it("la clave nunca se cambia con actualizarUsuario", async () => {
    iniciarSesion("admin@nutrivida.cl", "Admin2026!");
    await actualizarUsuario("U100", { clave: "Cualquiera1!" });

    expect(iniciarSesion("javiera.soto@correo.cl", "Paciente2026!").ok).toBe(true);
  });

  it("solo el administrador desactiva o cambia roles, y sin sesión responde 401", async () => {
    iniciarSesion("recepcion@nutrivida.cl", "Recepcion2026!");
    await expect(cambiarEstado("U100", false)).rejects.toMatchObject({ estado: 403 });
    await expect(cambiarRol("U100", "ADMIN")).rejects.toMatchObject({ estado: 403 });
    cerrarSesion();
    await expect(actualizarUsuario("U100", { nombre: "X" })).rejects.toMatchObject({ estado: 401 });
  });
});
