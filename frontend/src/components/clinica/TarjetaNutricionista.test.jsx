import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import TarjetaNutricionista from "./TarjetaNutricionista.jsx";

const carolina = {
  id: "NUT001",
  nombre: "Carolina Fuentes M.",
  especialidad: "Obesidad y síndrome metabólico",
  dias: [1, 3, 5],
  horaInicio: "09:00",
  horaFin: "17:00",
};

describe("TarjetaNutricionista", () => {
  it("muestra especialidad, días y horario recibidos por props y agenda con su id", () => {
    render(
      <MemoryRouter>
        <TarjetaNutricionista nutricionista={carolina} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Carolina Fuentes M." })).toBeInTheDocument();
    expect(screen.getByText("Obesidad y síndrome metabólico")).toBeInTheDocument();
    expect(screen.getByText("Lunes, miércoles y viernes")).toBeInTheDocument();
    expect(screen.getByText("09:00 a 17:00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agendar con Carolina" })).toHaveAttribute(
      "href",
      "/citas/solicitar?nutricionista=NUT001",
    );
  });
});
