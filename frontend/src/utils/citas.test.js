import { describe, expect, it } from "vitest";
import {
  TRANSICIONES,
  bloquesQueOcupa,
  chocaConOtraCita,
  filtrarCitas,
  generarBloques,
  horariosDisponibles,
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
