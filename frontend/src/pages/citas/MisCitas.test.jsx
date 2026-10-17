import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MisCitas from "./MisCitas.jsx";
import { iniciarSesion } from "../../auth/auth.js";
import {
  cambiarEstado,
  crear as crearCitaGuardada,
  obtener as obtenerCita,
} from "../../data/citasData.js";
import { crear as crearPago, obtener as obtenerPago } from "../../data/pagosData.js";

// Hoy fingido: lunes 7 de enero de 2030, 10:00. Solo se finge Date (RN-30).
// Las citas de prueba se crean directo en data para controlar fechas y estados.
function cita(datos) {
  return crearCitaGuardada({
    pacienteId: "U102",
    nutricionistaId: "NUT003",
    servicioCodigo: "CN002",
    motivo: "Control mensual de peso",
    duracionMin: 30,
    ...datos,
  });
}

function renderizar() {
  render(
    <MemoryRouter>
      <MisCitas />
    </MemoryRouter>,
  );
}

const panel = () => within(screen.getByRole("tabpanel"));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2030, 0, 7, 10, 0));
  iniciarSesion("ana.perez@correo.cl", "Paciente2026!");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("MisCitas (S-05)", () => {
  it("separa Próximas e Historial y muestra solo las citas del paciente (RN-24)", async () => {
    cita({ fecha: "2030-01-10", hora: "09:00" });
    cita({ fecha: "2029-12-20", hora: "09:00" });
    cita({ pacienteId: "U100", fecha: "2030-01-11", hora: "09:00" });
    renderizar();

    expect(await screen.findByRole("tab", { name: "Próximas (1)" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(panel().getAllByRole("article")).toHaveLength(1);
    expect(panel().getByText(/10 de enero de 2030, 09:00/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Historial/ }));
    // Historial: la del 20 de diciembre y la C0004 de la semilla, que quedó en el pasado.
    expect(panel().getByText(/20 de diciembre de 2029/)).toBeInTheDocument();
    expect(panel().queryByRole("button", { name: "Cancelar cita" })).not.toBeInTheDocument();
  });

  it("muestra el recordatorio de una cita confirmada a menos de 24 h (RN-07)", async () => {
    const manana = cita({ fecha: "2030-01-08", hora: "09:00" });
    cambiarEstado(manana.id, "CONFIRMADA", "U002"); // la secretaria la confirma (RN-02)
    renderizar();

    expect(await screen.findByText(/Recordatorio: tienes una cita confirmada/)).toHaveTextContent(
      "8 de enero de 2030 a las 09:00",
    );
  });

  it("con menos de 24 h no deja cancelar ni reprogramar y lo explica (RN-06)", async () => {
    cita({ fecha: "2030-01-08", hora: "09:00" });
    renderizar();

    expect(
      await screen.findByText("Ya no puedes cancelar: faltan menos de 24 h. Llama a la clínica."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar cita" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reprogramar" })).not.toBeInTheDocument();
  });

  it("cancela con confirmación, reembolsa el pago y actualiza la lista sin recargar (RN-08)", async () => {
    const pago = crearPago({ monto: 25000, ultimos4: "4242", estado: "APROBADO" });
    const nueva = cita({ fecha: "2030-01-10", hora: "09:00", pagoId: pago.id });
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Cancelar cita" }));
    const dialogo = within(screen.getByRole("dialog"));
    fireEvent.click(dialogo.getByRole("button", { name: "Sí, cancelar la cita" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cita cancelada. El pago quedó reembolsado.",
    );
    expect(screen.getByRole("tab", { name: "Próximas (0)" })).toBeInTheDocument();
    expect(obtenerCita(nueva.id).estado).toBe("CANCELADA");
    expect(obtenerPago(pago.id).estado).toBe("REEMBOLSADO");
  });

  it("si se cierra el diálogo, la cita no cambia", async () => {
    const nueva = cita({ fecha: "2030-01-10", hora: "09:00" });
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Cancelar cita" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(obtenerCita(nueva.id).estado).toBe("PENDIENTE");
  });

  it("reprograma con SelectorHorario y la cita queda PENDIENTE en la nueva hora (RN-05)", async () => {
    const nueva = cita({ fecha: "2030-01-10", hora: "09:00" });
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Reprogramar" }));
    fireEvent.change(screen.getByLabelText("Nueva fecha"), { target: { value: "2030-01-15" } });
    fireEvent.click(await screen.findByRole("button", { name: "11:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar nueva hora" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cita reprogramada para el 15 de enero de 2030 a las 11:00",
    );
    expect(obtenerCita(nueva.id)).toMatchObject({
      fecha: "2030-01-15",
      hora: "11:00",
      estado: "PENDIENTE",
    });
  });

  it("al reprogramar, las horas ocupadas por otra cita salen deshabilitadas (RN-10)", async () => {
    cita({ fecha: "2030-01-10", hora: "09:00" });
    cita({ pacienteId: "U100", fecha: "2030-01-15", hora: "10:00" });
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Reprogramar" }));
    fireEvent.change(screen.getByLabelText("Nueva fecha"), { target: { value: "2030-01-15" } });

    expect(await screen.findByRole("button", { name: "10:00" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Confirmar nueva hora" })).toBeDisabled();
  });

  it("sin citas muestra el estado vacío con Solicitar cita (RN-32)", async () => {
    localStorage.setItem("nv_citas", "[]");
    renderizar();

    expect(await screen.findByText("Aún no tienes citas.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Solicitar cita" })).toHaveAttribute(
      "href",
      "/citas/solicitar",
    );
  });
});
