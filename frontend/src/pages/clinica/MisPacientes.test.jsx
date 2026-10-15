import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MisPacientes from "./MisPacientes.jsx";
import { listarCitas } from "../../services/citasService.js";

vi.mock("../../services/citasService.js", () => ({ listarCitas: vi.fn() }));

const CITAS = [
  { id: "C0003", pacienteId: "U100", nutricionistaId: "NUT001", estado: "CONFIRMADA" },
  { id: "C0004", pacienteId: "U102", nutricionistaId: "NUT003", estado: "PENDIENTE" },
];

function iniciarComo(id, nombre, nutricionistaId) {
  localStorage.setItem(
    "usuarioActual",
    JSON.stringify({ id, nombre, rol: "NUTRICIONISTA", nutricionistaId }),
  );
}

function renderizar() {
  render(
    <MemoryRouter>
      <MisPacientes />
    </MemoryRouter>,
  );
}

describe("MisPacientes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    listarCitas.mockResolvedValue(CITAS);
  });

  it("lista solo los pacientes del nutricionista en sesión y busca por nombre o RUT", async () => {
    iniciarComo("U010", "Carolina", "NUT001");
    renderizar();

    const tabla = await screen.findByRole("table");
    const filas = within(tabla).getAllByRole("row");
    expect(filas).toHaveLength(2);
    expect(filas[1]).toHaveTextContent(
      /Javiera Soto\s*19\.876\.543-0\s*Pérdida de peso\s*vie 2 oct · 72,4 kg/,
    );
    expect(screen.queryByText(/Huenchullán/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar por nombre o RUT"), {
      target: { value: "19876543" },
    });
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);

    fireEvent.change(screen.getByLabelText("Buscar por nombre o RUT"), {
      target: { value: "Tomás" },
    });
    expect(
      screen.getByText("No hay pacientes que coincidan con ‘Tomás’. Prueba con otro nombre o RUT."),
    ).toBeInTheDocument();
  });

  it("sin fichas muestra el estado vacío y los pacientes con cita a los que falta crear ficha", async () => {
    iniciarComo("U012", "Daniela", "NUT003");
    renderizar();

    expect(await screen.findByText("Aún no tienes pacientes con ficha.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear ficha de Ana Pérez" })).toHaveAttribute(
      "href",
      "/nutricionista/pacientes/U102",
    );
    expect(screen.queryByText(/Javiera/)).not.toBeInTheDocument();
  });
});
