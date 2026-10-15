import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FormContacto from "./FormContacto.jsx";

function completar(valores) {
  Object.entries(valores).forEach(([etiqueta, valor]) => {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
  });
}

describe("FormContacto", () => {
  it("con un mensaje muy corto muestra el error y no llama a onEnviar", () => {
    const onEnviar = vi.fn();
    render(<FormContacto onEnviar={onEnviar} />);

    completar({
      Nombre: "Pedro Lagos",
      Correo: "pedro@correo.cl",
      Motivo: "Consulta general",
      Mensaje: "Hola",
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "El mensaje debe tener entre 10 y 500 caracteres.",
    );
    expect(onEnviar).not.toHaveBeenCalled();
  });

  it("con datos válidos llama a onEnviar una vez, confirma y limpia el formulario", async () => {
    const onEnviar = vi.fn().mockResolvedValue(undefined);
    render(<FormContacto onEnviar={onEnviar} />);

    completar({
      Nombre: "Pedro Lagos",
      Correo: "pedro@correo.cl",
      "Teléfono (opcional)": "",
      Motivo: "Talleres grupales",
      Mensaje: "¿Cuándo es el próximo taller de cocina?",
    });

    expect(screen.getByText("39 de 500 caracteres (mínimo 10).")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Mensaje enviado.");
    expect(onEnviar).toHaveBeenCalledTimes(1);
    expect(onEnviar).toHaveBeenCalledWith({
      nombre: "Pedro Lagos",
      correo: "pedro@correo.cl",
      telefono: "",
      motivo: "Talleres grupales",
      mensaje: "¿Cuándo es el próximo taller de cocina?",
    });
    expect(screen.getByLabelText("Mensaje")).toHaveValue("");
  });
});
