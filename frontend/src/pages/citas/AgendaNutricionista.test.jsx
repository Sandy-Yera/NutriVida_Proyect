import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AgendaNutricionista from "./AgendaNutricionista.jsx";
import { iniciarSesion } from "../../auth/auth.js";
import { cambiarEstado, crear as crearCita, obtener as obtenerCita } from "../../data/citasData.js";

// Hoy fingido: lunes 7 de enero de 2030, 10:00 (solo Date). Entra Daniela Morales (NUT003).
function cita(datos) {
  return crearCita({
    nutricionistaId: "NUT003",
    servicioCodigo: "CN002",
    motivo: "Control mensual de peso",
    fecha: "2030-01-07",
    duracionMin: 30,
    ...datos,
  });
}

function renderizar() {
  render(
    <MemoryRouter>
      <AgendaNutricionista />
    </MemoryRouter>,
  );
}

const tarjeta = (nombre) => within(screen.getByRole("article", { name: new RegExp(nombre) }));

let confirmadaAna;
let pendienteTomas;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2030, 0, 7, 10, 0));
  confirmadaAna = cita({ pacienteId: "U102", hora: "08:30" });
  cambiarEstado(confirmadaAna.id, "CONFIRMADA", "U002");
  pendienteTomas = cita({ pacienteId: "U101", hora: "11:00" });
  cita({ pacienteId: "U100", hora: "09:00", fecha: "2030-01-09" });
  cita({ pacienteId: "U100", nutricionistaId: "NUT001", hora: "10:00" });
  iniciarSesion("dmorales@nutrivida.cl", "Nutri2026!");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AgendaNutricionista (S-07)", () => {
  it("muestra solo las citas del día del nutricionista en sesión (RN-26)", async () => {
    renderizar();

    expect(await screen.findByRole("article", { name: /Ana Pérez, 08:30/ })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /Tomás Huenchullán, 11:00/ })).toBeInTheDocument();
    // La cita de Javiera con Carolina (NUT001) no es de Daniela.
    expect(screen.queryByRole("article", { name: /Javiera Soto/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("marca atendida una cita confirmada (RN-02)", async () => {
    renderizar();

    await screen.findByRole("article", { name: /Ana Pérez/ });
    fireEvent.click(tarjeta("Ana Pérez").getByRole("button", { name: "Marcar atendida" }));

    expect(await screen.findByText("Cita marcada como atendida.")).toHaveAttribute(
      "role",
      "status",
    );
    expect(obtenerCita(confirmadaAna.id).estado).toBe("ATENDIDA");
    expect(
      tarjeta("Ana Pérez").queryByRole("button", { name: "Marcar atendida" }),
    ).not.toBeInTheDocument();
    expect(obtenerCita(confirmadaAna.id).historial.at(-1)).toMatchObject({
      a: "ATENDIDA",
      por: "U012",
    });
  });

  it("marca inasistencia con confirmación (RN-02)", async () => {
    renderizar();

    await screen.findByRole("article", { name: /Ana Pérez/ });
    fireEvent.click(tarjeta("Ana Pérez").getByRole("button", { name: "Marcar inasistencia" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, marcar inasistencia" }),
    );

    expect(await screen.findByText("Inasistencia registrada.")).toBeInTheDocument();
    expect(obtenerCita(confirmadaAna.id).estado).toBe("INASISTENCIA");
  });

  it("una cita pendiente no se puede marcar: espera la confirmación de la secretaría (RN-02)", async () => {
    renderizar();

    await screen.findByRole("article", { name: /Tomás Huenchullán/ });

    expect(tarjeta("Tomás").queryByRole("button", { name: /Marcar/ })).not.toBeInTheDocument();
    expect(
      tarjeta("Tomás").getByText("Pendiente de confirmación de la secretaría."),
    ).toBeInTheDocument();
    expect(obtenerCita(pendienteTomas.id).estado).toBe("PENDIENTE");
  });

  it("enlaza a la ficha del paciente en el módulo clínico (contrato con Catalina)", async () => {
    renderizar();

    await screen.findByRole("article", { name: /Ana Pérez/ });

    expect(tarjeta("Ana Pérez").getByRole("link", { name: "Abrir ficha" })).toHaveAttribute(
      "href",
      "/nutricionista/pacientes/U102",
    );
  });

  it("la vista Semana agrupa las citas por día", async () => {
    renderizar();

    await screen.findByRole("article", { name: /Ana Pérez/ });
    fireEvent.click(screen.getByRole("button", { name: "Semana" }));

    expect(await screen.findByRole("heading", { name: "lun 7 ene" })).toBeInTheDocument();
    const miercoles = within(screen.getByRole("region", { name: "mié 9 ene" }));
    expect(miercoles.getByRole("article", { name: /Javiera Soto, 09:00/ })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("navega al día siguiente", async () => {
    renderizar();

    await screen.findByRole("article", { name: /Ana Pérez/ });
    fireEvent.click(screen.getByRole("button", { name: "Día siguiente" }));

    // Mientras cargan las citas del nuevo día, la barra de herramientas sigue en pantalla.
    expect(screen.getByRole("button", { name: "Día siguiente" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "8 de enero de 2030" })).toBeInTheDocument();
    expect(await screen.findByText("No tienes citas este día.")).toBeInTheDocument();
  });
});
