import { describe, expect, it } from "vitest";
import {
  TRANSICIONES,
  agruparPorNutricionista,
  agruparPorSemana,
  bloquesQueOcupa,
  calcularEstadisticas,
  chocaConOtraCita,
  filtrarCitas,
  generarBloques,
  horariosDisponibles,
  lunesDeLaSemana,
  necesitaRecordatorio,
  puedeAgendarTeleconsulta,
  puedeCancelar,
  puedeTransicionar,
} from "./citas.js";

// Horarios del catálogo (hoja "Nutricionistas"). 2026-10-12 es lunes.
const daniela = { id: "NUT003", dias: [1, 2, 3, 4, 5], horaInicio: "08:00", horaFin: "13:00" };
const rodrigo = { id: "NUT002", dias: [2, 4, 6], horaInicio: "09:00", horaFin: "14:00" };
const carolina = { id: "NUT001", dias: [1, 3, 5], horaInicio: "09:00", horaFin: "17:00" };
const LUNES = "2026-10-12";

describe("generarBloques", () => {
  it("S-T1: Daniela Morales un lunes da 10 bloques de 08:00 a 12:30", () => {
    const bloques = generarBloques(daniela, LUNES);

    expect(bloques).toHaveLength(10);
    expect(bloques[0]).toBe("08:00");
    expect(bloques.at(-1)).toBe("12:30");
  });

  it("S-T1: Rodrigo Sepúlveda un lunes no atiende y devuelve una lista vacía", () => {
    expect(generarBloques(rodrigo, LUNES)).toEqual([]);
  });

  it("Carolina Fuentes un lunes da 16 bloques hasta las 16:30", () => {
    const bloques = generarBloques(carolina, LUNES);

    expect(bloques).toHaveLength(16);
    expect(bloques.at(-1)).toBe("16:30");
  });
});

describe("puedeTransicionar", () => {
  it("S-T2: permite PENDIENTE a CONFIRMADA y bloquea ATENDIDA a CANCELADA", () => {
    expect(puedeTransicionar("PENDIENTE", "CONFIRMADA")).toBe(true);
    expect(puedeTransicionar("ATENDIDA", "CANCELADA")).toBe(false);
  });

  it("los estados finales no pasan a ningún otro y un estado desconocido no transiciona", () => {
    ["ATENDIDA", "CANCELADA", "INASISTENCIA"].forEach((final) => {
      expect(TRANSICIONES[final]).toEqual([]);
    });
    expect(puedeTransicionar("HOLA", "CONFIRMADA")).toBe(false);
  });
});

describe("bloquesQueOcupa", () => {
  it("una cita de 50 min ocupa dos bloques y una de 20 min ocupa uno", () => {
    expect(bloquesQueOcupa("08:30", 50)).toEqual(["08:30", "09:00"]);
    expect(bloquesQueOcupa("08:30", 20)).toEqual(["08:30"]);
  });

  it("un plan sin duración ocupa un bloque", () => {
    expect(bloquesQueOcupa("10:00", null)).toEqual(["10:00"]);
  });
});

describe("horariosDisponibles", () => {
  // Daniela tiene una primera consulta (50 min) pendiente a las 08:30, que ocupa 08:30 y 09:00.
  const citas = [
    {
      id: "C1",
      nutricionistaId: "NUT003",
      fecha: LUNES,
      hora: "08:30",
      duracionMin: 50,
      estado: "PENDIENTE",
    },
    {
      id: "C2",
      nutricionistaId: "NUT003",
      fecha: "2026-10-13",
      hora: "10:00",
      duracionMin: 30,
      estado: "CONFIRMADA",
    },
    {
      id: "C3",
      nutricionistaId: "NUT001",
      fecha: LUNES,
      hora: "11:00",
      duracionMin: 30,
      estado: "CONFIRMADA",
    },
    {
      id: "C4",
      nutricionistaId: "NUT003",
      fecha: LUNES,
      hora: "12:00",
      duracionMin: 30,
      estado: "CANCELADA",
    },
  ];

  it("quita los bloques ocupados y no considera otras fechas, otros nutricionistas ni citas canceladas", () => {
    expect(horariosDisponibles(daniela, LUNES, citas, 30)).toEqual([
      "08:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
    ]);
  });

  it("para un servicio de 50 min solo ofrece horas con dos bloques seguidos libres", () => {
    expect(horariosDisponibles(daniela, LUNES, citas, 50)).toEqual([
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
    ]);
  });

  it("si la fecha es hoy no ofrece horas que ya pasaron", () => {
    const ahora = new Date(2026, 9, 12, 10, 15);

    expect(horariosDisponibles(daniela, LUNES, citas, 30, ahora)).toEqual([
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
    ]);
  });

  it("un día en que no atiende no tiene horas", () => {
    expect(horariosDisponibles(rodrigo, LUNES, [], 30)).toEqual([]);
  });
});

