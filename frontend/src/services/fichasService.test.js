import { describe, expect, it } from "vitest";
import {
  crearFicha,
  listarMediciones,
  listarPacientes,
  obtenerFicha,
  registrarMedicion,
} from "./fichasService.js";
import { iniciarSesion } from "../auth/auth.js";

// Preparación EP3: el service solo entrega datos clínicos a quien corresponde.
describe("fichasService: acceso a la ficha", () => {
  it("sin sesión responde 401", async () => {
    await expect(listarMediciones("U100")).rejects.toMatchObject({ estado: 401 });
  });

  it("el nutricionista a cargo lee la ficha completa; otro solo sabe de quién es", async () => {
    iniciarSesion("cfuentes@nutrivida.cl", "Nutri2026!"); // NUT001, a cargo de U100
    const propia = await obtenerFicha("U100");
    expect(propia).toHaveProperty("objetivo");

    iniciarSesion("dmorales@nutrivida.cl", "Nutri2026!"); // NUT003
    expect(await obtenerFicha("U100")).toEqual({ id: "U100", nutricionistaId: "NUT001" });
    await expect(listarMediciones("U100")).rejects.toMatchObject({ estado: 403 });
    await expect(registrarMedicion("U100", { pesoKg: 70, tallaCm: 165 })).rejects.toMatchObject({
      estado: 403,
    });
  });

  it("el paciente lee sus mediciones pero no las de otro", async () => {
    iniciarSesion("javiera.soto@correo.cl", "Paciente2026!"); // U100
    expect(Array.isArray(await listarMediciones("U100"))).toBe(true);
    await expect(listarMediciones("U101")).rejects.toMatchObject({ estado: 403 });
  });

  it("un nutricionista solo lista sus pacientes y crea fichas a su nombre", async () => {
    iniciarSesion("dmorales@nutrivida.cl", "Nutri2026!");
    await expect(listarPacientes("NUT001")).rejects.toMatchObject({ estado: 403 });
    await expect(
      crearFicha({ id: "U102", nutricionistaId: "NUT001", objetivo: "PERDIDA_PESO" }),
    ).rejects.toMatchObject({ estado: 403 });
  });

  it("registrar en un paciente sin ficha responde 404", async () => {
    iniciarSesion("dmorales@nutrivida.cl", "Nutri2026!");
    await expect(registrarMedicion("U102", {})).rejects.toMatchObject({ estado: 404 });
  });
});
