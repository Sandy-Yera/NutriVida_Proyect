import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App.jsx";

function renderizarApp(ruta) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  );
}

describe("App", () => {
  it("una dirección inexistente muestra la página 404 dentro del layout principal", () => {
    renderizarApp("/no-existe");

    expect(screen.getByRole("heading", { name: "Página no encontrada" })).toBeInTheDocument();
    expect(screen.getByText("/no-existe")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
  });

  it("las rutas de consejos del módulo de acceso están conectadas", async () => {
    renderizarApp("/consejos");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Consejos nutricionales" }),
    ).toBeInTheDocument();
  });
});
