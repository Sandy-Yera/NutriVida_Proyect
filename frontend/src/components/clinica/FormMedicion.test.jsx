import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FormMedicion from "./FormMedicion.jsx";

const HOY = new Date(2026, 9, 11);

function completar(valores) {
  Object.entries(valores).forEach(([etiqueta, valor]) => {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
  });
}

describe("FormMedicion (C-T4)", () => {
  it("con peso fuera de rango muestra el error y no llama a onGuardar", () => {
    const onGuardar = vi.fn();
    render(<FormMedicion onGuardar={onGuardar} objetivo="PERDIDA_PESO" hoy={HOY} />);

    completar({ "Peso (kg)": "350", "Talla (cm)": "170" });
    fireEvent.click(screen.getByRole("button", { name: "Registrar medición" }));

    expect(screen.getByRole("alert")).toHaveTextContent("El peso debe estar entre 2 y 300 kg.");
    expect(screen.getByLabelText("Peso (kg)")).toHaveAttribute("aria-invalid", "true");
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it("con datos válidos muestra el IMC en vivo y llama a onGuardar una vez con la medición", async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    render(<FormMedicion onGuardar={onGuardar} objetivo="PERDIDA_PESO" hoy={HOY} />);

    completar({
      Fecha: "2026-10-09",
      "Peso (kg)": "72.4",
      "Talla (cm)": "170",
      "Cintura (cm, opcional)": "84",
      "% grasa (opcional)": "29.9",
      "Notas (opcional)": "  Control quincenal  ",
    });

    expect(screen.getByText(/IMC calculado:/)).toHaveTextContent("IMC calculado: 25,1 · Sobrepeso");

    fireEvent.click(screen.getByRole("button", { name: "Registrar medición" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Medición registrada.");
    expect(onGuardar).toHaveBeenCalledTimes(1);
    expect(onGuardar).toHaveBeenCalledWith({
      fecha: "2026-10-09",
      pesoKg: 72.4,
      tallaCm: 170,
      cinturaCm: 84,
      caderaCm: null,
      grasaPct: 29.9,
      notas: "Control quincenal",
    });
    expect(screen.getByLabelText("Peso (kg)")).toHaveValue(null);
    expect(screen.getByLabelText("Talla (cm)")).toHaveValue(170);
  });

  it("en nutrición infantil calcula el IMC sin clasificarlo", () => {
    render(<FormMedicion onGuardar={vi.fn()} objetivo="INFANTIL" hoy={HOY} />);

    completar({ "Peso (kg)": "32", "Talla (cm)": "135" });

    expect(screen.getByText(/IMC calculado:/)).toHaveTextContent(
      "IMC calculado: 17,6 · Sin clasificar (nutrición infantil)",
    );
  });
});
