import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { iniciarSesion } from "../auth/auth.js";
import {
  cambiarEstado,
  crearCita,
  estadisticas,
  horariosDisponibles,
  listarCitas,
  obtenerCita,
  pagarYCrearCita,
  proximasHorasLibres,
  reprogramarCita,
} from "./citasService.js";
import { CLAVE_TOKEN, leerToken, usarApi } from "./http.js";
import { listarPagos, obtenerPago, procesarPago } from "./pagosService.js";
import { usuarioDelToken } from "./tokenPuente.js";

// R9: los services de citas y pagos en modo API (VITE_API_MODE=api), contra un ms-citas
// simulado con fetch. Las demás pruebas de Vitest siguen en modo local sin cambios.
// Mientras no hay login real (G-32), el token sale del perfil dev de ms-citas (tokenPuente).

const tokenDe = (sub) => `x.${btoa(JSON.stringify({ sub, rol: "X" }))}.firma`;

const CITA = {
  id: "C0006",
  pacienteId: "U100",
  nutricionistaId: "NUT001",
  servicioCodigo: "CN002",
  fecha: "2026-11-25",
  hora: "10:00",
  duracionMin: 30,
  motivo: "Control mensual de peso",
  estado: "PENDIENTE",
  pagoId: "P0006",
  historial: [],
  creadaEn: "2026-11-12",
};

// Respuestas por "MÉTODO ruta" (sin query). Lo que no está responde 404 con el JSON común.
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

function llamadas() {
  return fetchMock.mock.calls.map(([url, opciones]) => ({
    url,
    metodo: opciones?.method ?? "GET",
    token: opciones?.headers?.Authorization,
    cuerpo: opciones?.body ? JSON.parse(opciones.body) : undefined,
  }));
}

const aApi = () => llamadas().filter((l) => l.url !== "/api/dev/token");

