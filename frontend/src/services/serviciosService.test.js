import { beforeEach, describe, expect, it } from "vitest";
import {
  actualizarFotoNutricionista,
  actualizarServicio,
  cambiarEstadoServicio,
  crearServicio,
  eliminarFotoNutricionista,
  listarContactos,
  listarNutricionistas,
  listarServicios,
  obtenerNutricionista,
  registrarContacto,
} from "./serviciosService.js";
import { cerrarSesion, iniciarSesion } from "../auth/auth.js";

describe("serviciosService", () => {
  // Preparación EP3: crear, editar y desactivar servicios exige la sesión del administrador.
  beforeEach(() => {
    iniciarSesion("admin@nutrivida.cl", "Admin2026!");
  });

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

describe("serviciosService: foto de los nutricionistas", () => {
  const png = () => new File(["abc"], "foto.png", { type: "image/png" });

  it("el nutricionista cambia su propia foto y queda guardada en nv_nutricionistas", async () => {
    iniciarSesion("cfuentes@nutrivida.cl", "Nutri2026!"); // NUT001

    const actualizado = await actualizarFotoNutricionista("NUT001", png());

    expect(actualizado.fotoUrl).toBe("data:image/png;base64,YWJj");
    expect((await obtenerNutricionista("NUT001")).fotoUrl).toBe("data:image/png;base64,YWJj");
    expect(JSON.parse(localStorage.getItem("nv_nutricionistas"))[0].fotoUrl).toBe(
      "data:image/png;base64,YWJj",
    );

    expect((await eliminarFotoNutricionista("NUT001")).fotoUrl).toBeNull();
  });

  it("no puede cambiar la foto de otro nutricionista (403), pero el admin sí", async () => {
    iniciarSesion("cfuentes@nutrivida.cl", "Nutri2026!");
    await expect(actualizarFotoNutricionista("NUT002", png())).rejects.toMatchObject({
      estado: 403,
    });

    iniciarSesion("admin@nutrivida.cl", "Admin2026!");
    expect((await actualizarFotoNutricionista("NUT002", png())).fotoUrl).toMatch(/^data:image/);
  });

  it("un paciente no cambia fotos y sin sesión responde 401", async () => {
    iniciarSesion("javiera.soto@correo.cl", "Paciente2026!");
    await expect(actualizarFotoNutricionista("NUT001", png())).rejects.toMatchObject({
      estado: 403,
    });
    cerrarSesion();
    await expect(eliminarFotoNutricionista("NUT001")).rejects.toMatchObject({ estado: 401 });
  });

  it("rechaza tipos no soportados (415), archivos de más de 2 MB (413) y nutricionistas que no existen (404)", async () => {
    iniciarSesion("admin@nutrivida.cl", "Admin2026!");
    const gif = new File(["x"], "a.gif", { type: "image/gif" });
    const pesada = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "a.jpg", { type: "image/jpeg" });

    await expect(actualizarFotoNutricionista("NUT001", gif)).rejects.toMatchObject({
      estado: 415,
      campo: "foto",
    });
    await expect(actualizarFotoNutricionista("NUT001", pesada)).rejects.toMatchObject({
      estado: 413,
    });
    await expect(actualizarFotoNutricionista("NUT999", png())).rejects.toMatchObject({
      estado: 404,
    });
    expect((await obtenerNutricionista("NUT001")).fotoUrl).toBeNull();
  });
});

describe("serviciosService: permisos del catálogo", () => {
  it("solo el administrador crea, edita o desactiva servicios", async () => {
    iniciarSesion("recepcion@nutrivida.cl", "Recepcion2026!");
    await expect(cambiarEstadoServicio("CN001", false)).rejects.toMatchObject({ estado: 403 });
    await expect(actualizarServicio("CN001", { precio: 1 })).rejects.toMatchObject({ estado: 403 });
    cerrarSesion();
    await expect(crearServicio({})).rejects.toMatchObject({ estado: 401 });
  });
});
