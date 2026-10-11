import { describe, expect, it } from "vitest";
import {
  accesoFicha,
  calcularEdad,
  calcularImc,
  clasificarImc,
  describirDias,
  diaDesdeFecha,
  dominioCinta,
  filtrarPacientes,
  filtrarServicios,
  formatearMedida,
  incluyeDelPlan,
  marcasCinta,
  pacientesDeNutricionista,
  pacientesSinFicha,
  proximaCita,
  serieProgreso,
  tipoDesdeSlug,
  urlSolicitarCita,
  validarContacto,
  validarFicha,
  validarMedicion,
  validarPlan,
  validarServicio,
} from "./clinica.js";
import { serviciosSemilla } from "../data/semillas/servicios.js";
import { fichasSemilla, medicionesSemilla, planesSemilla } from "../data/semillas/fichas.js";
import { usuariosSemilla } from "../data/semillas/usuarios.js";

describe("calcularImc y clasificarImc (C-T1)", () => {
  it("calcularImc(72.4, 170) da 25.1 y clasificarImc(25.1) da Sobrepeso", () => {
    expect(calcularImc(72.4, 170)).toBe(25.1);
    expect(clasificarImc(25.1)).toBe("Sobrepeso");
  });
});

describe("filtrarServicios (C-T2)", () => {
  it('con tipo PLAN y texto "VEGANA" devuelve solo PL005', () => {
    const resultado = filtrarServicios(serviciosSemilla, { tipo: "PLAN", texto: "VEGANA" });

    expect(resultado.map((servicio) => servicio.codigo)).toEqual(["PL005"]);
  });

  it("sin filtros devuelve los 18 servicios", () => {
    expect(filtrarServicios(serviciosSemilla)).toHaveLength(18);
  });
});

describe("lógica clínica, casos extra", () => {
  it("clasifica el IMC con los cortes de la OMS y no clasifica el plan infantil", () => {
    expect(clasificarImc(18.4)).toBe("Bajo peso");
    expect(clasificarImc(18.5)).toBe("Normal");
    expect(clasificarImc(24.9)).toBe("Normal");
    expect(clasificarImc(25)).toBe("Sobrepeso");
    expect(clasificarImc(30)).toBe("Obesidad");
    expect(clasificarImc(16, "INFANTIL")).toBeNull();
    expect(calcularImc(70, 0)).toBeNull();
  });

  it("filtrarServicios ignora tildes y mayúsculas y busca también en la descripción", () => {
    expect(
      filtrarServicios(serviciosSemilla, { texto: "NUTRICION DEPORTIVA" }).map((s) => s.codigo),
    ).toEqual(["PL003"]);
    expect(
      filtrarServicios(serviciosSemilla, { texto: "videollamada" }).map((s) => s.codigo),
    ).toEqual(["CN004"]);
    expect(filtrarServicios(serviciosSemilla, { tipo: "TALLER" })).toHaveLength(3);
  });

  it("validarMedicion devuelve los errores por campo y acepta una medición válida", () => {
    const hoy = new Date(2026, 9, 11);
    const valida = {
      fecha: "2026-10-02",
      pesoKg: 72.4,
      tallaCm: 170,
      cinturaCm: 84,
      grasaPct: 29.9,
    };

    expect(validarMedicion(valida, hoy)).toEqual({});
    expect(
      validarMedicion({ fecha: "2026-10-12", pesoKg: 350, tallaCm: "", grasaPct: 1 }, hoy),
    ).toEqual({
      pesoKg: "El peso debe estar entre 2 y 300 kg.",
      tallaCm: "Ingresa la talla.",
      grasaPct: "El % de grasa debe estar entre 2 y 70 %.",
      fecha: "La fecha de la medición no puede ser futura.",
    });
  });

  it("pacientesDeNutricionista deja solo las fichas de ese nutricionista", () => {
    expect(pacientesDeNutricionista(fichasSemilla, "NUT001").map((f) => f.id)).toEqual(["U100"]);
    expect(pacientesDeNutricionista(fichasSemilla, "NUT004")).toEqual([]);
  });

  it("urlSolicitarCita incluye solo los parámetros elegidos y tipoDesdeSlug traduce la categoría", () => {
    expect(urlSolicitarCita({ servicio: "CN001", nutricionista: "NUT003" })).toBe(
      "/citas/solicitar?servicio=CN001&nutricionista=NUT003",
    );
    expect(urlSolicitarCita({ servicio: "", nutricionista: "NUT001" })).toBe(
      "/citas/solicitar?nutricionista=NUT001",
    );
    expect(urlSolicitarCita()).toBe("/citas/solicitar");
    expect(tipoDesdeSlug("planes")).toBe("PLAN");
    expect(tipoDesdeSlug("otra")).toBeNull();
  });

  it("incluyeDelPlan separa lo que incluye un plan y no inventa ítems si no hay detalle", () => {
    expect(
      incluyeDelPlan(
        "Incluye primera consulta + 5 controles + 3 planes mensuales + seguimiento continuo.",
      ),
    ).toEqual(["Primera consulta", "5 controles", "3 planes mensuales", "Seguimiento continuo"]);
    expect(incluyeDelPlan("Plan adaptado para patologías metabólicas.")).toEqual([]);
  });

  it("describirDias escribe los días como en el XLSX", () => {
    expect(describirDias([1, 3, 5])).toBe("Lunes, miércoles y viernes");
    expect(describirDias([2, 4, 6])).toBe("Martes, jueves y sábado");
    expect(describirDias([1, 2, 3, 4, 5])).toBe("Lunes a viernes");
    expect(describirDias([5, 2, 4, 3])).toBe("Martes a viernes");
    expect(describirDias([1, 2])).toBe("Lunes y martes");
    expect(describirDias([3])).toBe("Miércoles");
  });

  it("validarContacto exige nombre, correo, motivo y un mensaje de 10 a 500 caracteres", () => {
    expect(
      validarContacto({
        nombre: "Ana",
        correo: "ana@correo.cl",
        telefono: "",
        motivo: "Otro",
        mensaje: "Necesito más información.",
      }),
    ).toEqual({});
    expect(
      validarContacto({
        nombre: "",
        correo: "ana",
        telefono: "1234",
        motivo: "",
        mensaje: "x".repeat(501),
      }),
    ).toEqual({
      nombre: "Ingresa tu nombre.",
      correo: "El correo no es válido: usa el formato nombre@dominio.cl.",
      telefono: "El teléfono debe ser un celular chileno: +56 9 y 8 dígitos.",
      motivo: "Elige el motivo de tu mensaje.",
      mensaje: "El mensaje debe tener entre 10 y 500 caracteres.",
    });
  });
});