describe("chocaConOtraCita", () => {
  const ocupada = {
    id: "C1",
    nutricionistaId: "NUT003",
    fecha: LUNES,
    hora: "08:30",
    duracionMin: 50,
    estado: "PENDIENTE",
  };

  it("detecta el choque con una cita que ocupa ese bloque", () => {
    expect(
      chocaConOtraCita([ocupada], {
        nutricionistaId: "NUT003",
        fecha: LUNES,
        hora: "09:00",
        duracionMin: 30,
      }),
    ).toBe(true);
  });

  it("no hay choque con otro nutricionista, con una cita cancelada ni con la misma cita", () => {
    const pedida = { nutricionistaId: "NUT003", fecha: LUNES, hora: "08:30", duracionMin: 30 };

    expect(chocaConOtraCita([{ ...ocupada, nutricionistaId: "NUT001" }], pedida)).toBe(false);
    expect(chocaConOtraCita([{ ...ocupada, estado: "CANCELADA" }], pedida)).toBe(false);
    expect(chocaConOtraCita([ocupada], pedida, "C1")).toBe(false);
  });
});

describe("puedeCancelar", () => {
  const cita = { fecha: "2026-10-16", hora: "10:00", estado: "CONFIRMADA" };

  it("permite cancelar con más de 24 h de anticipación", () => {
    expect(puedeCancelar(cita, new Date(2026, 9, 14, 10, 0))).toBe(true);
  });

  it("no permite cancelar con 24 h o menos", () => {
    expect(puedeCancelar(cita, new Date(2026, 9, 15, 10, 0))).toBe(false);
    expect(puedeCancelar(cita, new Date(2026, 9, 15, 12, 0))).toBe(false);
  });

  it("no permite cancelar una cita que ya terminó", () => {
    expect(puedeCancelar({ ...cita, estado: "ATENDIDA" }, new Date(2026, 9, 1))).toBe(false);
  });
});

describe("necesitaRecordatorio", () => {
  const cita = { fecha: "2026-10-16", hora: "10:00", estado: "CONFIRMADA" };

  it("avisa a una cita confirmada cuando faltan 24 h o menos", () => {
    expect(necesitaRecordatorio(cita, new Date(2026, 9, 15, 12, 0))).toBe(true);
    expect(necesitaRecordatorio(cita, new Date(2026, 9, 15, 10, 0))).toBe(true);
  });

  it("no avisa con más de 24 h, a una cita pasada ni a una cita que no está confirmada", () => {
    expect(necesitaRecordatorio(cita, new Date(2026, 9, 14, 10, 0))).toBe(false);
    expect(necesitaRecordatorio(cita, new Date(2026, 9, 16, 11, 0))).toBe(false);
    expect(
      necesitaRecordatorio({ ...cita, estado: "PENDIENTE" }, new Date(2026, 9, 15, 12, 0)),
    ).toBe(false);
  });
});

