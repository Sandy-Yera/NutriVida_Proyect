import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditorFotoNutricionista from "./EditorFotoNutricionista.jsx";
import { iniciarSesion } from "../../auth/auth.js";
import { obtener } from "../../data/nutricionistasData.js";

function abrir(onCambio = vi.fn()) {
  render(<EditorFotoNutricionista nutricionista={obtener("NUT001")} onCambio={onCambio} />);
  return onCambio;
}

const png = new File(["abc"], "foto.png", { type: "image/png" });

describe("EditorFotoNutricionista", () => {
  it("sin foto muestra las iniciales y no deja guardar hasta elegir un archivo", () => {
    iniciarSesion("cfuentes@nutrivida.cl", "Nutri2026!");
    abrir();

    expect(screen.getByRole("img", { name: "Carolina Fuentes M., sin foto" })).toHaveTextContent(
      "CF",
    );
    expect(screen.getByRole("button", { name: "Guardar foto" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Quitar foto" })).not.toBeInTheDocument();
  });

  it("avisa si el archivo no es una imagen permitida, sin llamar al service", () => {
    iniciarSesion("cfuentes@nutrivida.cl", "Nutri2026!");
    const onCambio = abrir();

    fireEvent.change(screen.getByLabelText("Elegir foto"), {
      target: { files: [new File(["x"], "a.gif", { type: "image/gif" })] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("La foto debe ser JPG, PNG o WebP.");
    expect(screen.getByRole("button", { name: "Guardar foto" })).toBeDisabled();
    expect(onCambio).not.toHaveBeenCalled();
  });

  it("guarda la foto elegida y avisa al padre con el nutricionista actualizado", async () => {
    iniciarSesion("cfuentes@nutrivida.cl", "Nutri2026!");
    const onCambio = abrir();

    fireEvent.change(screen.getByLabelText("Elegir foto"), { target: { files: [png] } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar foto" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Foto actualizada.");
    expect(onCambio).toHaveBeenCalledWith(
      expect.objectContaining({ id: "NUT001", fotoUrl: "data:image/png;base64,YWJj" }),
    );
  });

  it("muestra el error del service si no tiene permiso (otro nutricionista)", async () => {
    iniciarSesion("dmorales@nutrivida.cl", "Nutri2026!"); // NUT003 intenta cambiar NUT001
    abrir();

    fireEvent.change(screen.getByLabelText("Elegir foto"), { target: { files: [png] } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar foto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Solo puedes cambiar tu propia foto.",
    );
  });
});