describe("serieProgreso, formatearMedida y la cinta métrica", () => {
  const mediciones = medicionesSemilla.filter((medicion) => medicion.pacienteId === "U100");

  it("ordena por fecha, calcula el IMC de cada medición y omite las que no tienen el dato", () => {
    const desordenadas = [...mediciones].reverse();
    const conVacio = [{ ...mediciones[0], id: "M0090", fecha: "2026-07-10", grasaPct: null }];

    expect(serieProgreso(desordenadas, "IMC").map((punto) => punto.valor)).toEqual([
      27, 26.6, 26.2, 25.5, 25.1,
    ]);
    expect(serieProgreso([...mediciones, ...conVacio], "GRASA")).toHaveLength(5);
  });

  it("formatea con coma decimal, unidad y signo del cambio", () => {
    expect(formatearMedida(72.4, "PESO", { conUnidad: true })).toBe("72,4 kg");
    expect(formatearMedida(84, "CINTURA", { conUnidad: true })).toBe("84 cm");
    expect(formatearMedida(29.9, "GRASA", { conUnidad: true })).toBe("29,9 %");
    expect(formatearMedida(-5.6, "PESO", { conUnidad: true, conSigno: true })).toBe("-5,6 kg");
    expect(formatearMedida(null, "PESO")).toBe("—");
  });

  it("la cinta parte el día 1 del primer mes y termina 10 días después de la última medición", () => {
    const dominio = dominioCinta(serieProgreso(mediciones, "PESO"));
    const marcas = marcasCinta(dominio);

    expect(dominio).toEqual({
      desde: diaDesdeFecha("2026-07-01"),
      hasta: diaDesdeFecha("2026-10-12"),
    });
    expect(marcas[0]).toEqual({ fecha: "2026-07-01", tipo: "mes", posicion: 0, etiqueta: "jul" });
    expect(marcas.at(-1)).toMatchObject({ fecha: "2026-10-12", posicion: 1 });
    expect(marcas.find((marca) => marca.fecha === "2026-07-06").tipo).toBe("semana");
    expect(marcas.find((marca) => marca.fecha === "2026-07-07").tipo).toBe("dia");
  });
});

describe("proximaCita", () => {
  const ahora = new Date(2026, 9, 11, 10, 0);
  const cita = (id, pacienteId, fecha, hora, estado) => ({ id, pacienteId, fecha, hora, estado });
  const citas = [
    cita("C1", "U102", "2026-10-12", "08:00", "PENDIENTE"),
    cita("C2", "U100", "2026-10-12", "09:00", "CANCELADA"),
    cita("C3", "U100", "2026-10-11", "09:30", "CONFIRMADA"),
    cita("C4", "U100", "2026-10-20", "11:00", "CONFIRMADA"),
    cita("C5", "U100", "2026-10-13", "15:00", "PENDIENTE"),
  ];

  it("devuelve la cita pendiente o confirmada más cercana del paciente", () => {
    expect(proximaCita(citas, "U100", ahora).id).toBe("C5");
  });

  it("ignora citas de otros pacientes, canceladas o que ya pasaron", () => {
    expect(proximaCita(citas.slice(0, 3), "U100", ahora)).toBeNull();
  });
});