describe("puedeAgendarTeleconsulta", () => {
  it("la permite si el paciente tiene una consulta presencial atendida", () => {
    expect(puedeAgendarTeleconsulta([{ estado: "ATENDIDA", servicioCodigo: "CN002" }])).toBe(true);
  });

  it("no la permite a un paciente nuevo, con solo inasistencias o con solo teleconsultas", () => {
    expect(puedeAgendarTeleconsulta([])).toBe(false);
    expect(puedeAgendarTeleconsulta([{ estado: "INASISTENCIA", servicioCodigo: "CN001" }])).toBe(
      false,
    );
    expect(puedeAgendarTeleconsulta([{ estado: "ATENDIDA", servicioCodigo: "CN004" }])).toBe(false);
  });

  it("acepta otra lista de servicios no presenciales", () => {
    const citas = [{ estado: "ATENDIDA", servicioCodigo: "CN002" }];

    expect(puedeAgendarTeleconsulta(citas, ["CN004", "CN002"])).toBe(false);
  });
});

describe("filtrarCitas", () => {
  const citas = [
    {
      id: "C1",
      pacienteId: "U100",
      nutricionistaId: "NUT001",
      estado: "CONFIRMADA",
      fecha: "2026-10-20",
      hora: "11:00",
    },
    {
      id: "C2",
      pacienteId: "U101",
      nutricionistaId: "NUT002",
      estado: "PENDIENTE",
      fecha: "2026-10-18",
      hora: "10:00",
    },
    {
      id: "C3",
      pacienteId: "U100",
      nutricionistaId: "NUT001",
      estado: "ATENDIDA",
      fecha: "2026-09-10",
      hora: "10:00",
    },
    {
      id: "C4",
      pacienteId: "U102",
      nutricionistaId: "NUT003",
      estado: "PENDIENTE",
      fecha: "2026-10-18",
      hora: "08:30",
    },
  ];
  const ids = (lista) => lista.map((c) => c.id);

  it("sin filtros devuelve todas, ordenadas por fecha y hora", () => {
    expect(ids(filtrarCitas(citas))).toEqual(["C3", "C4", "C2", "C1"]);
  });

  it("filtra por estado, paciente y nutricionista", () => {
    expect(ids(filtrarCitas(citas, { estado: "PENDIENTE" }))).toEqual(["C4", "C2"]);
    expect(ids(filtrarCitas(citas, { pacienteId: "U100" }))).toEqual(["C3", "C1"]);
    expect(ids(filtrarCitas(citas, { nutricionistaId: "NUT003" }))).toEqual(["C4"]);
  });

  it("filtra por rango de fechas, con los extremos incluidos", () => {
    expect(ids(filtrarCitas(citas, { desde: "2026-10-18", hasta: "2026-10-18" }))).toEqual([
      "C4",
      "C2",
    ]);
  });

  it("combina filtros y no modifica la lista original", () => {
    const copia = [...citas];

    expect(ids(filtrarCitas(citas, { pacienteId: "U100", estado: "ATENDIDA" }))).toEqual(["C3"]);
    expect(citas).toEqual(copia);
  });
});

// RN-34: estadísticas del período.
const IDS = ["NUT001", "NUT002", "NUT003", "NUT004"];
const cita = (id, nutricionistaId, fecha, estado) => ({
  id,
  nutricionistaId,
  fecha,
  hora: "10:00",
  estado,
});

describe("lunesDeLaSemana", () => {
  it("devuelve el lunes de la semana de un día cualquiera", () => {
    expect(lunesDeLaSemana("2026-10-16")).toBe("2026-10-12"); // viernes
    expect(lunesDeLaSemana("2026-10-12")).toBe("2026-10-12"); // lunes
  });

  it("el domingo pertenece a la semana que empezó el lunes anterior", () => {
    expect(lunesDeLaSemana("2026-10-18")).toBe("2026-10-12");
  });

  it("cruza bien un cambio de mes", () => {
    expect(lunesDeLaSemana("2026-10-01")).toBe("2026-09-28"); // jueves
  });
});

describe("agruparPorNutricionista", () => {
  it("incluye a todos los nutricionistas, aunque tengan 0 citas", () => {
    const citas = [
      cita("1", "NUT001", "2026-10-05", "ATENDIDA"),
      cita("2", "NUT003", "2026-10-06", "PENDIENTE"),
    ];

    expect(agruparPorNutricionista(citas, IDS)).toEqual([
      { nutricionistaId: "NUT001", total: 1 },
      { nutricionistaId: "NUT002", total: 0 },
      { nutricionistaId: "NUT003", total: 1 },
      { nutricionistaId: "NUT004", total: 0 },
    ]);
  });
});

