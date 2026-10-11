import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import Perfil from "./Perfil.jsx";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import { iniciarSesion } from "../../auth/auth.js";
import { obtener } from "../../data/usuariosData.js";

function renderizarPerfil() {
  render(
    <MemoryRouter initialEntries={["/perfil"]}>
      <Routes>
        <Route element={<LayoutPrincipal />}>
          <Route path="/perfil" element={<Perfil />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function barraSuperior() {
  return within(screen.getByRole("navigation", { name: "Navegación principal" }));
}

describe("Perfil", () => {
  beforeEach(() => {
    iniciarSesion("javiera.soto@correo.cl", "Paciente2026!");
  });

  it("guarda los datos, los mantiene y la barra superior muestra el nombre nuevo", async () => {
    renderizarPerfil();
    const nombre = await screen.findByLabelText("Nombre");

    expect(screen.getByText("19.876.543-0")).toBeInTheDocument();

    fireEvent.change(nombre, { target: { value: "Javiera Andrea" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar datos" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Datos actualizados.");
    expect(barraSuperior().getByRole("button", { name: "Javiera Andrea" })).toBeInTheDocument();
    expect(obtener("U100").nombre).toBe("Javiera Andrea");
  });

  it("cambia la contraseña solo con la actual correcta y luego limpia el formulario", async () => {
    renderizarPerfil();
    await screen.findByLabelText("Contraseña actual");

    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "Mala2026!" },
    });
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
      target: { value: "Nueva2027!" },
    });
    fireEvent.change(screen.getByLabelText("Repite la nueva contraseña"), {
      target: { value: "Nueva2027!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText("La contraseña actual no es correcta.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "Paciente2026!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Contraseña actualizada.");
    expect(screen.getByLabelText("Nueva contraseña")).toHaveValue("");
    expect(iniciarSesion("javiera.soto@correo.cl", "Nueva2027!").ok).toBe(true);
  });
});