beforeEach(() => {
  vi.stubEnv("VITE_API_MODE", "api");
  rutas = {};
  fetchMock = vi.fn(async (url, opciones) => {
    const clave = `${opciones?.method ?? "GET"} ${url.split("?")[0]}`;
    if (clave === "POST /api/dev/token") {
      const { id } = JSON.parse(opciones.body);
      return responder(200, { token: tokenDe(id) });
    }
    const [status, cuerpo] = rutas[clave] ?? [
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

describe("modo API: puente de token (plan B de G-32)", () => {
  it("usarApi() responde true con VITE_API_MODE=api", () => {
    expect(usarApi()).toBe(true);
  });

  it("cambia la sesión local por un token del perfil dev y lo reutiliza", async () => {
    iniciarSesion("javiera.soto@correo.cl", "Paciente2026!");
    rutas["GET /api/citas/mias"] = [200, [CITA]];

    await listarCitas({ pacienteId: "U100" });
    await listarCitas({ pacienteId: "U100" });

    const pedidos = llamadas().filter((l) => l.url === "/api/dev/token");
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].cuerpo).toMatchObject({ id: "U100", rol: "PACIENTE" });
    expect(usuarioDelToken(leerToken())).toBe("U100");
    expect(aApi().every((l) => l.token === `Bearer ${tokenDe("U100")}`)).toBe(true);
  });

  it("si el token guardado es de otro usuario, pide uno nuevo", async () => {
    localStorage.setItem(CLAVE_TOKEN, tokenDe("U101"));
    iniciarSesion("javiera.soto@correo.cl", "Paciente2026!");
    rutas["GET /api/citas/mias"] = [200, []];

    await listarCitas({ pacienteId: "U100" });

    expect(usuarioDelToken(leerToken())).toBe("U100");
  });

  it("sin el perfil dev (404, como en la entrega) no inventa token", async () => {
    iniciarSesion("javiera.soto@correo.cl", "Paciente2026!");
    fetchMock.mockImplementation(async () =>
      responder(404, { status: 404, mensaje: "La ruta solicitada no existe." }),
    );

    await expect(listarCitas({ pacienteId: "U100" })).rejects.toMatchObject({ estado: 404 });
    expect(leerToken()).toBeNull();
  });

  it("usuarioDelToken devuelve null con un texto que no es JWT", () => {
    expect(usuarioDelToken("no-es-un-jwt")).toBeNull();
  });
});

describe("modo API: citasService", () => {
  it("cada rol lista por su ruta del contrato §6 y se aplican los mismos filtros", async () => {
    rutas["GET /api/citas/mias"] = [200, [CITA, { ...CITA, id: "C0007", estado: "CANCELADA" }]];
    rutas["GET /api/citas/agenda"] = [200, [CITA]];
    rutas["GET /api/citas"] = [200, [CITA]];

    iniciarSesion("javiera.soto@correo.cl", "Paciente2026!");
    expect(await listarCitas({ pacienteId: "U100", estado: "PENDIENTE" })).toEqual([CITA]);

    iniciarSesion("cfuentes@nutrivida.cl", "Nutri2026!");
    await listarCitas({ nutricionistaId: "NUT001", desde: "2026-11-23", hasta: "2026-11-29" });

    iniciarSesion("recepcion@nutrivida.cl", "Recepcion2026!");
    await listarCitas({ estado: "PENDIENTE" });

    expect(aApi().map((l) => l.url)).toEqual([
      "/api/citas/mias",
      "/api/citas/agenda?desde=2026-11-23&hasta=2026-11-29",
      "/api/citas?estado=PENDIENTE",
    ]);
  });

  it("obtenerCita devuelve null con 404, como en modo local", async () => {
    iniciarSesion("recepcion@nutrivida.cl", "Recepcion2026!");
    rutas["GET /api/citas/C0006"] = [200, CITA];

    expect(await obtenerCita("C0006")).toEqual(CITA);
    expect(await obtenerCita("C9999")).toBeNull();
  });

  it("pagarYCrearCita: una sola llamada con la reserva y la tarjeta; 201 → aprobado", async () => {
    iniciarSesion("javiera.soto@correo.cl", "Paciente2026!");
    rutas["POST /api/citas"] = [201, CITA];
    const reserva = {
      servicioCodigo: "CN002",
      nutricionistaId: "NUT001",
      fecha: "2026-11-25",
      hora: "10:00",
      motivo: "Control mensual de peso",
      paso: 4,
    };
    const tarjeta = {
      titular: "Javiera Soto",
      numero: "4242 4242 4242 4242",
      vencimiento: "12/28",
      cvv: "123",
    };

    expect(await pagarYCrearCita({ reserva, tarjeta })).toEqual({ aprobado: true, cita: CITA });
    const [post] = aApi();
    expect(post.metodo).toBe("POST");
    expect(post.cuerpo).toEqual({
      servicioCodigo: "CN002",
      nutricionistaId: "NUT001",
      fecha: "2026-11-25",
      hora: "10:00",
      motivo: "Control mensual de peso",
      tarjeta,
    });
  });

  it("pagarYCrearCita: 402 → { aprobado: false, motivo }; 409 se lanza con su campo", async () => {
    iniciarSesion("javiera.soto@correo.cl", "Paciente2026!");
    const reserva = {
      servicioCodigo: "CN002",
      nutricionistaId: "NUT001",
      fecha: "2026-11-25",
      hora: "10:00",
      motivo: "x",
    };
    rutas["POST /api/citas"] = [402, { status: 402, mensaje: "El banco rechazó la tarjeta." }];
    expect(await pagarYCrearCita({ reserva, tarjeta: {} })).toEqual({
      aprobado: false,
      motivo: "El banco rechazó la tarjeta.",
    });

    rutas["POST /api/citas"] = [
      409,
      {
        status: 409,
        mensaje: "Esa hora no está disponible.",
        errores: { hora: "Esa hora no está disponible." },
      },
    ];
    await expect(pagarYCrearCita({ reserva, tarjeta: {} })).rejects.toMatchObject({
      estado: 409,
      campo: "hora",
    });
  });

  it("cambiarEstado y reprogramarCita mandan solo el dato que cambia: el usuario sale del token", async () => {
    iniciarSesion("recepcion@nutrivida.cl", "Recepcion2026!");
    rutas["PATCH /api/citas/C0006/estado"] = [200, { ...CITA, estado: "CONFIRMADA" }];
    rutas["PATCH /api/citas/C0006/reprogramar"] = [200, { ...CITA, hora: "11:00" }];

    expect((await cambiarEstado("C0006", "CONFIRMADA", "U002")).estado).toBe("CONFIRMADA");
    expect((await reprogramarCita("C0006", "2026-11-25", "11:00", "U002")).hora).toBe("11:00");
    expect(aApi().map((l) => [l.metodo, l.cuerpo])).toEqual([
      ["PATCH", { estado: "CONFIRMADA" }],
      ["PATCH", { fecha: "2026-11-25", hora: "11:00" }],
    ]);
  });

  it("disponibilidad y próximas horas son públicas: sin token ni puente", async () => {
    rutas["GET /api/disponibilidad"] = [200, ["09:00", "09:30"]];
    rutas["GET /api/disponibilidad/proximas"] = [
      200,
      [{ nutricionistaId: "NUT003", fecha: "2026-11-16", hora: "08:30" }],
    ];

    expect(await horariosDisponibles("NUT001", "2026-11-25", 50, "C0006")).toEqual([
      "09:00",
      "09:30",
    ]);
    expect(await proximasHorasLibres(6)).toHaveLength(1);
    expect(llamadas().map((l) => l.url)).toEqual([
      "/api/disponibilidad?nutricionistaId=NUT001&fecha=2026-11-25&duracion=50&excluir=C0006",
      "/api/disponibilidad/proximas?cantidad=6",
    ]);
    expect(llamadas().every((l) => l.token === undefined)).toBe(true);
  });

  it("estadisticas va a /api/citas/estadisticas con el período", async () => {
    iniciarSesion("admin@nutrivida.cl", "Admin2026!");
    rutas["GET /api/citas/estadisticas"] = [200, { total: 0 }];

    expect(await estadisticas("2026-11-01", "2026-11-30")).toEqual({ total: 0 });
    expect(aApi()[0].url).toBe("/api/citas/estadisticas?desde=2026-11-01&hasta=2026-11-30");
  });

  it("crearCita por separado no existe en modo API (pago y cita van juntos)", async () => {
    await expect(crearCita({ pagoId: "P0006" })).rejects.toMatchObject({ estado: 409 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("modo API: pagosService", () => {
  it("comprobante y lista del admin se leen de ms-citas", async () => {
    iniciarSesion("admin@nutrivida.cl", "Admin2026!");
    rutas["GET /api/pagos/P0006"] = [200, { id: "P0006", citaId: "C0006" }];
    rutas["GET /api/pagos"] = [200, []];

    expect(await obtenerPago("P0006")).toMatchObject({ citaId: "C0006" });
    expect(await obtenerPago("P9999")).toBeNull();
    await listarPagos({ citaIds: ["C0001", "C0006"] });
    expect(aApi().at(-1).url).toBe("/api/pagos?citaIds=C0001%2CC0006");
  });

  it("procesarPago no existe en modo API", async () => {
    await expect(procesarPago({ numero: "4242" })).rejects.toMatchObject({ estado: 409 });
  });
});