describe("agruparPorSemana", () => {
  it("incluye todas las semanas del rango, también las que no tienen citas", () => {
    expect(agruparPorSemana([], "2026-10-01", "2026-10-20")).toEqual([
      { semana: "2026-09-28", total: 0 },
      { semana: "2026-10-05", total: 0 },
      { semana: "2026-10-12", total: 0 },
      { semana: "2026-10-19", total: 0 },
    ]);
  });

  it("cuenta cada cita en la semana de su lunes", () => {
    const citas = [
      cita("1", "NUT001", "2026-10-05", "ATENDIDA"), // lunes
      cita("2", "NUT001", "2026-10-11", "ATENDIDA"), // domingo de la misma semana
      cita("3", "NUT002", "2026-10-14", "PENDIENTE"),
    ];

    expect(agruparPorSemana(citas, "2026-10-05", "2026-10-18")).toEqual([
      { semana: "2026-10-05", total: 2 },
      { semana: "2026-10-12", total: 1 },
    ]);
  });

  it("un rango de un solo día tiene una semana", () => {
    expect(agruparPorSemana([], "2026-10-14", "2026-10-14")).toEqual([
      { semana: "2026-10-12", total: 0 },
    ]);
  });
});

describe("calcularEstadisticas", () => {
  const citas = [
    cita("1", "NUT001", "2026-10-05", "ATENDIDA"),
    cita("2", "NUT001", "2026-10-06", "ATENDIDA"),
    cita("3", "NUT003", "2026-10-07", "ATENDIDA"),
    cita("4", "NUT002", "2026-10-08", "INASISTENCIA"),
    cita("5", "NUT003", "2026-10-14", "PENDIENTE"),
    cita("6", "NUT003", "2026-10-14", "CANCELADA"), // no cuenta
    cita("7", "NUT002", "2026-10-25", "ATENDIDA"), // fuera del rango
  ];
  const resultado = calcularEstadisticas(citas, "2026-10-01", "2026-10-20", IDS);

  it("cuenta las citas del período sin las canceladas ni las de fuera del rango", () => {
    expect(resultado).toMatchObject({ total: 5, atendidas: 3, inasistencias: 1 });
  });

  it("la tasa de inasistencia es una proporción sobre las citas ya ocurridas", () => {
    // 1 inasistencia de 4 citas ocurridas (3 atendidas + 1 inasistencia); la pendiente no cuenta.
    expect(resultado.tasaInasistencia).toBe(0.25);
  });

  it("cada agrupación suma lo mismo que el total", () => {
    const suma = (filas) => filas.reduce((acc, fila) => acc + fila.total, 0);

    expect(suma(resultado.porNutricionista)).toBe(resultado.total);
    expect(suma(resultado.porSemana)).toBe(resultado.total);
    expect(resultado.porSemana.map((s) => s.semana)).toEqual([
      "2026-09-28",
      "2026-10-05",
      "2026-10-12",
      "2026-10-19",
    ]);
  });

  it("sin citas en el período devuelve todo en 0 y una tasa de 0", () => {
    const vacio = calcularEstadisticas([], "2026-10-01", "2026-10-20", IDS);

    expect(vacio).toMatchObject({ total: 0, atendidas: 0, inasistencias: 0, tasaInasistencia: 0 });
    expect(vacio.porNutricionista).toHaveLength(4);
    expect(vacio.porSemana).toHaveLength(4);
  });

  it("con solo citas pendientes la tasa es 0 y no se divide por cero", () => {
    const pendientes = [cita("1", "NUT001", "2026-10-14", "PENDIENTE")];

    expect(calcularEstadisticas(pendientes, "2026-10-12", "2026-10-18", IDS).tasaInasistencia).toBe(
      0,
    );
  });
});
