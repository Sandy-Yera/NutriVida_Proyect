import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Nosotros from "./Nosotros.jsx";

describe("Nosotros", () => {
  it("cuenta la historia de la clínica y muestra a los 4 nutricionistas con su enlace para agendar", async () => {
    render(
      <MemoryRouter>
        <Nosotros />
      </MemoryRouter>,
    );

    expect(screen.getByText(/fundada en 2016 en Temuco/)).toBeInTheDocument();
    expect(await screen.findAllByRole("link", { name: /^Agendar con / })).toHaveLength(4);
    expect(screen.getByText("Martes a viernes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agendar con Felipe" })).toHaveAttribute(
      "href",
      "/citas/solicitar?nutricionista=NUT004",
    );
  });
});
