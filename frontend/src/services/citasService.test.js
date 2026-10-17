import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cambiarEstado,
  crearCita,
  estadisticas,
  horariosDisponibles,
  listarCitas,
  obtenerCita,
  proximasHorasLibres,
  puedeAgendarTeleconsulta,
  reprogramarCita,
} from "./citasService.js";
import { crear } from "../data/citasData.js";
import { crear as crearPago, obtener as obtenerPago } from "../data/pagosData.js";

const ids = (citas) => citas.map((c) => c.id);

// RN-13 y RN-30: crearCita y reprogramarCita usan la fecha de hoy. Se fija el reloj (solo Date)
// para que las pruebas den lo mismo cualquier día en que se corran.
function fijarReloj(anio, mes, dia, hora = 8, minuto = 0) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(anio, mes - 1, dia, hora, minuto));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("citasService: listarCitas", () => {
  it("sin filtros devuelve todas las citas ordenadas por fecha y hora", async () => {
    const citas = await listarCitas();

    expect(citas).toHaveLength(5);
    const claves = citas.map((c) => `${c.fecha} ${c.hora}`);
    expect(claves).toEqual([...claves].sort());
  });

  it("filtra por estado (lo usa el dashboard para las citas por confirmar)", async () => {
    expect(ids(await listarCitas({ estado: "PENDIENTE" })).sort()).toEqual(["C0004", "C0005"]);
  });

  it("filtra por paciente (Mi progreso) y por nutricionista (Mis pacientes)", async () => {
    expect(ids(await listarCitas({ pacienteId: "U100" }))).toEqual(["C0001", "C0003"]);
    expect(ids(await listarCitas({ nutricionistaId: "NUT002" }))).toEqual(["C0002", "C0005"]);
  });

  it("filtra por rango de fechas con los extremos incluidos", async () => {
    crear({
      pacienteId: "U102",
      nutricionistaId: "NUT003",
      servicioCodigo: "CN002",
      motivo: "Control mensual de peso",
      fecha: "2030-03-04",
      hora: "09:00",
    });
    crear({
      pacienteId: "U102",
      nutricionistaId: "NUT003",
      servicioCodigo: "CN002",
      motivo: "Control mensual de peso",
      fecha: "2030-03-06",
      hora: "09:00",
    });

    const citas = await listarCitas({ desde: "2030-03-04", hasta: "2030-03-05" });

    expect(ids(citas)).toEqual(["C0006"]);
  });

  it("combina filtros", async () => {
    expect(ids(await listarCitas({ pacienteId: "U101", estado: "PENDIENTE" }))).toEqual(["C0005"]);
  });

  it("lee las citas guardadas, no solo la semilla", async () => {
    crear({
      pacienteId: "U101",
      nutricionistaId: "NUT003",
      servicioCodigo: "CN002",
      motivo: "Control mensual de peso",
      fecha: "2030-01-10",
      hora: "08:00",
    });

    expect(ids(await listarCitas({ estado: "PENDIENTE" }))).toContain("C0006");
  });
});

describe("citasService: obtenerCita", () => {
  it("devuelve la cita guardada o null si no existe", async () => {
    expect(await obtenerCita("C0002")).toMatchObject({ estado: "INASISTENCIA" });
    expect(await obtenerCita("C9999")).toBeNull();
  });
});

describe("citasService: cambiarEstado", () => {
  it("confirma una cita pendiente y registra quién lo hizo", async () => {
    const cita = await cambiarEstado("C0004", "CONFIRMADA", "U002");

    expect(cita.estado).toBe("CONFIRMADA");
    expect(cita.historial.at(-1)).toMatchObject({ de: "PENDIENTE", a: "CONFIRMADA", por: "U002" });
    expect(obtenerPago("P0004").estado).toBe("APROBADO");
  });

  it("al cancelar una cita deja su pago como REEMBOLSADO", async () => {
    await cambiarEstado("C0004", "CANCELADA", "U102");

    expect((await obtenerCita("C0004")).estado).toBe("CANCELADA");
    expect(obtenerPago("P0004").estado).toBe("REEMBOLSADO");
  });

  it("rechaza una transición no permitida sin tocar la cita ni el pago", async () => {
    await expect(cambiarEstado("C0001", "CANCELADA", "U100")).rejects.toThrow("No se puede pasar");

    expect((await obtenerCita("C0001")).estado).toBe("ATENDIDA");
    expect(obtenerPago("P0001").estado).toBe("APROBADO");
  });

  it("avisa si la cita no existe", async () => {
    await expect(cambiarEstado("C9999", "CONFIRMADA", "U002")).rejects.toThrow("no existe");
  });
});

