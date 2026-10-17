import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AgendaSecretaria from "./AgendaSecretaria.jsx";
import { iniciarSesion } from "../../auth/auth.js";
import { cambiarEstado, crear as crearCita, obtener as obtenerCita } from "../../data/citasData.js";
import { crear as crearPago, obtener as obtenerPago } from "../../data/pagosData.js";

// Hoy fingido: lunes 7 de enero de 2030, 08:00 (solo Date). Rodrigo no atiende los lunes.
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
      <AgendaSecretaria />
    </MemoryRouter>,
  );
}

// En jsdom se dibujan la tabla (escritorio) y las pestañas (móvil); las pruebas usan la tabla.
const tabla = () => within(screen.getByRole("table", { name: "Agenda del día" }));
const detalle = () => within(screen.getByRole("article"));

let pendienteAna;
let confirmadaJaviera;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2030, 0, 7, 8, 0));
  const pago = crearPago({ monto: 35000, ultimos4: "4242", estado: "APROBADO" });
  pendienteAna = cita({
    pacienteId: "U102",
    servicioCodigo: "CN001",
    hora: "08:30",
    duracionMin: 50,
    pagoId: pago.id,
  });
  confirmadaJaviera = cita({ pacienteId: "U100", nutricionistaId: "NUT001", hora: "10:00" });
  cambiarEstado(confirmadaJaviera.id, "CONFIRMADA", "U002");
  iniciarSesion("recepcion@nutrivida.cl", "Recepcion2026!");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AgendaSecretaria (S-06)", () => {
  it("muestra los 4 nutricionistas, las citas del día, el — fuera de jornada y las pendientes (RN-25, RN-33)", async () => {
    renderizar();

    expect(await screen.findByRole("table", { name: "Agenda del día" })).toBeInTheDocument();
    expect(tabla().getAllByRole("columnheader")).toHaveLength(5);
    expect(
      tabla().getByRole("button", { name: "Cita de Ana Pérez, 08:30, Pendiente" }),
    ).toBeInTheDocument();
    expect(
      tabla().getByRole("button", { name: "Cita de Javiera Soto, 10:00, Confirmada" }),
    ).toBeInTheDocument();
    expect(tabla().getByText("↳ continúa")).toBeInTheDocument();
    expect(tabla().getAllByText("Fuera de jornada").length).toBeGreaterThan(10);
    expect(screen.getByText(/Pendientes del día/)).toHaveTextContent("1");
  });

  it("una cita pendiente ofrece Confirmar, Cancelar y Reprogramar, pero no Marcar atendida ni inasistencia (RN-02)", async () => {
    renderizar();

    await screen.findByRole("table", { name: "Agenda del día" });
    fireEvent.click(tabla().getByRole("button", { name: /Cita de Ana Pérez/ }));

    expect(detalle().getByText("Primera consulta nutricional")).toBeInTheDocument();
    expect(detalle().getByText("Control mensual de peso")).toBeInTheDocument();
    expect(detalle().getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
    expect(detalle().getByRole("button", { name: "Cancelar cita" })).toBeInTheDocument();
    expect(detalle().getByRole("button", { name: "Reprogramar" })).toBeInTheDocument();
    expect(detalle().queryByRole("button", { name: /inasistencia/ })).not.toBeInTheDocument();
    expect(detalle().queryByRole("button", { name: /atendida/i })).not.toBeInTheDocument();
  });

  it("confirma una cita y el historial muestra quién la confirmó (RN-04)", async () => {
    renderizar();

    await screen.findByRole("table", { name: "Agenda del día" });
    fireEvent.click(tabla().getByRole("button", { name: /Cita de Ana Pérez/ }));
    fireEvent.click(detalle().getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText("Cita confirmada.")).toHaveAttribute("role", "status");
    expect(obtenerCita(pendienteAna.id).estado).toBe("CONFIRMADA");
    expect(detalle().getByText(/Pendiente → Confirmada, por Marta Ríos/)).toBeInTheDocument();
    expect(screen.getByText(/Pendientes del día/)).toHaveTextContent("0");
  });

  it("marca una inasistencia con confirmación y la cita queda en estado final (RN-02)", async () => {
    renderizar();

    await screen.findByRole("table", { name: "Agenda del día" });
    fireEvent.click(tabla().getByRole("button", { name: /Cita de Javiera Soto/ }));
    fireEvent.click(detalle().getByRole("button", { name: "Marcar inasistencia" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, marcar inasistencia" }),
    );

    expect(await screen.findByText("Inasistencia registrada.")).toBeInTheDocument();
    expect(obtenerCita(confirmadaJaviera.id).estado).toBe("INASISTENCIA");
    expect(detalle().getByText("Estado final: esta cita ya no cambia.")).toBeInTheDocument();
  });

  it("cancela con confirmación y el pago queda reembolsado (RN-08)", async () => {
    renderizar();

    await screen.findByRole("table", { name: "Agenda del día" });
    fireEvent.click(tabla().getByRole("button", { name: /Cita de Ana Pérez/ }));
    fireEvent.click(detalle().getByRole("button", { name: "Cancelar cita" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, cancelar cita" }),
    );

    expect(await screen.findByText(/Cita cancelada/)).toBeInTheDocument();
    expect(obtenerCita(pendienteAna.id).estado).toBe("CANCELADA");
    expect(obtenerPago(pendienteAna.pagoId).estado).toBe("REEMBOLSADO");
  });

  it("reprograma aunque falten menos de 24 h: la regla es solo del paciente (RN-05, RN-06)", async () => {
    renderizar();

    await screen.findByRole("table", { name: "Agenda del día" });
    fireEvent.click(tabla().getByRole("button", { name: /Cita de Javiera Soto/ }));
    fireEvent.click(detalle().getByRole("button", { name: "Reprogramar" }));
    fireEvent.change(screen.getByLabelText("Nueva fecha"), { target: { value: "2030-01-09" } });
    fireEvent.click(await screen.findByRole("button", { name: "11:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar nueva hora" }));

    expect(
      await screen.findByText(/Cita reprogramada para el 9 de enero de 2030/),
    ).toBeInTheDocument();
    expect(obtenerCita(confirmadaJaviera.id)).toMatchObject({
      fecha: "2030-01-09",
      hora: "11:00",
      estado: "PENDIENTE",
    });
  });

  it("filtra por estado", async () => {
    renderizar();

    await screen.findByRole("table", { name: "Agenda del día" });
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "CONFIRMADA" } });

    expect(tabla().queryByRole("button", { name: /Cita de Ana Pérez/ })).not.toBeInTheDocument();
    expect(tabla().getByRole("button", { name: /Cita de Javiera Soto/ })).toBeInTheDocument();
  });

  it("navega al día siguiente y muestra sus citas", async () => {
    cita({ pacienteId: "U101", hora: "12:00", fecha: "2030-01-08" });
    renderizar();

    await screen.findByRole("table", { name: "Agenda del día" });
    fireEvent.click(screen.getByRole("button", { name: "Día siguiente" }));
    // Mientras cargan las citas del nuevo día, la barra de herramientas sigue en pantalla.
    expect(screen.getByRole("button", { name: "Día siguiente" })).toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "8 de enero de 2030" })).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Cita de Tomás Huenchullán, 12:00, Pendiente" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cita de Ana Pérez/ })).not.toBeInTheDocument();
  });

  it("no ofrece enlaces a fichas ni mediciones (RN-25)", async () => {
    renderizar();

    await screen.findByRole("table", { name: "Agenda del día" });
    fireEvent.click(tabla().getByRole("button", { name: /Cita de Ana Pérez/ }));

    expect(screen.queryByRole("link", { name: /ficha/i })).not.toBeInTheDocument();
  });
});
