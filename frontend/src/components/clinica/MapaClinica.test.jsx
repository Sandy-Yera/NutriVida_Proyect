import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MapaClinica from "./MapaClinica.jsx";

describe("MapaClinica", () => {
  it("dibuja el mapa de OpenStreetMap con su atribución y el marcador de la clínica", () => {
    const { container } = render(<MapaClinica />);

    expect(
      screen.getByRole("region", { name: "Mapa con la ubicación de la clínica" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "OpenStreetMap" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
    expect(container.querySelector(".leaflet-marker-icon")).not.toBeNull();
  });
});
