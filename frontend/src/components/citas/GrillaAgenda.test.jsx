import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GrillaAgenda from "./GrillaAgenda.jsx";
import { armarAgenda } from "../../utils/citas.js";

// 2026-10-12 es lunes: Rodrigo no atiende; Daniela atiende de 08:00 a 13:00.
const nutricionistas = [
  {
    id: "NUT002",
    nombre: "Rodrigo Sepúlveda A.",
    dias: [2, 4, 6],
    horaInicio: "09:00",
    horaFin: "14:00",
  },
  {
    id: "NUT003",
    nombre: "Daniela Morales C.",
    dias: [1, 2, 3, 4, 5],
    horaInicio: "08:00",
    horaFin: "13:00",
  },
];
const citas = [
  {
    id: "C1",
    pacienteId: "U102",
    nutricionistaId: "NUT003",
    fecha: "2026-10-12",
    hora: "09:00",
    duracionMin: 30,
    estado: "PENDIENTE",
  },
];
const filas = armarAgenda(nutricionistas, "2026-10-12", citas);

function renderizar(onSeleccionar = vi.fn()) {
  render(
    <GrillaAgenda
      filas={filas}
      nutricionistas={nutricionistas}
      pacientes={{ U102: "Ana Pérez" }}
      seleccionadaId={null}
      onSeleccionar={onSeleccionar}
    />,
  );
  return onSeleccionar;
}

describe("GrillaAgenda (RN-33)", () => {
  it("en el móvil muestra una pestaña por nutricionista y avisa si no atiende ese día", () => {
    renderizar();
    const panel = () => within(screen.getByRole("tabpanel"));

    expect(screen.getByRole("tab", { name: "Rodrigo" })).toHaveAttribute("aria-selected", "true");
    expect(panel().getByText("No atiende este día.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Daniela" }));

    expect(
      panel().getByRole("button", { name: "Cita de Ana Pérez, 09:00, Pendiente" }),
    ).toBeInTheDocument();
    expect(panel().queryByText("No atiende este día.")).not.toBeInTheDocument();
  });

  it("un clic en una cita avisa su id con onSeleccionar", () => {
    const onSeleccionar = renderizar();

    const tabla = within(screen.getByRole("table", { name: "Agenda del día" }));
    fireEvent.click(tabla.getByRole("button", { name: /Cita de Ana Pérez/ }));

    expect(onSeleccionar).toHaveBeenCalledWith("C1");
  });
});
