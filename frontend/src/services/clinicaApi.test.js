import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cerrarSesion, iniciarSesion } from "../auth/auth.js";
import * as contactosData from "../data/contactosData.js";
import {
  crearFicha,
  guardarPlan,
  listarPacientes,
  obtenerFicha,
  obtenerPlan,
  registrarMedicion,
} from "./fichasService.js";
import { borrarToken, guardarToken } from "./http.js";
import {
  actualizarFotoNutricionista,
  cambiarEstadoServicio,
  crearServicio,
  eliminarFotoNutricionista,
  listarNutricionistas,
  listarServicios,
  obtenerServicio,
  registrarContacto,
} from "./serviciosService.js";

// C-34: serviciosService y fichasService en modo API (VITE_API_MODE=api) contra un ms-clinica
// simulado con fetch. Las demás pruebas siguen en modo local. El token es el del login real
// (G-32): entrar() lo deja guardado como lo haría Login.jsx.

const tokenDe = (sub) => `x.${btoa(JSON.stringify({ sub, rol: "X" }))}.firma`;

// Sesión de EP2 más el token que guardaría el login real.
function entrar(correo, clave) {
  const resultado = iniciarSesion(correo, clave);
  guardarToken(tokenDe(resultado.usuario.id));
  return resultado;
}

const SERVICIO = { codigo: "CN001", tipo: "CONSULTA", nombre: "Primera consulta", precio: 35000 };
const FICHA = { id: "U100", nutricionistaId: "NUT001", objetivo: "PERDIDA_PESO" };

let rutas;
let fetchMock;

function responder(status, cuerpo) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => (cuerpo === undefined ? "" : "application/json") },
    json: async () => cuerpo,
  };
}

// Llamadas a ms-clinica.
function llamadas() {
  return fetchMock.mock.calls.map(([url, opciones]) => ({
    url,
    metodo: opciones?.method ?? "GET",
    token: opciones?.headers?.Authorization,
    body: opciones?.body,
    cuerpo: typeof opciones?.body === "string" ? JSON.parse(opciones.body) : undefined,
  }));
}