describe("citasService: reprogramarCita", () => {
  // Hoy fingido: lunes 28 de enero de 2030. El 1 de febrero (viernes) atiende Carolina (NUT001).
  beforeEach(() => fijarReloj(2030, 1, 28));

  it("mueve la cita, la deja PENDIENTE y anota quién la reprogramó", async () => {
    const cita = await reprogramarCita("C0003", "2030-02-01", "11:30", "U100");

    expect(cita).toMatchObject({ fecha: "2030-02-01", hora: "11:30", estado: "PENDIENTE" });
    expect(cita.historial.at(-1)).toMatchObject({ de: "CONFIRMADA", a: "PENDIENTE", por: "U100" });
  });

  it("no mueve la cita fuera de la jornada ni más allá de 60 días (RN-09, RN-13)", async () => {
    await expect(reprogramarCita("C0003", "2030-02-01", "18:00", "U100")).rejects.toThrow(
      "no está disponible",
    );
    await expect(reprogramarCita("C0003", "2030-04-05", "11:30", "U100")).rejects.toThrow(
      "60 días",
    );
    expect((await obtenerCita("C0003")).estado).toBe("CONFIRMADA");
  });

  it("no reprograma una cita cancelada", async () => {
    await cambiarEstado("C0005", "CANCELADA", "U101");

    await expect(reprogramarCita("C0005", "2030-02-01", "11:30", "U101")).rejects.toThrow(
      "Solo se puede reprogramar",
    );
  });
});

describe("citasService: estadisticas", () => {
  it("entrega la forma que esperan el dashboard y los reportes", async () => {
    const resultado = await estadisticas("2030-01-01", "2030-01-31");

    expect(Object.keys(resultado).sort()).toEqual([
      "atendidas",
      "inasistencias",
      "porNutricionista",
      "porSemana",
      "tasaInasistencia",
      "total",
    ]);
    expect(resultado.porNutricionista.map((fila) => fila.nutricionistaId)).toEqual([
      "NUT001",
      "NUT002",
      "NUT003",
      "NUT004",
    ]);
  });

  it("calcula desde las citas guardadas y cambia con el período", async () => {
    crear({
      pacienteId: "U102",
      nutricionistaId: "NUT003",
      servicioCodigo: "CN002",
      motivo: "Control mensual de peso",
      fecha: "2030-01-08",
      hora: "09:00",
    });
    crear({
      pacienteId: "U101",
      nutricionistaId: "NUT002",
      servicioCodigo: "CN002",
      motivo: "Control mensual de peso",
      fecha: "2030-02-05",
      hora: "09:00",
    });

    const enero = await estadisticas("2030-01-01", "2030-01-31");
    const febrero = await estadisticas("2030-02-01", "2030-02-28");

    expect(enero.total).toBe(1);
    expect(enero.porNutricionista.find((f) => f.nutricionistaId === "NUT003").total).toBe(1);
    expect(febrero.total).toBe(1);
    expect(febrero.porNutricionista.find((f) => f.nutricionistaId === "NUT002").total).toBe(1);
  });

  it("no cuenta una cita que se canceló", async () => {
    const nueva = crear({
      pacienteId: "U102",
      nutricionistaId: "NUT003",
      servicioCodigo: "CN002",
      motivo: "Control mensual de peso",
      fecha: "2030-03-05",
      hora: "09:00",
    });
    await cambiarEstado(nueva.id, "CANCELADA", "U102");

    expect((await estadisticas("2030-03-01", "2030-03-31")).total).toBe(0);
  });
});

describe("citasService: horariosDisponibles al reprogramar", () => {
  it("con idExcluido, la propia cita no ocupa su horario", async () => {
    const propia = crear({
      pacienteId: "U102",
      nutricionistaId: "NUT003",
      servicioCodigo: "CN001",
      motivo: "Primera consulta de prueba",
      fecha: "2030-01-07",
      hora: "09:00",
      duracionMin: 50,
    });

    expect(await horariosDisponibles("NUT003", "2030-01-07", 50)).not.toContain("09:30");
    expect(await horariosDisponibles("NUT003", "2030-01-07", 50, propia.id)).toContain("09:30");
  });
});

