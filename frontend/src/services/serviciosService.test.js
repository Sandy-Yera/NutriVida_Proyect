import { describe, expect, it } from "vitest";
import {
  cambiarEstadoServicio,
  listarContactos,
  listarNutricionistas,
  listarServicios,
  obtenerNutricionista,
  registrarContacto,
} from "./serviciosService.js";

describe("serviciosService", () => {
  it("por defecto entrega solo servicios activos, como los necesita el asistente de citas", async () => {
    await cambiarEstadoServicio("PL006", false);

    expect((await listarServicios()).map((s) => s.codigo)).not.toContain("PL006");
    expect(await listarServicios({ soloActivos: false })).toHaveLength(18);
  });

  it("entrega los 4 nutricionistas con su horario y busca por id", async () => {
    expect(await listarNutricionistas()).toHaveLength(4);
    expect(await obtenerNutricionista("NUT003")).toMatchObject({
      nombre: "Daniela Morales C.",
      dias: [1, 2, 3, 4, 5],
      horaInicio: "08:00",
      horaFin: "13:00",
    });
    expect(await obtenerNutricionista("NUT999")).toBeNull();
  });

  it("guarda los mensajes de contacto en nv_contactos", async () => {
    const contacto = await registrarContacto({
      nombre: "Pedro Lagos",
      correo: "PEDRO@correo.cl",
      motivo: "Consulta general",
      mensaje: "¿Atienden los sábados?",
    });

    expect(contacto).toMatchObject({ id: "CT001", correo: "pedro@correo.cl" });
    expect(await listarContactos()).toHaveLength(1);
  });
});
