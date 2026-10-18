import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SelectorHorario from "./SelectorHorario.jsx";

const horarios = ["08:00", "08:30", "09:00"];

describe("SelectorHorario (S-T3)", () => {
  it("deshabilita los horarios ocupados y deja elegibles los libres", () => {
    render(<SelectorHorario horarios={horarios} ocupados={["08:30"]} onSeleccionar={vi.fn()} />);

    expect(screen.getByRole("button", { name: "08:30" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "08:00" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "09:00" })).toBeEnabled();
  });

  it("un clic en una hora libre llama a onSeleccionar con esa hora", () => {
    const onSeleccionar = vi.fn();
    render(
      <SelectorHorario horarios={horarios} ocupados={["08:30"]} onSeleccionar={onSeleccionar} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "08:00" }));

    expect(onSeleccionar).toHaveBeenCalledTimes(1);
    expect(onSeleccionar).toHaveBeenCalledWith("08:00");
  });

  it("un clic en una hora ocupada no llama a onSeleccionar", () => {
    const onSeleccionar = vi.fn();
    render(
      <SelectorHorario horarios={horarios} ocupados={["08:30"]} onSeleccionar={onSeleccionar} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "08:30" }));

    expect(onSeleccionar).not.toHaveBeenCalled();
  });

  it("marca la hora seleccionada con aria-pressed", () => {
    render(<SelectorHorario horarios={horarios} seleccionado="09:00" onSeleccionar={vi.fn()} />);

    expect(screen.getByRole("button", { name: "09:00" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "08:00" })).toHaveAttribute("aria-pressed", "false");
  });

  it("sin horarios muestra un aviso en vez de botones", () => {
    render(<SelectorHorario horarios={[]} onSeleccionar={vi.fn()} />);

    expect(screen.getByText(/no hay atención/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