describe("citasService: horariosDisponibles", () => {
  // 2030-01-07 es lunes: Daniela (NUT003) atiende de 08:00 a 13:00.
  it("devuelve las horas libres de la jornada en un día que atiende", async () => {
    expect(await horariosDisponibles("NUT003", "2030-01-07")).toHaveLength(10);
  });

  it("quita las horas ocupadas por citas guardadas", async () => {
    crear({
      pacienteId: "U102",
      nutricionistaId: "NUT003",
      servicioCodigo: "CN002",
      motivo: "Control mensual de peso",
      fecha: "2030-01-07",
      hora: "09:00",
      duracionMin: 30,
    });

    expect(await horariosDisponibles("NUT003", "2030-01-07")).not.toContain("09:00");
  });

  it("con un servicio de 50 min no ofrece la última hora de la jornada", async () => {
    expect(await horariosDisponibles("NUT003", "2030-01-07", 50)).not.toContain("12:30");
  });

  it("devuelve una lista vacía si no atiende ese día o si el nutricionista no existe", async () => {
    expect(await horariosDisponibles("NUT002", "2030-01-07")).toEqual([]);
    expect(await horariosDisponibles("NUT999", "2030-01-07")).toEqual([]);
  });
});

describe("citasService: proximasHorasLibres", () => {
  it("devuelve la cantidad pedida con la forma que usa el Inicio", async () => {
    const horas = await proximasHorasLibres(4);

    expect(horas).toHaveLength(4);
    horas.forEach((h) => {
      expect(Object.keys(h).sort()).toEqual(["fecha", "hora", "nutricionistaId"]);
      expect(h.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(h.hora).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  it("las horas vienen en orden y todas son futuras", async () => {
    const horas = await proximasHorasLibres(6);
    const claves = horas.map((h) => `${h.fecha} ${h.hora}`);

    expect(claves).toEqual([...claves].sort());
    horas.forEach((h) => {
      const [anio, mes, dia] = h.fecha.split("-").map(Number);
      const [hh, mm] = h.hora.split(":").map(Number);
      expect(new Date(anio, mes - 1, dia, hh, mm).getTime()).toBeGreaterThan(Date.now());
    });
  });
});

describe("citasService: crearCita (RN-35)", () => {
  // CN002 (control) cuesta $25.000 y dura 30 min. 2030-01-08 es martes: Daniela atiende.
  const solicitud = {
    pacienteId: "U102",
    nutricionistaId: "NUT003",
    servicioCodigo: "CN002",
    fecha: "2030-01-08",
    hora: "09:00",
    motivo: "Control mensual de peso",
  };
  const pagar = (cambios = {}) =>
    crearPago({ monto: 25000, ultimos4: "4242", estado: "APROBADO", ...cambios });

  // Hoy fingido: domingo 6 de enero de 2030, así el martes 8 queda dentro de los 60 días.
  beforeEach(() => fijarReloj(2030, 1, 6));

  it("crea la cita con un pago aprobado por el precio exacto y enlaza el pago", async () => {
    const pago = pagar();
    const cita = await crearCita({ ...solicitud, pagoId: pago.id });

    expect(cita).toMatchObject({ estado: "PENDIENTE", pagoId: pago.id, duracionMin: 30 });
    expect(obtenerPago(pago.id).citaId).toBe(cita.id);
  });

  it("toma la duración del catálogo, no la que manda la página", async () => {
    const pago = pagar({ monto: 35000 });
    const cita = await crearCita({
      ...solicitud,
      servicioCodigo: "CN001",
      duracionMin: 5,
      pagoId: pago.id,
    });

    expect(cita.duracionMin).toBe(50);
  });

  it("rechaza un monto distinto al precio del servicio", async () => {
    const pago = pagar({ monto: 100 });

    await expect(crearCita({ ...solicitud, pagoId: pago.id })).rejects.toThrow(
      "El monto pagado no coincide",
    );
    expect(await listarCitas()).toHaveLength(5);
  });

  it("rechaza un pago rechazado, inexistente o ya usado", async () => {
    const rechazado = pagar({ estado: "RECHAZADO", motivo: "El banco rechazó la tarjeta." });
    await expect(crearCita({ ...solicitud, pagoId: rechazado.id })).rejects.toThrow(
      "no fue aprobado",
    );
    await expect(crearCita({ ...solicitud, pagoId: "P9999" })).rejects.toThrow("pago registrado");

    const pago = pagar();
    await crearCita({ ...solicitud, pagoId: pago.id });
    await expect(crearCita({ ...solicitud, hora: "10:00", pagoId: pago.id })).rejects.toThrow(
      "ya está asociado",
    );
  });

  it("rechaza un servicio que no existe", async () => {
    const pago = pagar();

    await expect(
      crearCita({ ...solicitud, servicioCodigo: "XX999", pagoId: pago.id }),
    ).rejects.toThrow("no está disponible");
  });
});

describe("citasService: crearCita repite las reglas del asistente", () => {
  const solicitud = {
    pacienteId: "U102",
    nutricionistaId: "NUT003",
    servicioCodigo: "CN002",
    fecha: "2030-01-08",
    hora: "09:00",
    motivo: "Control mensual de peso",
  };
  const pagar = (monto = 25000) => crearPago({ monto, ultimos4: "4242", estado: "APROBADO" });

  beforeEach(() => fijarReloj(2030, 1, 6));

  it("rechaza una fecha pasada o a más de 60 días (RN-13)", async () => {
    await expect(
      crearCita({ ...solicitud, fecha: "2030-01-04", pagoId: pagar().id }),
    ).rejects.toThrow("ya pasó");
    await expect(
      crearCita({ ...solicitud, fecha: "2030-03-08", pagoId: pagar().id }),
    ).rejects.toThrow("60 días");
  });

  it("rechaza una hora fuera de la jornada del nutricionista (RN-09)", async () => {
    // Daniela atiende de 08:00 a 13:00.
    await expect(crearCita({ ...solicitud, hora: "14:00", pagoId: pagar().id })).rejects.toThrow(
      "no está disponible",
    );
  });

  it("rechaza una hora de hoy que ya pasó (RN-12)", async () => {
    fijarReloj(2030, 1, 8, 10, 15);

    await expect(crearCita({ ...solicitud, pagoId: pagar().id })).rejects.toThrow(
      "no está disponible",
    );
  });

  it("rechaza una consulta de 50 min que no cabe al final de la jornada (RN-11)", async () => {
    await expect(
      crearCita({ ...solicitud, servicioCodigo: "CN001", hora: "12:30", pagoId: pagar(35000).id }),
    ).rejects.toThrow("no está disponible");
  });

  it("rechaza un motivo de menos de 10 caracteres (RN-14)", async () => {
    await expect(
      crearCita({ ...solicitud, motivo: "  Dieta  ", pagoId: pagar().id }),
    ).rejects.toThrow("al menos 10");
  });

  it("solo agenda teleconsulta a quien ya tuvo una atención presencial (RN-16)", async () => {
    // Ana (U102) no tiene atenciones; Javiera (U100) tiene la C0001 ATENDIDA.
    await expect(
      crearCita({ ...solicitud, servicioCodigo: "CN004", pagoId: pagar(20000).id }),
    ).rejects.toThrow("consulta presencial");

    const cita = await crearCita({
      ...solicitud,
      pacienteId: "U100",
      servicioCodigo: "CN004",
      pagoId: pagar(20000).id,
    });
    expect(cita.servicioCodigo).toBe("CN004");
  });

  it("no deja el pago enlazado si la cita no se creó", async () => {
    const pago = pagar();

    await expect(crearCita({ ...solicitud, hora: "14:00", pagoId: pago.id })).rejects.toThrow();
    expect(obtenerPago(pago.id).citaId).toBeFalsy();
  });
});

describe("citasService: puedeAgendarTeleconsulta (RN-16)", () => {
  it("es verdadero con una atención presencial previa y falso sin ella", async () => {
    expect(await puedeAgendarTeleconsulta("U100")).toBe(true);
    expect(await puedeAgendarTeleconsulta("U102")).toBe(false);
  });

  it("una teleconsulta atendida no habilita otra", async () => {
    const tele = crear({
      pacienteId: "U102",
      nutricionistaId: "NUT003",
      servicioCodigo: "CN004",
      motivo: "Seguimiento por video",
      fecha: "2030-01-08",
      hora: "09:00",
    });
    await cambiarEstado(tele.id, "CONFIRMADA", "U002");
    await cambiarEstado(tele.id, "ATENDIDA", "U012");

    expect(await puedeAgendarTeleconsulta("U102")).toBe(false);
  });
});
