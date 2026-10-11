import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminServicios from "./AdminServicios.jsx";
import { listarServicios } from "../../../services/serviciosService.js";

function renderizar() {
  render(
    <MemoryRouter>
      <AdminServicios />
    </MemoryRouter>,
  );
}

function filasTabla() {
  return within(screen.getByRole("table")).getAllByRole("row").slice(1);
}

describe("AdminServicios", () => {
  it("filtra por tipo y por estado", async () => {
    renderizar();

    expect(await screen.findByText("18 servicios")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "TALLER" } });
    expect(await screen.findByText("3 servicios")).toBeInTheDocument();
    expect(filasTabla().map((fila) => within(fila).getAllByRole("cell")[0].textContent)).toEqual([
      "TG001",
      "TG002",
      "TG003",
    ]);

    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "inactivos" } });
    expect(screen.getByText("No hay servicios que coincidan con los filtros.")).toBeInTheDocument();
  });

  it("desactivar pide confirmación; al cancelar no cambia y al confirmar sale del catálogo", async () => {
    renderizar();
    await screen.findByText("18 servicios");
    const fila = () => filasTabla().find((f) => f.textContent.includes("CN004"));

    fireEvent.click(within(fila()).getByRole("button", { name: "Desactivar CN004" }));
    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveTextContent("Teleconsulta nutricional (CN004) dejará de aparecer");
    expect(within(dialogo).getByRole("button", { name: "Cancelar" })).toHaveFocus();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fila()).toHaveTextContent("Activo");

    fireEvent.click(within(fila()).getByRole("button", { name: "Desactivar CN004" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Desactivar" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Teleconsulta nutricional (CN004) desactivado.",
    );
    await vi.waitFor(() => expect(fila()).toHaveTextContent("Inactivo"));
    const publicos = await listarServicios();
    expect(publicos.map((servicio) => servicio.codigo)).not.toContain("CN004");
  });
});
