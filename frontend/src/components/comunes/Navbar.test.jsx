import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Navbar from "./Navbar.jsx";
import { iniciarSesion } from "../../auth/auth.js";

function renderizarNavbar(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Navbar />
    </MemoryRouter>,
  );
}

function textosDelMenu() {
  const menu = screen.getByRole("navigation", { name: "Navegación principal" });
  return within(menu)
    .getAllByRole("link")
    .map((enlace) => enlace.textContent);
}

describe("Navbar", () => {
  it("un visitante ve los enlaces públicos, Ingresar y Solicitar cita", () => {
    renderizarNavbar();

    expect(textosDelMenu()).toEqual([
      "NutriVida",
      "Solicitar cita",
      "Servicios",
      "Planes",
      "Nosotros",
      "Consejos",
      "Contacto",
      "Ingresar",
    ]);
  });

  it.each([
    ["javiera.soto@correo.cl", "Paciente2026!", ["Mis citas", "Mi progreso"]],
    ["recepcion@nutrivida.cl", "Recepcion2026!", ["Agenda"]],
    ["dmorales@nutrivida.cl", "Nutri2026!", ["Mi agenda", "Mis pacientes"]],
    ["admin@nutrivida.cl", "Admin2026!", ["Panel"]],
  ])("con la sesión de %s muestra los enlaces de su rol", (correo, clave, propios) => {
    iniciarSesion(correo, clave);

    renderizarNavbar();

    expect(textosDelMenu()).toEqual(expect.arrayContaining(["Servicios", ...propios]));
    expect(screen.queryByRole("link", { name: "Ingresar" })).not.toBeInTheDocument();
  });

  it("marca como activo el enlace de la ruta actual", () => {
    renderizarNavbar("/planes");

    expect(screen.getByRole("link", { name: "Planes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Servicios" })).not.toHaveAttribute("aria-current");
  });

  it("el botón hamburguesa abre el menú y este se cierra al navegar", () => {
    const { container } = renderizarNavbar();
    const menu = container.querySelector("#menu-principal");

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));

    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(menu).toHaveClass("show");

    fireEvent.click(screen.getByRole("link", { name: "Planes" }));

    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(menu).not.toHaveClass("show");
  });

  it("el menú de usuario permite cerrar la sesión", () => {
    iniciarSesion("tomas.h@correo.cl", "Paciente2026!");
    renderizarNavbar("/mis-citas");

    fireEvent.click(screen.getByRole("button", { name: "Tomás" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(screen.getByRole("link", { name: "Ingresar" })).toBeInTheDocument();
    expect(localStorage.getItem("usuarioActual")).toBeNull();
  });
});