beforeEach(() => {
  vi.stubEnv("VITE_API_MODE", "api");
  borrarToken();
  cerrarSesion();
  rutas = {};
  fetchMock = vi.fn(async (url, opciones) => {
    const metodo = opciones?.method ?? "GET";
    const [status, cuerpo] = rutas[`${metodo} ${url.split("?")[0]}`] ?? [
      404,
      { status: 404, mensaje: "La ruta solicitada no existe." },
    ];
    return responder(status, cuerpo);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("modo API: catálogo de ms-clinica", () => {
  it("lista servicios sin token y pide los desactivados solo con soloActivos=false", async () => {
    rutas["GET /api/servicios"] = [200, [SERVICIO]];

    expect(await listarServicios({ tipo: "CONSULTA" })).toEqual([SERVICIO]);
    await listarServicios({ soloActivos: false });

    const [primera, segunda] = llamadas();
    expect(primera.url).toBe("/api/servicios?tipo=CONSULTA");
    expect(primera.token).toBeUndefined();
    expect(segunda.url).toBe("/api/servicios?soloActivos=false");
  });

  it("obtenerServicio devuelve null ante un 404, como en modo local", async () => {
    expect(await obtenerServicio("XX999")).toBeNull();
  });

  it("si ms-clinica no responde, el catálogo usa las semillas de EP2 (como el modo auto)", async () => {
    fetchMock.mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });

    expect((await listarServicios()).length).toBe(18);
    expect((await obtenerServicio("CN001")).nombre).toBe("Primera consulta nutricional");
    expect((await listarNutricionistas()).map((n) => n.id)).toContain("NUT004");
  });

  it("crear un servicio sin conexión no usa el respaldo: avisa el error", async () => {
    entrar("admin@nutrivida.cl", "Admin2026!");
    fetchMock.mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(crearServicio({ codigo: "CN006" })).rejects.toMatchObject({
      codigo: "SIN_CONEXION",
    });
  });

  it("lista los nutricionistas de /api/nutricionistas", async () => {
    rutas["GET /api/nutricionistas"] = [200, [{ id: "NUT001", dias: [1, 3, 5] }]];
    expect(await listarNutricionistas()).toEqual([{ id: "NUT001", dias: [1, 3, 5] }]);
  });
});

describe("modo API: administración de servicios", () => {
  beforeEach(() => entrar("admin@nutrivida.cl", "Admin2026!"));

  it("crearServicio envía números (no texto) con el token del admin", async () => {
    rutas["POST /api/servicios"] = [201, { ...SERVICIO, codigo: "CN006" }];

    await crearServicio({ codigo: "cn006", tipo: "PLAN", duracionMin: "", precio: "30000" });

    const [post] = llamadas();
    expect(post.metodo).toBe("POST");
    expect(post.token).toBe(`Bearer ${tokenDe("U001")}`);
    expect(post.cuerpo).toMatchObject({ codigo: "cn006", duracionMin: null, precio: 30000 });
  });

  it("un 409 del backend llega con el campo para mostrarlo bajo el input", async () => {
    rutas["POST /api/servicios"] = [
      409,
      {
        status: 409,
        mensaje: "Ya existe un servicio con ese código.",
        errores: { codigo: "Ya existe un servicio con ese código." },
      },
    ];

    await expect(crearServicio({ codigo: "CN001" })).rejects.toMatchObject({
      estado: 409,
      campo: "codigo",
      message: "Ya existe un servicio con ese código.",
    });
  });

  it("cambiarEstadoServicio usa PATCH /estado", async () => {
    rutas["PATCH /api/servicios/TG002/estado"] = [200, { codigo: "TG002", activo: false }];
    await cambiarEstadoServicio("TG002", false);
    expect(llamadas()[0]).toMatchObject({ metodo: "PATCH", cuerpo: { activo: false } });
  });
});

describe("modo API: foto del nutricionista", () => {
  it("sube la foto como multipart (parte foto)", async () => {
    entrar("cfuentes@nutrivida.cl", "Nutri2026!");
    rutas["PUT /api/nutricionistas/NUT001/foto"] = [200, { id: "NUT001", fotoUrl: "/api/x?v=1" }];
    const archivo = new File([new Uint8Array([1, 2, 3])], "yo.png", { type: "image/png" });

    const nutricionista = await actualizarFotoNutricionista("NUT001", archivo);

    const [put] = llamadas();
    expect(put.metodo).toBe("PUT");
    expect(put.body).toBeInstanceOf(FormData);
    expect(put.body.get("foto")).toBeInstanceOf(Blob);
    expect(nutricionista.fotoUrl).toBe("/api/x?v=1");
  });

  it("al quitar la foto devuelve el nutricionista actualizado", async () => {
    entrar("cfuentes@nutrivida.cl", "Nutri2026!");
    rutas["DELETE /api/nutricionistas/NUT001/foto"] = [204];
    rutas["GET /api/nutricionistas/NUT001"] = [200, { id: "NUT001", fotoUrl: null }];

    expect(await eliminarFotoNutricionista("NUT001")).toEqual({ id: "NUT001", fotoUrl: null });
  });
});

describe("modo API: contacto", () => {
  it("con sesión lo envía a ms-clinica", async () => {
    entrar("javiera.soto@correo.cl", "Paciente2026!");
    rutas["POST /api/contactos"] = [201, { id: "CT003" }];
    expect(await registrarContacto({ nombre: "Ana" })).toEqual({ id: "CT003" });
  });

  it("un visitante sin sesión que recibe 401 lo guarda en el navegador (pendiente de integración)", async () => {
    rutas["POST /api/contactos"] = [401, { status: 401, mensaje: "Debes iniciar sesión." }];
    const registrar = vi.spyOn(contactosData, "registrar");

    await registrarContacto({ nombre: "Ana", correo: "ana@correo.cl", mensaje: "Hola, consulta." });

    expect(registrar).toHaveBeenCalled();
  });

  it("un 400 llega con los errores por campo para el formulario", async () => {
    rutas["POST /api/contactos"] = [
      400,
      {
        status: 400,
        mensaje: "Revisa los datos ingresados.",
        errores: { nombre: "Ingresa tu nombre.", mensaje: "Escribe tu mensaje." },
      },
    ];
    await expect(registrarContacto({})).rejects.toMatchObject({
      estado: 400,
      errores: { nombre: "Ingresa tu nombre.", mensaje: "Escribe tu mensaje." },
    });
  });
});

describe("modo API: fichasService", () => {
  beforeEach(() => entrar("cfuentes@nutrivida.cl", "Nutri2026!"));

  it("listarPacientes pide los del nutricionista con su token", async () => {
    rutas["GET /api/pacientes"] = [200, [FICHA]];

    expect(await listarPacientes("NUT001")).toEqual([FICHA]);
    expect(llamadas()[0]).toMatchObject({
      url: "/api/pacientes?nutricionistaId=NUT001",
      token: `Bearer ${tokenDe("U010")}`,
    });
  });

  it("sin ficha o sin plan devuelve null (404), y un 403 llega con su mensaje", async () => {
    expect(await obtenerFicha("U102")).toBeNull();
    expect(await obtenerPlan("U102")).toBeNull();

    rutas["GET /api/pacientes/U101/plan"] = [
      403,
      { status: 403, mensaje: "No tienes acceso a la ficha de este paciente." },
    ];
    await expect(obtenerPlan("U101")).rejects.toMatchObject({
      estado: 403,
      message: "No tienes acceso a la ficha de este paciente.",
    });
  });

  it("registrarMedicion envía los números y null en los opcionales vacíos", async () => {
    rutas["POST /api/pacientes/U100/mediciones"] = [201, { id: "M0008" }];

    await registrarMedicion("U100", {
      fecha: "2026-11-20",
      pesoKg: "71.8",
      tallaCm: "170",
      cinturaCm: "",
    });

    expect(llamadas()[0].cuerpo).toEqual({
      fecha: "2026-11-20",
      pesoKg: 71.8,
      tallaCm: 170,
      cinturaCm: null,
      caderaCm: null,
      grasaPct: null,
      notas: "",
    });
  });

  it("crearFicha y guardarPlan usan POST y PUT de /api/pacientes", async () => {
    rutas["POST /api/pacientes"] = [201, FICHA];
    rutas["PUT /api/pacientes/U100/plan"] = [200, { id: "PA003" }];

    await crearFicha({ id: "U100", nutricionistaId: "NUT001", objetivo: "PERDIDA_PESO" });
    await guardarPlan("U100", { objetivo: "Mantención", kcalDiarias: "1900", comidas: {} });

    const [post, put] = llamadas();
    expect(post.metodo).toBe("POST");
    expect(put).toMatchObject({ metodo: "PUT", cuerpo: { kcalDiarias: 1900 } });
  });
});
