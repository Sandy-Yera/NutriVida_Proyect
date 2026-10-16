import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ChipEstado from "./ChipEstado.jsx";
import PasosWizard from "./PasosWizard.jsx";
import ResumenCita from "./ResumenCita.jsx";

describe("ChipEstado (RN-01)", () => {
  it("muestra el estado con texto y con la clase de color de tema.css", () => {
    render(<ChipEstado estado="PENDIENTE" />);

    const chip = screen.getByText("Pendiente");
    expect(chip).toHaveClass("estado", "estado-PENDIENTE");
  });
});

describe("PasosWizard", () => {
  it("marca el paso actual con aria-current y los anteriores como completados", () => {
    render(<PasosWizard pasos={["Servicio", "Nutricionista", "Fecha y hora"]} pasoActual={2} />);

    const pasos = screen.getAllByRole("listitem");
    expect(pasos[1]).toHaveAttribute("aria-current", "step");
    expect(pasos[0]).not.toHaveAttribute("aria-current");
    expect(pasos[0]).toHaveTextContent("(completado)");
    expect(pasos[2]).not.toHaveTextContent("(completado)");
  });
});

describe("ResumenCita", () => {
  const servicio = {
    nombre: "Primera consulta nutricional",
    modalidad: "Presencial",
    precio: 35000,
  };
  const nutricionista = { nombre: "Daniela Morales C." };

  it("muestra servicio, nutricionista, fecha, hora y el precio con formato", () => {
    render(
      <ResumenCita
        servicio={servicio}
        nutricionista={nutricionista}
        fecha="2026-10-20"
        hora="09:00"
        motivo="Quiero mejorar mi alimentación"
      />,
    );

    expect(screen.getByText("Primera consulta nutricional")).toBeInTheDocument();
    expect(screen.getByText("Daniela Morales C.")).toBeInTheDocument();
    expect(screen.getByText(/20 de octubre de 2026, 09:00/)).toBeInTheDocument();
    expect(screen.getByText("Quiero mejorar mi alimentación")).toBeInTheDocument();
    expect(screen.getByText("$35.000")).toBeInTheDocument();
  });

  it("sin motivo no muestra esa fila", () => {
    render(
      <ResumenCita
        servicio={servicio}
        nutricionista={nutricionista}
        fecha="2026-10-20"
        hora="09:00"
      />,
    );

    expect(screen.queryByText("Motivo")).not.toBeInTheDocument();
  });
});
