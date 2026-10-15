import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MiProgreso from "./MiProgreso.jsx";
import { listarCitas } from "../../services/citasService.js";

vi.mock("../../services/citasService.js", () => ({ listarCitas: vi.fn() }));
vi.mock("../../components/clinica/GraficoProgreso.jsx", () => ({
  default: ({ mediciones, indicador }) => (
    <p data-testid="grafico">
      {indicador}: {mediciones.map((medicion) => medicion.id).join(",")}
    </p>
  ),
}));

const CITAS = [
  {
    id: "C0101",
    pacienteId: "U102",
    nutricionistaId: "NUT003",
    fecha: "2027-01-05",
    hora: "08:30",
    estado: "PENDIENTE",
  },
  {
    id: "C0102",
    pacienteId: "U100",
    nutricionistaId: "NUT001",
    fecha: "2027-01-07",
    hora: "11:00",
    estado: "CONFIRMADA",
  },
];

function iniciarComo(id, nombre) {
  localStorage.setItem("usuarioActual", JSON.stringify({ id, nombre, rol: "PACIENTE" }));
}

function renderizar() {
  render(
    <MemoryRouter>
      <MiProgreso />
    </MemoryRouter>,
  );
}

describe("MiProgreso", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("muestra solo los datos del paciente en sesión y cambia el indicador con las pestañas", async () => {
    listarCitas.mockResolvedValue(CITAS);
    iniciarComo("U100", "Javiera");
    renderizar();

    expect(await screen.findByTestId("grafico")).toHaveTextContent(
      "PESO: M0001,M0002,M0003,M0004,M0005",
    );
    expect(listarCitas).toHaveBeenCalledWith({ pacienteId: "U100" });
    expect(screen.getByText("jue 7 ene, 11:00")).toBeInTheDocument();
    expect(screen.queryByText(/mar 5 ene/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cintura" }));

    expect(screen.getByTestId("grafico")).toHaveTextContent("CINTURA: M0001");
    expect(screen.getByRole("button", { name: "Cintura" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Peso" })).toHaveAttribute("aria-pressed", "false");

    const filas = within(screen.getByRole("table")).getAllByRole("row");
    expect(filas).toHaveLength(6);
    expect(filas[1]).toHaveTextContent(
      /vie 2 oct\s*72,4\s*84\s*25,1\s*29,9\s*Carolina Fuentes M\./,
    );
    expect(screen.getByText("(vigente desde el vie 2 oct)")).toBeInTheDocument();
    expect(screen.getByText("Avena con fruta y yogur natural.")).toBeInTheDocument();
    expect(screen.getByText(/1\.800 kcal diarias/)).toBeInTheDocument();
  });

  it("sin mediciones muestra el estado vacío del caso", async () => {
    listarCitas.mockResolvedValue([CITAS[1]]);
    iniciarComo("U102", "Ana");
    renderizar();

    expect(
      await screen.findByText("Aún no tienes mediciones: se registran en tu primera consulta."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("grafico")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Solicitar cita" })).toHaveAttribute(
      "href",
      "/citas/solicitar",
    );
    expect(
      screen.getByText(
        "Aún no tienes un plan alimenticio: tu nutricionista lo indicará en tu consulta.",
      ),
    ).toBeInTheDocument();
  });
});
