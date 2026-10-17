import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import PagoError from "./PagoError.jsx";
import PagoExitoso from "./PagoExitoso.jsx";
import { iniciarSesion } from "../../auth/auth.js";

function renderizarExito(citaId) {
  render(
    <MemoryRouter initialEntries={[`/citas/pago/exito/${citaId}`]}>
      <Routes>
        <Route path="/citas/pago/exito/:citaId" element={<PagoExitoso />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PagoExitoso (RN-22, RN-24)", () => {
  it("muestra la solicitud enviada con su estado y los 4 últimos dígitos del pago", async () => {
    // C0004 es de Ana Pérez, con el pago P0004 terminado en 4242.
    iniciarSesion("ana.perez@correo.cl", "Paciente2026!");
    renderizarExito("C0004");

    expect(await screen.findByRole("heading", { name: "Solicitud enviada" })).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toHaveClass("estado-PENDIENTE");
    expect(screen.getByText(/tarjeta terminada en 4242/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a Mis citas" })).toHaveAttribute(
      "href",
      "/mis-citas",
    );
  });

  it("no muestra la cita de otro paciente", async () => {
    iniciarSesion("javiera.soto@correo.cl", "Paciente2026!");
    renderizarExito("C0004");

    expect(
      await screen.findByRole("heading", { name: "No encontramos esa solicitud" }),
    ).toBeInTheDocument();
  });
});

describe("PagoError (RN-22)", () => {
  it("muestra el motivo y permite reintentar con otra tarjeta", () => {
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: "/citas/pago/error", state: { motivo: "El banco rechazó la tarjeta." } },
        ]}
      >
        <Routes>
          <Route path="/citas/pago/error" element={<PagoError />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("El banco rechazó la tarjeta.");
    expect(screen.getByRole("link", { name: "Intentar con otra tarjeta" })).toHaveAttribute(
      "href",
      "/citas/pago",
    );
  });
});
