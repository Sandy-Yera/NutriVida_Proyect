import { describe, expect, it } from "vitest";
import {
  actualizar,
  cambiarEstado,
  cambiarClave,
  cambiarRol,
  crear,
  listar,
  obtener,
  registrarPaciente,
} from "./usuariosData.js";

const nuevaSecretaria = {
  nombre: "Paula",
  apellido: "Lagos",
  rut: "11.111.111-1",
  correo: "Paula.Lagos@NutriVida.cl",
  telefono: "+56 9 3333 0001",
  fechaNacimiento: "1995-05-05",
  clave: "Recepcion2026!",
  rol: "SECRETARIA",
};

function leerGuardados() {
  return JSON.parse(localStorage.getItem("nv_usuarios"));
}

describe("usuariosData", () => {
  it("crea un usuario con id correlativo y lo deja guardado en localStorage", () => {
    const creado = crear(nuevaSecretaria);

    expect(creado.id).toBe("U103");
    expect(creado.correo).toBe("paula.lagos@nutrivida.cl");
    expect(creado.activo).toBe(true);
    expect(leerGuardados().find((u) => u.id === "U103")).toMatchObject({ rol: "SECRETARIA" });
  });

  it("rechaza un correo repetido sin distinguir mayúsculas", () => {
    expect(() => crear({ ...nuevaSecretaria, correo: "ADMIN@nutrivida.cl" })).toThrow(
      "Ya existe un usuario con ese correo.",
    );
  });

  it("rechaza un RUT repetido aunque venga sin puntos", () => {
    expect(() => crear({ ...nuevaSecretaria, rut: "9876543-3" })).toThrow(
      "Ya existe un usuario con ese RUT.",
    );
  });

  it("edita un usuario y el cambio sigue al volver a leer", () => {
    actualizar("U102", { telefono: "+56 9 4444 0102", id: "X1" });

    expect(obtener("U102").telefono).toBe("+56 9 4444 0102");
    expect(leerGuardados().some((u) => u.id === "X1")).toBe(false);
  });

  it("desactiva un usuario sin eliminarlo", () => {
    const total = listar().length;

    cambiarEstado("U102", false);

    expect(listar()).toHaveLength(total);
    expect(listar({ activo: false }).map((u) => u.id)).toEqual(["U102"]);
  });

  it("filtra por rol y busca por nombre sin tildes, correo o RUT", () => {
    expect(listar({ rol: "NUTRICIONISTA" })).toHaveLength(4);
    expect(listar({ texto: "tomas" }).map((u) => u.id)).toEqual(["U101"]);
    expect(listar({ texto: "16222333" }).map((u) => u.id)).toEqual(["U010"]);
  });

  it("al quitar el rol de nutricionista libera el nutricionista vinculado", () => {
    const cambiado = cambiarRol("U013", "SECRETARIA");

    expect(cambiado.nutricionistaId).toBeNull();
    expect(() => cambiarRol("U013", "JEFE")).toThrow("El rol no es válido.");
  });

  it("no vincula un nutricionista a dos usuarios", () => {
    expect(() =>
      crear({ ...nuevaSecretaria, rol: "NUTRICIONISTA", nutricionistaId: "NUT001" }),
    ).toThrow("Ese nutricionista ya está vinculado a otro usuario.");
  });

  it("registra un paciente activo aunque los datos pidan otro rol", () => {
    const paciente = registrarPaciente({ ...nuevaSecretaria, rol: "ADMIN", activo: false });

    expect(paciente).toMatchObject({ rol: "PACIENTE", activo: true, nutricionistaId: null });
  });

  it("cambia la clave solo si la actual es correcta", () => {
    expect(() => cambiarClave("U100", "Otra2026!", "Nueva2027!")).toThrow(
      "La contraseña actual no es correcta.",
    );

    cambiarClave("U100", "Paciente2026!", "Nueva2027!");

    expect(leerGuardados().find((u) => u.id === "U100").clave).toBe("Nueva2027!");
  });
});
