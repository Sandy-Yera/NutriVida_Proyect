import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Servicios from "./Servicios.jsx";

function renderizarEn(ruta) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/servicios/categoria/:tipo" element={<Servicios />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Servicios", () => {
  it("muestra la carta completa agrupada por tipo y filtra al escribir", async () => {
    renderizarEn("/servicios");

    expect(await screen.findByText("18 servicios")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Talleres" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar por nombre o descripción"), {
      target: { value: "vegana" },
    });

    expect(screen.getByText("1 servicio")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Plan alimentación vegetariana/vegana" }),
    ).toBeInTheDocument();
  });

  it("sin resultados explica qué hacer y permite limpiar la búsqueda", async () => {
    renderizarEn("/servicios");
    await screen.findByText("18 servicios");

    fireEvent.change(screen.getByLabelText("Buscar por nombre o descripción"), {
      target: { value: "pilates" },
    });

    expect(
      screen.getByText("No hay servicios que coincidan con ‘pilates’. Prueba con otra palabra."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));

    expect(screen.getByText("18 servicios")).toBeInTheDocument();
  });

  it("en /servicios/categoria/:tipo toma el tipo con useParams", async () => {
    renderizarEn("/servicios/categoria/talleres");

    expect(await screen.findByText("3 servicios")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Talleres" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Talleres" })).toHaveAttribute("aria-current", "page");
  });

  it("una categoría que no existe muestra el aviso", () => {
    renderizarEn("/servicios/categoria/masajes");

    expect(screen.getByText("La categoría “masajes” no existe.")).toBeInTheDocument();
  });
});
