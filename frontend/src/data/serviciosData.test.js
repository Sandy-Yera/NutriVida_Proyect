import { describe, expect, it } from "vitest";
import { actualizar, cambiarEstado, crear, listar, obtener } from "./serviciosData.js";

const nuevoTaller = {
  codigo: "tg004",
  tipo: "TALLER",
  nombre: "Taller de loncheras saludables",
  duracionMin: 90,
  modalidad: "Presencial (grupo)",
  precio: 15000,
  descripcion: "Ideas de colaciones para niñas y niños.",
  cupoMax: 10,
};

describe("serviciosData", () => {
  it("un servicio desactivado no aparece en el catálogo público, pero sí para el administrador", () => {
    cambiarEstado("CN005", false);

    expect(listar().map((s) => s.codigo)).not.toContain("CN005");
    expect(listar({ soloActivos: false }).map((s) => s.codigo)).toContain("CN005");
    expect(obtener("CN005").activo).toBe(false);
  });

  it("crea un servicio con código en mayúsculas y lo deja guardado", () => {
    const creado = crear(nuevoTaller);

    expect(creado).toMatchObject({ codigo: "TG004", cupoMax: 10, activo: true });
    expect(JSON.parse(localStorage.getItem("nv_servicios")).some((s) => s.codigo === "TG004")).toBe(
      true,
    );
  });

  it("rechaza códigos con otro formato o repetidos", () => {
    expect(() => crear({ ...nuevoTaller, codigo: "T004" })).toThrow(
      "El código debe tener 2 letras y 3 números, por ejemplo CN006.",
    );
    expect(() => crear({ ...nuevoTaller, codigo: "CN001" })).toThrow(
      "Ya existe un servicio con ese código.",
    );
  });

  it("al editar no cambia el código y un plan queda sin duración ni cupo", () => {
    const editado = actualizar("CN003", {
      codigo: "XX999",
      tipo: "PLAN",
      precio: 23000,
      cupoMax: 5,
    });

    expect(editado).toMatchObject({
      codigo: "CN003",
      tipo: "PLAN",
      duracionMin: null,
      precio: 23000,
    });
    expect(editado).not.toHaveProperty("cupoMax");
  });

  it("filtra por tipo y texto usando filtrarServicios", () => {
    expect(listar({ tipo: "EVALUACION" })).toHaveLength(4);
    expect(listar({ texto: "teleconsulta" }).map((s) => s.codigo)).toEqual(["CN004"]);
  });
});
