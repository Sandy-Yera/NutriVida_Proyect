import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import FormServicio from "./FormServicio.jsx";

function renderizar(props) {
  render(
    <MemoryRouter>
      <FormServicio {...props} />
    </MemoryRouter>,
  );
}

function completar(valores) {
  Object.entries(valores).forEach(([etiqueta, valor]) => {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
  });
}

const TALLER = {
  Código: "tg004",
  Tipo: "TALLER",
  Nombre: "Taller de colaciones saludables",
  "Duración (min)": "90",
  Modalidad: "Presencial (grupo)",
  "Precio (CLP)": "15000",
  Descripción: "Ideas de colaciones para el trabajo y el colegio.",
};

describe("FormServicio", () => {
  it("un plan no pide duración y solo los talleres piden cupo", () => {
    renderizar({ onGuardar: vi.fn() });

    completar({ Tipo: "PLAN" });
    expect(screen.getByLabelText("Duración (min)")).toBeDisabled();
    expect(screen.getByText("Los planes no tienen duración por sesión.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Cupo máximo")).not.toBeInTheDocument();

    completar({ Tipo: "TALLER" });
    expect(screen.getByLabelText("Duración (min)")).toBeEnabled();
    expect(screen.getByLabelText("Cupo máximo")).toBeInTheDocument();
  });

  it("con precio 0 y taller sin cupo muestra los errores y no llama a onGuardar", () => {
    const onGuardar = vi.fn();
    renderizar({ onGuardar });

    completar({ ...TALLER, "Precio (CLP)": "0" });
    fireEvent.click(screen.getByRole("button", { name: "Crear servicio" }));

    expect(screen.getAllByRole("alert").map((alerta) => alerta.textContent)).toEqual([
      "El precio debe ser mayor que 0.",
      "El cupo debe ser un número entero de 1 a 50 personas.",
    ]);
    expect(screen.getByLabelText("Precio (CLP)")).toHaveFocus();
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it("con datos válidos llama a onGuardar una vez con el servicio listo para guardar", async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    renderizar({ onGuardar });

    completar({ ...TALLER, "Cupo máximo": "12" });
    fireEvent.click(screen.getByLabelText("Destacado"));
    fireEvent.click(screen.getByRole("button", { name: "Crear servicio" }));

    await vi.waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1));
    expect(onGuardar).toHaveBeenCalledWith({
      codigo: "TG004",
      tipo: "TALLER",
      nombre: "Taller de colaciones saludables",
      duracionMin: 90,
      modalidad: "Presencial (grupo)",
      precio: 15000,
      descripcion: "Ideas de colaciones para el trabajo y el colegio.",
      destacado: true,
      cupoMax: 12,
      activo: true,
    });
  });

  it("muestra bajo el campo el error que devuelve el guardado", async () => {
    const error = Object.assign(new Error("Ya existe un servicio con ese código."), {
      campo: "codigo",
    });
    renderizar({ onGuardar: vi.fn().mockRejectedValue(error) });

    completar({ ...TALLER, Código: "TG001", "Cupo máximo": "10" });
    fireEvent.click(screen.getByRole("button", { name: "Crear servicio" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe un servicio con ese código.",
    );
    expect(screen.getByLabelText("Código")).toHaveAttribute("aria-invalid", "true");
  });
});
