import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import AdminCitaDetalle from "./AdminCitaDetalle.jsx";
import { iniciarSesion } from "../../../auth/auth.js";
import { cambiarEstado } from "../../../data/citasData.js";

function renderizar(id) {
  render(
    <MemoryRouter initialEntries={[`/admin/citas/${id}`]}>
      <Routes>
        <Route path="/admin/citas/:id" element={<AdminCitaDetalle />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  iniciarSesion("admin@nutrivida.cl", "Admin2026!");
});

describe("AdminCitaDetalle (S-08)", () => {
  it("muestra los datos de la cita y el comprobante con los 4 últimos dígitos (RN-20, RN-27)", async () => {
    renderizar("C0004");

    expect(await screen.findByRole("heading", { name: "Cita C0004" })).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("Daniela Morales C.")).toBeInTheDocument();
    expect(screen.getByText("Quiero empezar una alimentación vegana")).toBeInTheDocument();

    const comprobante = within(
      screen.getByRole("heading", { name: "Comprobante del pago" }).parentElement,
    );
    expect(comprobante.getByText("P0004")).toBeInTheDocument();
    expect(comprobante.getByText("Primera consulta nutricional")).toBeInTheDocument();
    expect(comprobante.getByText("$35.000")).toBeInTheDocument();
    expect(comprobante.getByText("Aprobado")).toBeInTheDocument();
    expect(comprobante.getByText("Terminada en 4242")).toBeInTheDocument();
  });

  it("muestra el historial con quién hizo cada cambio (RN-04)", async () => {
    cambiarEstado("C0004", "CONFIRMADA", "U002");
    renderizar("C0004");

    expect(await screen.findByText(/Pendiente → Confirmada, por Marta Ríos/)).toBeInTheDocument();
  });

  it("avisa si la cita no existe y ofrece volver", async () => {
    renderizar("C9999");

    expect(await screen.findByText("La cita C9999 no existe.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Volver a citas" })).toHaveAttribute(
      "href",
      "/admin/citas",
    );
  });
});
