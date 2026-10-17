import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import AdminCitas from "./AdminCitas.jsx";
import { iniciarSesion } from "../../../auth/auth.js";
import { cambiarEstado } from "../../../data/citasData.js";
import { actualizar as actualizarPago, crear as crearPago } from "../../../data/pagosData.js";

// Semilla: C0001 a C0005, cada una con su pago APROBADO (25.000 o 35.000). Total: $145.000.
function renderizar() {
  render(
    <MemoryRouter>
      <AdminCitas />
    </MemoryRouter>,
  );
}

const filasDeLaTabla = () => screen.getAllByRole("row").slice(1);

beforeEach(() => {
  iniciarSesion("admin@nutrivida.cl", "Admin2026!");
});

describe("AdminCitas (S-08)", () => {
  it("lista todas las citas, de la más reciente a la más antigua, con el total recaudado (RN-27)", async () => {
    renderizar();

    expect(await screen.findByText("5 citas")).toBeInTheDocument();
    expect(screen.getByText(/Total recaudado/).closest("p")).toHaveTextContent("$145.000");
    const filas = filasDeLaTabla();
    expect(filas).toHaveLength(5);
    // C0001 es la más antigua (~35 días atrás): queda al final.
    expect(within(filas.at(-1)).getByRole("link", { name: "Ver la cita C0001" })).toHaveAttribute(
      "href",
      "/admin/citas/C0001",
    );
  });

  it("el total suma solo los pagos aprobados: no los reembolsados (RN-27)", async () => {
    // Cancelar C0005 la deja CANCELADA; su pago (P0005, $25.000) pasa a REEMBOLSADO.
    cambiarEstado("C0005", "CANCELADA", "U002");
    actualizarPago("P0005", { estado: "REEMBOLSADO" });
    // Un intento rechazado sin cita no cuenta.
    crearPago({ monto: 35000, ultimos4: "0002", estado: "RECHAZADO" });
    renderizar();

    await screen.findByText("5 citas");
    expect(screen.getByText(/Total recaudado/).closest("p")).toHaveTextContent("$120.000");
    expect(
      within(filasDeLaTabla().find((f) => f.textContent.includes("C0005"))).getByText(
        "Reembolsado",
      ),
    ).toBeInTheDocument();
  });

  it("filtra por estado y por nutricionista", async () => {
    renderizar();

    await screen.findByText("5 citas");
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "PENDIENTE" } });
    expect(await screen.findByText("2 citas")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nutricionista"), { target: { value: "NUT003" } });
    expect(await screen.findByText("1 cita")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver la cita C0004" })).toBeInTheDocument();
    expect(screen.getByText(/Total recaudado/).closest("p")).toHaveTextContent("$35.000");
  });

  it("filtra por rango de fechas y avisa si el rango está al revés", async () => {
    renderizar();

    await screen.findByText("5 citas");
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2099-01-01" } });
    expect(
      await screen.findByText("No hay citas que coincidan con los filtros."),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2098-01-01" } });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "La fecha de inicio debe ser anterior o igual a la de término.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(await screen.findByText("5 citas")).toBeInTheDocument();
  });
});
