import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ServicioFila from "./ServicioFila.jsx";

const primeraConsulta = {
  codigo: "CN001",
  tipo: "CONSULTA",
  nombre: "Primera consulta nutricional",
  duracionMin: 50,
  modalidad: "Presencial",
  precio: 35000,
};

const planSinDuracion = {
  codigo: "PL001",
  tipo: "PLAN",
  nombre: "Plan pérdida de peso (1 mes)",
  duracionMin: null,
  modalidad: "Presencial",
  precio: 65000,
};

function renderizarFila(servicio) {
  render(
    <MemoryRouter>
      <ul>
        <ServicioFila servicio={servicio} />
      </ul>
    </MemoryRouter>,
  );
}

describe("ServicioFila (C-T3)", () => {
  it('muestra el nombre, "50 min" y "$35.000" recibidos por props', () => {
    renderizarFila(primeraConsulta);

    expect(screen.getByRole("link", { name: "Primera consulta nutricional" })).toHaveAttribute(
      "href",
      "/servicios/CN001",
    );
    expect(screen.getByText("50 min")).toBeInTheDocument();
    expect(screen.getByText("$35.000")).toBeInTheDocument();
  });

  it("un plan sin duración no muestra minutos", () => {
    renderizarFila(planSinDuracion);

    expect(screen.getByText("Plan pérdida de peso (1 mes)")).toBeInTheDocument();
    expect(screen.queryByText(/min/)).not.toBeInTheDocument();
    expect(screen.getByText("$65.000")).toBeInTheDocument();
  });
});
