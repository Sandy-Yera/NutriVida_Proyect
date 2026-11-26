import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cerrarSesion,
  ingresar,
  obtenerSesion,
  refrescarSesion,
  verificarSesion,
} from "../auth/auth.js";
import { sesionVencida } from "../auth/token.js";
import { listarArticulos, obtenerArticulo } from "./articulosService.js";
import { CLAVE_TOKEN, EVENTO_SESION_EXPIRADA, guardarToken, leerToken } from "./http.js";
import {
  actualizarUsuario,
  cambiarClave,
  cambiarEstado,
  crearUsuario,
  eliminarUsuario,
  listarUsuarios,
  obtenerUsuario,
  registrarPaciente,
} from "./usuariosService.js";

// G-35: login real, sesión con JWT y usuariosService/articulosService en modo API, contra un
// ms-usuarios simulado con fetch. Las demás pruebas siguen en modo local sin cambios.

// JWT de prueba: solo importa la carga (sub, rol, exp). La firma la revisa el backend.
const jwt = (carga) => `x.${btoa(JSON.stringify(carga))}.firma`;
const enUnaHora = () => Math.floor(Date.now() / 1000) + 3600;

const JAVIERA = {
  id: "U100",
  nombre: "Javiera",
  apellido: "Soto",
  rol: "PACIENTE",
  nutricionistaId: null,
  activo: true,
};

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

function ultimaLlamada() {
  const [url, opciones] = fetchMock.mock.calls.at(-1);
  return {
    url,
    metodo: opciones?.method ?? "GET",
    token: opciones?.headers?.Authorization,
    cuerpo: opciones?.body ? JSON.parse(opciones.body) : undefined,
  };
}

