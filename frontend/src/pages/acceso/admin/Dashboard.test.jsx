import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard.jsx";
import { estadisticas, listarCitas } from "../../../services/citasService.js";
import { listarUsuarios } from "../../../services/usuariosService.js";

vi.mock("../../../services/citasService.js", () => ({
  estadisticas: vi.fn(),
  listarCitas: vi.fn(),
}));
vi.mock("../../../services/usuariosService.js", () => ({ listarUsuarios: vi.fn() }));

describe("Dashboard", () => {
  it("muestra los 4 indicadores pidiendo los datos a los servicios", async () => {
    estadisticas.mockResolvedValue({
      total: 12,
      atendidas: 8,
      inasistencias: 2,
      tasaInasistencia: 0.2,
      porNutricionista: [],
      porSemana: [],
    });
    listarUsuarios.mockResolvedValue([{ id: "U100" }, { id: "U101" }, { id: "U102" }]);
    listarCitas.mockResolvedValue([{ id: "C0004" }, { id: "C0005" }]);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("20 %")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(listarUsuarios).toHaveBeenCalledWith({ rol: "PACIENTE", activo: true });
    expect(listarCitas).toHaveBeenCalledWith({ estado: "PENDIENTE" });
    expect(screen.getByRole("link", { name: /Reportes/ })).toHaveAttribute(
      "href",
      "/admin/reportes",
    );
  });
});
