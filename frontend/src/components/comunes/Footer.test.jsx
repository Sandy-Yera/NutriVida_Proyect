import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Footer from "./Footer.jsx";

describe("Footer", () => {
  it("muestra dirección, horario, teléfono y los enlaces del sitio", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Sector Plaza Aníbal Pinto, Temuco/)).toBeInTheDocument();
    expect(screen.getByText("Lunes a viernes: 08:00 a 19:00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+56 45 200 0000" })).toHaveAttribute(
      "href",
      "tel:+56452000000",
    );
    const enlaces = within(screen.getByRole("navigation", { name: "Enlaces del pie de página" }));
    expect(enlaces.getAllByRole("link").map((a) => a.textContent)).toEqual([
      "Servicios",
      "Planes",
      "Nosotros",
      "Consejos",
      "Contacto",
    ]);
  });
});