beforeEach(() => {
  vi.stubEnv("VITE_API_MODE", "api");
  rutas = {};
  fetchMock = vi.fn(async (url, opciones) => {
    const clave = `${opciones?.method ?? "GET"} ${url.split("?")[0]}`;
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

async function loginComoJaviera() {
  rutas["POST /api/auth/login"] = [
    200,
    {
      token: jwt({ sub: "U100", rol: "PACIENTE", exp: enUnaHora() }),
      tipo: "Bearer",
      usuario: JAVIERA,
    },
  ];
  return ingresar("javiera.soto@correo.cl", "Paciente2026!");
}

describe("auth en modo API (G-35)", () => {
  it("ingresar guarda el token y la sesión que devuelve ms-usuarios", async () => {
    const resultado = await loginComoJaviera();

    expect(resultado).toEqual({
      ok: true,
      usuario: { id: "U100", nombre: "Javiera", rol: "PACIENTE", nutricionistaId: null },
    });
    expect(ultimaLlamada()).toMatchObject({
      url: "/api/auth/login",
      metodo: "POST",
      cuerpo: { correo: "javiera.soto@correo.cl", clave: "Paciente2026!" },
    });
    expect(leerToken()).not.toBeNull();
    expect(obtenerSesion()).toMatchObject({ id: "U100", rol: "PACIENTE" });
  });

  it("una cuenta creada en la API (que no está en data/) mantiene la sesión", async () => {
    rutas["POST /api/auth/login"] = [
      200,
      { token: jwt({ sub: "U104", exp: enUnaHora() }), usuario: { ...JAVIERA, id: "U104" } },
    ];
    await ingresar("nueva@correo.cl", "Clave2026!");

    expect(obtenerSesion()?.id).toBe("U104");
  });

  it("credenciales incorrectas: devuelve el mensaje del backend y no deja token", async () => {
    guardarToken(jwt({ sub: "U999" }));
    rutas["POST /api/auth/login"] = [
      401,
      { status: 401, mensaje: "Correo o contraseña incorrectos." },
    ];

    const resultado = await ingresar("javiera.soto@correo.cl", "mala");

    expect(resultado).toEqual({ ok: false, error: "Correo o contraseña incorrectos." });
    expect(ultimaLlamada().token).toBeUndefined();
    expect(leerToken()).toBeNull();
  });

  it("cuenta desactivada: 403 con el mensaje de la clínica", async () => {
    rutas["POST /api/auth/login"] = [
      403,
      { status: 403, mensaje: "Tu cuenta está desactivada. Contacta a la clínica." },
    ];

    expect(await ingresar("pedro.lagos@correo.cl", "Paciente2026!")).toEqual({
      ok: false,
      error: "Tu cuenta está desactivada. Contacta a la clínica.",
    });
  });

  it("token vencido (más de 8 h): la sesión se cierra sola", async () => {
    await loginComoJaviera();
    localStorage.setItem(CLAVE_TOKEN, jwt({ sub: "U100", exp: 1000 }));

    expect(sesionVencida()).toBe(true);
    expect(obtenerSesion()).toBeNull();
    expect(leerToken()).toBeNull();
    // El aviso "Tu sesión expiró" sobrevive aunque la barra ya borró el token.
    expect(sesionVencida()).toBe(true);
    await loginComoJaviera();
    expect(sesionVencida()).toBe(false);
  });

  it("F5: verificarSesion confirma con /api/auth/me y refresca el nombre", async () => {
    await loginComoJaviera();
    rutas["GET /api/auth/me"] = [200, { ...JAVIERA, nombre: "Javi" }];

    const sesion = await verificarSesion();

    expect(ultimaLlamada()).toMatchObject({
      url: "/api/auth/me",
      token: expect.stringMatching(/^Bearer /),
    });
    expect(sesion.nombre).toBe("Javi");
    expect(obtenerSesion().nombre).toBe("Javi");
  });

  it("F5 con la cuenta desactivada: /me responde 401, se cierra la sesión y se avisa a la app", async () => {
    await loginComoJaviera();
    rutas["GET /api/auth/me"] = [
      401,
      { status: 401, mensaje: "Tu cuenta está desactivada. Contacta a la clínica." },
    ];
    const aviso = vi.fn();
    window.addEventListener(EVENTO_SESION_EXPIRADA, aviso);

    expect(await verificarSesion()).toBeNull();

    window.removeEventListener(EVENTO_SESION_EXPIRADA, aviso);
    expect(aviso).toHaveBeenCalledTimes(1);
    expect(obtenerSesion()).toBeNull();
    expect(leerToken()).toBeNull();
  });

  it("sin conexión con ms-usuarios la sesión guardada se mantiene", async () => {
    await loginComoJaviera();
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    expect((await verificarSesion())?.id).toBe("U100");
  });

  it("cerrarSesion borra la sesión y el token (logout)", async () => {
    await loginComoJaviera();

    cerrarSesion();

    expect(obtenerSesion()).toBeNull();
    expect(leerToken()).toBeNull();
  });

  it("refrescarSesion solo cambia la sesión si es la misma cuenta", async () => {
    await loginComoJaviera();

    refrescarSesion({ ...JAVIERA, id: "U101", nombre: "Otro" });
    expect(obtenerSesion().nombre).toBe("Javiera");
    refrescarSesion({ ...JAVIERA, nombre: "Javi" });
    expect(obtenerSesion().nombre).toBe("Javi");
  });
});

describe("usuariosService en modo API (G-35)", () => {
  beforeEach(loginComoJaviera);

  it("listarUsuarios arma la query con los filtros", async () => {
    rutas["GET /api/usuarios"] = [200, [JAVIERA]];

    expect(await listarUsuarios({ rol: "PACIENTE", activo: true, texto: "" })).toEqual([JAVIERA]);
    expect(ultimaLlamada().url).toBe("/api/usuarios?rol=PACIENTE&activo=true");
  });

  it("obtenerUsuario devuelve null con 404 y lanza el 403 sin cerrar la sesión", async () => {
    expect(await obtenerUsuario("U999")).toBeNull();
    rutas["GET /api/usuarios/U101"] = [
      403,
      { status: 403, mensaje: "Solo puedes ver tu propia cuenta." },
    ];

    await expect(obtenerUsuario("U101")).rejects.toMatchObject({
      estado: 403,
      message: "Solo puedes ver tu propia cuenta.",
    });
    expect(obtenerSesion()?.id).toBe("U100");
  });

  it("crearUsuario envía la clave pero no los campos vacíos ni la confirmación", async () => {
    rutas["POST /api/usuarios"] = [201, { id: "U104" }];

    await crearUsuario({
      nombre: "Ignacio",
      rol: "SECRETARIA",
      nutricionistaId: "",
      clave: "Clave2026!",
      confirmacion: "Clave2026!",
    });

    expect(ultimaLlamada()).toMatchObject({
      metodo: "POST",
      cuerpo: { nombre: "Ignacio", rol: "SECRETARIA", clave: "Clave2026!" },
    });
    expect(ultimaLlamada().cuerpo).not.toHaveProperty("confirmacion");
    expect(ultimaLlamada().cuerpo).not.toHaveProperty("nutricionistaId");
  });

  it("crearUsuario con correo repetido: el 409 trae el campo para el formulario", async () => {
    rutas["POST /api/usuarios"] = [
      409,
      {
        status: 409,
        mensaje: "Ya existe un usuario con ese correo.",
        errores: { correo: "Ya existe un usuario con ese correo." },
      },
    ];

    await expect(crearUsuario({ correo: "admin@nutrivida.cl" })).rejects.toMatchObject({
      estado: 409,
      campo: "correo",
    });
  });

  it("actualizarUsuario hace PATCH sin la clave y refresca el nombre de la barra", async () => {
    rutas["PATCH /api/usuarios/U100"] = [200, { ...JAVIERA, nombre: "Javi" }];

    await actualizarUsuario("U100", { nombre: "Javi", clave: "x", id: "U100" });

    expect(ultimaLlamada()).toMatchObject({ metodo: "PATCH", cuerpo: { nombre: "Javi" } });
    expect(obtenerSesion().nombre).toBe("Javi");
  });

  it("cambiarEstado, eliminarUsuario, registrarPaciente y cambiarClave usan su endpoint", async () => {
    rutas["PATCH /api/usuarios/U101/estado"] = [200, { id: "U101", activo: false }];
    rutas["DELETE /api/usuarios/U103"] = [204];
    rutas["POST /api/auth/registro"] = [201, { id: "U104" }];
    rutas["PUT /api/usuarios/U100/clave"] = [200, JAVIERA];

    await cambiarEstado("U101", false);
    expect(ultimaLlamada()).toMatchObject({ metodo: "PATCH", cuerpo: { activo: false } });
    await eliminarUsuario("U103");
    expect(ultimaLlamada()).toMatchObject({ url: "/api/usuarios/U103", metodo: "DELETE" });
    await registrarPaciente({ nombre: "Camila", clave: "Clave2026!" });
    expect(ultimaLlamada()).toMatchObject({
      url: "/api/auth/registro",
      cuerpo: { clave: "Clave2026!" },
    });
    await cambiarClave("U100", "Paciente2026!", "Nueva2026!");
    expect(ultimaLlamada().cuerpo).toEqual({
      claveActual: "Paciente2026!",
      claveNueva: "Nueva2026!",
    });
  });
});

describe("articulosService en modo API (G-35)", () => {
  it("lista y obtiene consejos sin token; un consejo inexistente es null", async () => {
    rutas["GET /api/articulos"] = [200, [{ id: "a" }]];

    expect(await listarArticulos()).toEqual([{ id: "a" }]);
    expect(ultimaLlamada().token).toBeUndefined();
    expect(await obtenerArticulo("no-existe")).toBeNull();
  });
});