describe("privacidad y búsqueda de fichas", () => {
  it("accesoFicha distingue ficha propia, ajena e inexistente", () => {
    expect(accesoFicha(fichasSemilla[0], "NUT001")).toBe("PROPIA");
    expect(accesoFicha(fichasSemilla[1], "NUT001")).toBe("AJENA");
    expect(accesoFicha(null, "NUT001")).toBe("SIN_FICHA");
  });

  it("filtrarPacientes busca por nombre sin tildes y por RUT con o sin puntos", () => {
    const pacientes = usuariosSemilla.filter((usuario) => usuario.rol === "PACIENTE");

    expect(filtrarPacientes(pacientes, "huenchullan").map((p) => p.id)).toEqual(["U101"]);
    expect(filtrarPacientes(pacientes, "21333444").map((p) => p.id)).toEqual(["U102"]);
    expect(filtrarPacientes(pacientes, "19.876.543-0").map((p) => p.id)).toEqual(["U100"]);
    expect(filtrarPacientes(pacientes, "  ")).toHaveLength(3);
  });

  it("pacientesSinFicha devuelve una vez a cada paciente con cita vigente y sin ficha", () => {
    const citas = [
      { pacienteId: "U102", nutricionistaId: "NUT003", estado: "PENDIENTE" },
      { pacienteId: "U102", nutricionistaId: "NUT003", estado: "CONFIRMADA" },
      { pacienteId: "U102", nutricionistaId: "NUT002", estado: "CANCELADA" },
      { pacienteId: "U101", nutricionistaId: "NUT002", estado: "PENDIENTE" },
    ];

    expect(pacientesSinFicha(citas, fichasSemilla, "NUT003")).toEqual(["U102"]);
    expect(pacientesSinFicha(citas, fichasSemilla, "NUT002")).toEqual([]);
  });

  it("calcularEdad cuenta el cumpleaños solo cuando ya pasó", () => {
    expect(calcularEdad("1997-04-14", new Date(2026, 9, 11))).toBe(29);
    expect(calcularEdad("2002-10-12", new Date(2026, 9, 11))).toBe(23);
    expect(calcularEdad("2002-10-11", new Date(2026, 9, 11))).toBe(24);
  });
});

describe("validarFicha y validarPlan", () => {
  it("la ficha exige un objetivo del caso y antecedentes", () => {
    expect(validarFicha({ objetivo: "OTRO", antecedentes: " " })).toEqual({
      objetivo: "Elige el objetivo del paciente.",
      antecedentes: "Ingresa los antecedentes (escribe “Sin antecedentes” si no tiene).",
    });
    expect(validarFicha({ objetivo: "INFANTIL", antecedentes: "Sin antecedentes" })).toEqual({});
  });

  it("el plan exige objetivo, kcal enteras de 800 a 5000 y las 5 comidas", () => {
    expect(validarPlan(planesSemilla[0])).toEqual({});
    expect(
      validarPlan({ objetivo: "", kcalDiarias: "1800.5", comidas: { desayuno: "Avena" } }),
    ).toEqual({
      objetivo: "Ingresa el objetivo del plan.",
      kcalDiarias: "Las kcal diarias deben ser un número entero entre 800 y 5000.",
      colacion: "Indica la colación.",
      almuerzo: "Indica el almuerzo.",
      once: "Indica la once.",
      cena: "Indica la cena.",
    });
  });
});

describe("validarServicio", () => {
  it("acepta cada servicio de la semilla tal como está", () => {
    serviciosSemilla.forEach((servicio) => {
      expect(validarServicio(servicio, { esNuevo: false })).toEqual({});
    });
  });

  it("los planes no exigen duración, los talleres exigen cupo y el precio debe ser mayor que 0", () => {
    const base = {
      codigo: "pl007",
      tipo: "PLAN",
      nombre: "Plan embarazo",
      duracionMin: "",
      modalidad: "Presencial",
      precio: "60000",
      descripcion: "Incluye 3 consultas y plan mensual.",
    };

    expect(validarServicio(base)).toEqual({});
    expect(validarServicio({ ...base, codigo: "P007", tipo: "TALLER", precio: "0" })).toEqual({
      codigo: "El código debe tener 2 letras y 3 números, por ejemplo CN006.",
      duracionMin: "La duración debe ser un número entero de 10 a 240 minutos.",
      precio: "El precio debe ser mayor que 0.",
      cupoMax: "El cupo debe ser un número entero de 1 a 50 personas.",
    });
    expect(validarServicio({ ...base, precio: "1500.5" }).precio).toBe(
      "El precio va en pesos, sin decimales.",
    );
  });
});
