import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Reportes from "./Reportes.jsx";
import { estadisticas } from "../../../services/citasService.js";
import { listarNutricionistas } from "../../../services/serviciosService.js";

vi.mock("../../../services/citasService.js", () => ({ estadisticas: vi.fn() }));
vi.mock("../../../services/serviciosService.js", () => ({ listarNutricionistas: vi.fn() }));
vi.mock("../../../components/acceso/GraficoBarras.jsx", () => ({
  default: () => <div data-testid="grafico" />,
}));

function resultado(totalSemana, totalCarolina) {
  return {
    total: totalSemana,
    atendidas: 3,
    inasistencias: 1,
    tasaInasistencia: 0.25,
    porNutricionista: [{ nutricionistaId: "NUT001", total: totalCarolina }],
    porSemana: [{ semana: "2026-10-05", total: totalSemana }],
  };
}

function tablaDe(titulo) {
  return screen.getByRole("table", { name: titulo });
}

describe("Reportes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    listarNutricionistas.mockResolvedValue([{ id: "NUT001", nombre: "Carolina Fuentes M." }]);
  });

  it("carga las estadísticas al entrar y muestra la tabla con los mismos números", async () => {
    estadisticas.mockResolvedValue(resultado(7, 5));

    render(<Reportes />);

    const tabla = await screen.findByRole("table", { name: "Atenciones por nutricionista" });
    expect(within(tabla).getByRole("row", { name: "Carolina Fuentes M. 5" })).toBeInTheDocument();
    expect(
      within(tablaDe("Atenciones por semana")).getByText("Sem. lun 5 oct"),
    ).toBeInTheDocument();
    expect(screen.getByText("25 %")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Tasa de inasistencia" })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
    expect(estadisticas).toHaveBeenCalledTimes(1);
  });

  it("al cambiar el rango vuelve a pedir las estadísticas y actualiza la tabla", async () => {
    estadisticas.mockResolvedValueOnce(resultado(7, 5)).mockResolvedValueOnce(resultado(2, 1));
    render(<Reportes />);
    await screen.findByRole("table", { name: "Atenciones por nutricionista" });
    const hasta = screen.getByLabelText("Hasta").value;

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-10-01" } });

    await waitFor(() => expect(estadisticas).toHaveBeenLastCalledWith("2026-10-01", hasta));
    expect(
      await within(tablaDe("Atenciones por nutricionista")).findByRole("row", {
        name: "Carolina Fuentes M. 1",
      }),
    ).toBeInTheDocument();
  });

  it("con un total de 0 muestra Sin datos en este período", async () => {
    estadisticas.mockResolvedValue({ ...resultado(0, 0), total: 0 });

    render(<Reportes />);

    expect(await screen.findByText("Sin datos en este período")).toBeInTheDocument();
    expect(screen.queryByTestId("grafico")).not.toBeInTheDocument();
  });

  it("no consulta cuando la fecha de inicio es posterior a la de término", async () => {
    estadisticas.mockResolvedValue(resultado(7, 5));
    render(<Reportes />);
    await screen.findByRole("table", { name: "Atenciones por semana" });

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2030-01-01" } });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "La fecha de inicio debe ser anterior o igual a la de término.",
    );
    expect(estadisticas).toHaveBeenCalledTimes(1);
  });
});
