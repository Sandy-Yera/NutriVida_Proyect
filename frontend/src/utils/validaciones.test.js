import { describe, expect, it } from "vitest";
import {
  calcularDigitoVerificador,
  validarCambioClave,
  validarClave,
  validarConfirmacion,
  validarCorreo,
  validarFechaNacimiento,
  validarRegistro,
  validarRut,
  validarTelefono,
  validarTexto,
  validarUsuario,
} from "./validaciones.js";

describe("validarRut (G-T1)", () => {
  it("acepta un RUT con dígito verificador correcto", () => {
    expect(validarRut("12.345.678-5")).toBe("");
  });

  it("rechaza un RUT con dígito verificador incorrecto", () => {
    expect(validarRut("12.345.678-9")).toBe("El RUT no es válido: revisa el dígito verificador.");
  });

  it("acepta el RUT sin puntos ni guion y con K minúscula", () => {
    expect(validarRut("123456785")).toBe("");
    expect(validarRut("16.222.333-k")).toBe("");
    expect(calcularDigitoVerificador("12345678")).toBe("5");
  });
});

describe("validarClave (G-T2)", () => {
  it("rechaza claves sin mayúscula, sin número o con menos de 8 caracteres", () => {
    expect(validarClave("paciente2026!")).toBe(
      "La contraseña debe incluir al menos una mayúscula.",
    );
    expect(validarClave("Paciente!!")).toBe("La contraseña debe incluir al menos un número.");
    expect(validarClave("Pa2026!")).toBe("La contraseña debe tener al menos 8 caracteres.");
  });

  it('acepta "Paciente2026!"', () => {
    expect(validarClave("Paciente2026!")).toBe("");
  });
});

describe("validaciones, casos extra", () => {
  it("validarRut pide el RUT y revisa su formato", () => {
    expect(validarRut("  ")).toBe("Ingresa el RUT.");
    expect(validarRut("12.3A5.678-5")).toBe("El RUT debe tener el formato 12.345.678-5.");
  });

  it("validarTelefono exige un celular chileno +56 9 y 8 dígitos", () => {
    expect(validarTelefono("+56 9 1234 5678")).toBe("");
    expect(validarTelefono("+56912345678")).toBe("");
    expect(validarTelefono("912345678")).toBe(
      "El teléfono debe ser un celular chileno: +56 9 y 8 dígitos.",
    );
    expect(validarTelefono("+56 2 1234 5678")).not.toBe("");
  });

  it("validarCorreo rechaza correos sin @ o sin dominio", () => {
    expect(validarCorreo("ana.perez@correo.cl")).toBe("");
    expect(validarCorreo("ana.perez.correo.cl")).toBe(
      "El correo no es válido: usa el formato nombre@dominio.cl.",
    );
    expect(validarCorreo("ana@correo")).not.toBe("");
  });

  it("validarTexto exige letras y un largo razonable", () => {
    expect(validarTexto("Tomás", "El nombre")).toBe("");
    expect(validarTexto("", "El nombre")).toBe("El nombre es obligatorio.");
    expect(validarTexto("A", "El nombre")).toBe("El nombre debe tener entre 2 y 50 caracteres.");
    expect(validarTexto("R2D2", "El nombre")).toBe("El nombre solo puede tener letras.");
  });

  it("validarFechaNacimiento no acepta fechas futuras", () => {
    const hoy = new Date(2026, 9, 11);

    expect(validarFechaNacimiento("2000-05-20", hoy)).toBe("");
    expect(validarFechaNacimiento("2026-10-11", hoy)).toBe("");
    expect(validarFechaNacimiento("2026-10-12", hoy)).toBe(
      "La fecha de nacimiento no puede ser futura.",
    );
    expect(validarFechaNacimiento("", hoy)).toBe("Ingresa la fecha de nacimiento.");
  });

  it("validarConfirmacion compara ambas contraseñas", () => {
    expect(validarConfirmacion("Paciente2026!", "Paciente2026!")).toBe("");
    expect(validarConfirmacion("Paciente2026!", "Paciente2025!")).toBe(
      "Las contraseñas no coinciden.",
    );
  });

  it("validarRegistro devuelve solo los campos con error", () => {
    const errores = validarRegistro(
      {
        nombre: "Ana",
        apellido: "Pérez",
        rut: "12.345.678-9",
        correo: "ana@correo.cl",
        telefono: "+56 9 1234 5678",
        fechaNacimiento: "2000-01-01",
        clave: "Paciente2026!",
        confirmacion: "Paciente2026!",
        acepta: false,
      },
      new Date(2026, 9, 11),
    );

    expect(Object.keys(errores)).toEqual(["rut", "acepta"]);
  });

  it("validarUsuario exige nutricionista solo a ese rol y clave temporal solo al crear", () => {
    const base = {
      nombre: "Paula",
      apellido: "Lagos",
      rut: "11.111.111-1",
      correo: "paula@nutrivida.cl",
      telefono: "+56 9 3333 0001",
      rol: "NUTRICIONISTA",
      nutricionistaId: "",
      clave: "",
    };

    expect(Object.keys(validarUsuario(base, { esNuevo: true }))).toEqual([
      "nutricionistaId",
      "clave",
    ]);
    expect(validarUsuario({ ...base, rol: "SECRETARIA" })).toEqual({});
    expect(validarUsuario({ ...base, rol: "" }).rol).toBe("Selecciona un rol.");
  });

  it("validarCambioClave pide la actual y una nueva distinta que cumpla las reglas", () => {
    expect(
      validarCambioClave({ claveActual: "", claveNueva: "corta", confirmacion: "otra" }),
    ).toEqual({
      claveActual: "Ingresa tu contraseña actual.",
      claveNueva: "La contraseña debe tener al menos 8 caracteres.",
      confirmacion: "Las contraseñas no coinciden.",
    });
    expect(
      validarCambioClave({
        claveActual: "Paciente2026!",
        claveNueva: "Paciente2026!",
        confirmacion: "Paciente2026!",
      }).claveNueva,
    ).toBe("La nueva contraseña debe ser distinta de la actual.");
    expect(
      validarCambioClave({
        claveActual: "Paciente2026!",
        claveNueva: "Nueva2027!",
        confirmacion: "Nueva2027!",
      }),
    ).toEqual({});
  });
});
