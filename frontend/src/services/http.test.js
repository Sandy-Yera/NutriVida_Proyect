import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EVENTO_SESION_EXPIRADA,
  apiFetch,
  apiFetchONull,
  guardarToken,
  leerToken,
  query,
  usarApi,
} from "./http.js";
import { iniciarSesion, obtenerSesion } from "../auth/auth.js";

function responder(status, cuerpo) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => (cuerpo === undefined ? "" : "application/json") },
    json: async () => cuerpo,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("http.js (cliente de la API, EP3)", () => {
  it("las pruebas corren en modo local: VITE_API_MODE no está definido", () => {
    expect(usarApi()).toBe(false);
  });

  it("envía el token y el cuerpo como JSON", async () => {
    const fetchMock = responder(201, { id: "C0006" });
    vi.stubGlobal("fetch", fetchMock);
    guardarToken("abc.def.ghi");

    const cita = await apiFetch("/api/citas", { method: "POST", body: { hora: "09:00" } });

    expect(cita).toEqual({ id: "C0006" });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/citas");
    expect(opciones.headers).toMatchObject({
      Authorization: "Bearer abc.def.ghi",
      "Content-Type": "application/json",
    });
    expect(opciones.body).toBe('{"hora":"09:00"}');
  });

  it("convierte el JSON de error común en un ErrorApi que la UI ya sabe mostrar", async () => {
    vi.stubGlobal(
      "fetch",
      responder(409, {
        timestamp: "2026-11-20T15:04:05Z",
        status: 409,
        error: "Conflict",
        mensaje: "Ese horario ya está tomado. Elige otra hora.",
        ruta: "/api/citas",
        errores: { hora: "Ese horario ya está tomado. Elige otra hora." },
      }),
    );

    await expect(apiFetch("/api/citas", { method: "POST", body: {} })).rejects.toMatchObject({
      estado: 409,
      campo: "hora",
      message: "Ese horario ya está tomado. Elige otra hora.",
    });
  });

  it("ante un 401 con token cierra la sesión, borra el token y avisa a la app", async () => {
    iniciarSesion("ana.perez@correo.cl", "Paciente2026!");
    guardarToken("vencido");
    const aviso = vi.fn();
    window.addEventListener(EVENTO_SESION_EXPIRADA, aviso);
    vi.stubGlobal(
      "fetch",
      responder(401, { status: 401, mensaje: "Tu sesión expiró. Inicia sesión nuevamente." }),
    );

    await expect(apiFetch("/api/citas/mias")).rejects.toMatchObject({ estado: 401 });

    expect(obtenerSesion()).toBeNull();
    expect(leerToken()).toBeNull();
    expect(aviso).toHaveBeenCalledTimes(1);
    window.removeEventListener(EVENTO_SESION_EXPIRADA, aviso);
  });

  it("sin servidor responde un error legible; 204 da null; 404 en apiFetchONull da null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiFetch("/api/citas")).rejects.toMatchObject({ codigo: "SIN_CONEXION" });

    vi.stubGlobal("fetch", responder(204));
    expect(await apiFetch("/api/citas/C1", { method: "DELETE" })).toBeNull();

    vi.stubGlobal("fetch", responder(404, { status: 404, mensaje: "La cita no existe." }));
    expect(await apiFetchONull("/api/citas/C9")).toBeNull();
  });

  it("query omite los filtros vacíos", () => {
    expect(query({ estado: "PENDIENTE", desde: "", hasta: undefined })).toBe("?estado=PENDIENTE");
    expect(query({})).toBe("");
  });
});
