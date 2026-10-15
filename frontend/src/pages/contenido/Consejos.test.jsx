import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Consejos from "./Consejos.jsx";

describe("Consejos", () => {
  it("lista los consejos del más reciente al más antiguo con su autor y enlace al detalle", async () => {
    render(
      <MemoryRouter>
        <Consejos />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Por Rodrigo Sepúlveda A\./)).toBeInTheDocument();
    const titulos = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titulos).toEqual([
      "Hidratación antes de entrenar",
      "Colaciones para la jornada laboral",
    ]);
    expect(
      screen.getByRole("link", { name: "Colaciones para la jornada laboral" }),
    ).toHaveAttribute("href", "/consejos/colaciones-jornada-laboral");
    expect(screen.getByText("15 de septiembre de 2026")).toBeInTheDocument();
  });
});
