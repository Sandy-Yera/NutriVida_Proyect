import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FormPlan from "./FormPlan.jsx";
import { planesSemilla } from "../../data/semillas/fichas.js";

describe("FormPlan", () => {
  it("con kcal fuera de rango y una comida vacía muestra los errores y no llama a onGuardar", () => {
    const onGuardar = vi.fn();
    render(<FormPlan plan={planesSemilla[0]} onGuardar={onGuardar} />);

    fireEvent.change(screen.getByLabelText("Kcal diarias"), { target: { value: "300" } });
    fireEvent.change(screen.getByLabelText("Once"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar plan" }));

    expect(screen.getAllByRole("alert").map((alerta) => alerta.textContent)).toEqual([
      "Las kcal diarias deben ser un número entero entre 800 y 5000.",
      "Indica la once.",
    ]);
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it("parte del plan vigente y guarda las 5 comidas, las kcal y las indicaciones", async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    render(<FormPlan plan={planesSemilla[0]} onGuardar={onGuardar} />);

    fireEvent.change(screen.getByLabelText("Kcal diarias"), { target: { value: "1700" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar plan" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Plan guardado.");
    expect(onGuardar).toHaveBeenCalledTimes(1);
    expect(onGuardar).toHaveBeenCalledWith({
      objetivo: "Pérdida de peso gradual",
      kcalDiarias: 1700,
      comidas: planesSemilla[0].comidas,
      indicaciones: "2 litros de agua al día. Caminar 30 minutos.",
    });
  });
});
