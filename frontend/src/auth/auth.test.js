import { describe, expect, it } from "vitest";
import { cerrarSesion, iniciarSesion, obtenerSesion, rutaInicioPorRol, tieneRol } from "./auth.js";
import { cambiarEstado } from "../data/usuariosData.js";

describe("auth", () => {
  it("inicia sesión sin importar mayúsculas y guarda solo id, nombre, rol y nutricionistaId", () => {
    const resultado = iniciarSesion("DMORALES@nutrivida.cl", "Nutri2026!");

    expect(resultado.ok).toBe(true);
    expect(JSON.parse(localStorage.getItem("usuarioActual"))).toEqual({
      id: "U012",
      nombre: "Daniela",
      rol: "NUTRICIONISTA",
      nutricionistaId: "NUT003",
    });
  });

  it("rechaza una clave incorrecta sin crear sesión", () => {
    expect(iniciarSesion("admin@nutrivida.cl", "admin2026!")).toEqual({
      ok: false,
      error: "Correo o contraseña incorrectos.",
    });
    expect(obtenerSesion()).toBeNull();
  });

  it("rechaza a un usuario desactivado", () => {
    cambiarEstado("U102", false);

    expect(iniciarSesion("ana.perez@correo.cl", "Paciente2026!").error).toBe(
      "Tu cuenta está desactivada. Contacta a la clínica.",
    );
  });

  it("cierra la sesión de un usuario que fue desactivado mientras navegaba", () => {
    iniciarSesion("tomas.h@correo.cl", "Paciente2026!");
    cambiarEstado("U101", false);

    expect(obtenerSesion()).toBeNull();
    expect(localStorage.getItem("usuarioActual")).toBeNull();
  });

  it("tieneRol responde según la sesión y cerrarSesion la elimina", () => {
    iniciarSesion("recepcion@nutrivida.cl", "Recepcion2026!");

    expect(tieneRol("SECRETARIA", "ADMIN")).toBe(true);
    expect(tieneRol("ADMIN")).toBe(false);

    cerrarSesion();

    expect(tieneRol("SECRETARIA")).toBe(false);
  });

  it("lleva a cada rol a su vista de inicio", () => {
    expect(rutaInicioPorRol("ADMIN")).toBe("/admin");
    expect(rutaInicioPorRol("SECRETARIA")).toBe("/secretaria/agenda");
    expect(rutaInicioPorRol("NUTRICIONISTA")).toBe("/nutricionista/agenda");
    expect(rutaInicioPorRol("PACIENTE")).toBe("/mis-citas");
    expect(rutaInicioPorRol("OTRO")).toBe("/");
  });
});
