import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ServicioFormulario from "./ServicioFormulario.jsx";
import AdminServicios from "./AdminServicios.jsx";
import { obtenerServicio } from "../../../services/serviciosService.js";

function renderizar(ruta) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/admin/servicios" element={<AdminServicios />} />
        <Route path="/admin/servicios/nuevo" element={<ServicioFormulario />} />
        <Route path="/admin/servicios/:codigo" element={<ServicioFormulario />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ServicioFormulario", () => {
  it("edita el precio y vuelve al listado con el aviso", async () => {
    renderizar("/admin/servicios/CN001");

    expect(await screen.findByRole("heading", { name: "Editar CN001" })).toBeInTheDocument();
    expect(screen.getByLabelText("Código")).toHaveAttribute("readonly");
    fireEvent.change(screen.getByLabelText("Precio (CLP)"), { target: { value: "36000" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Primera consulta nutricional (CN001) actualizado.",
    );
    expect((await obtenerServicio("CN001")).precio).toBe(36000);
  });

  it("al desmarcar Activo pide confirmación antes de guardar", async () => {
    renderizar("/admin/servicios/CN004");

    fireEvent.click(await screen.findByLabelText(/^Activo/));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent("Desactivar servicio");
    expect((await obtenerServicio("CN004")).activo).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Desactivar" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Teleconsulta nutricional (CN004) actualizado.",
    );
    expect((await obtenerServicio("CN004")).activo).toBe(false);
  });

  it("con un código que no existe muestra el aviso", async () => {
    renderizar("/admin/servicios/ZZ999");

    expect(
      await screen.findByText("No existe un servicio con el código ZZ999."),
    ).toBeInTheDocument();
  });
});
