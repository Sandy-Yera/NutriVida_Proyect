import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Contacto from "./Contacto.jsx";

vi.mock("../../components/clinica/MapaDiferido.jsx", () => ({
  default: () => <div data-testid="mapa" />,
}));

describe("Contacto", () => {
  it("guarda el mensaje en nv_contactos y muestra el mapa y el botón Cómo llegar", async () => {
    render(<Contacto />);

    expect(screen.getByTestId("mapa")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cómo llegar" })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=-38.739,-72.599",
    );

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Pedro Lagos" } });
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "pedro@correo.cl" } });
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Planes y precios" } });
    fireEvent.change(screen.getByLabelText("Mensaje"), {
      target: { value: "Quiero saber más del plan deportivo." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Mensaje enviado.");
    expect(JSON.parse(localStorage.getItem("nv_contactos"))).toEqual([
      expect.objectContaining({ id: "CT001", motivo: "Planes y precios" }),
    ]);
  });
});
