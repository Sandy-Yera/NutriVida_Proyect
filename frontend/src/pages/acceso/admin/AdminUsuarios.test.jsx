import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminUsuarios from "./AdminUsuarios.jsx";
import { iniciarSesion } from "../../../auth/auth.js";
import { cambiarEstado, listarUsuarios } from "../../../services/usuariosService.js";

vi.mock("../../../services/usuariosService.js", () => ({
  listarUsuarios: vi.fn(),
  cambiarEstado: vi.fn(),
}));

const usuarios = [
  {
    id: "U001",
    nombre: "Administración",
    apellido: "NutriVida",
    rut: "9.876.543-3",
    correo: "admin@nutrivida.cl",
    rol: "ADMIN",
    activo: true,
  },
  {
    id: "U102",
    nombre: "Ana",
    apellido: "Pérez",
    rut: "21.333.444-1",
    correo: "ana.perez@correo.cl",
    rol: "PACIENTE",
    activo: true,
  },
];

function renderizar() {
  render(
    <MemoryRouter>
      <AdminUsuarios />
    </MemoryRouter>,
  );
}

describe("AdminUsuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarUsuarios.mockResolvedValue(usuarios);
    iniciarSesion("admin@nutrivida.cl", "Admin2026!");
  });

  it("desactiva un usuario solo después de confirmar en el diálogo", async () => {
    cambiarEstado.mockResolvedValue({ ...usuarios[1], activo: false });
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Desactivar a Ana Pérez" }));

    expect(cambiarEstado).not.toHaveBeenCalled();

    const dialogo = screen.getByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Desactivar" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Cuenta de Ana Pérez desactivada.");
    expect(cambiarEstado).toHaveBeenCalledWith("U102", false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("no deja desactivar la cuenta de quien tiene la sesión", async () => {
    renderizar();

    expect(
      await screen.findByRole("button", { name: "Desactivar a Administración NutriVida" }),
    ).toBeDisabled();
  });

  it("pide al servicio los usuarios según los filtros", async () => {
    renderizar();
    await screen.findByText("2 usuarios");

    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "PACIENTE" } });
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "inactivos" } });

    await waitFor(() =>
      expect(listarUsuarios).toHaveBeenLastCalledWith({
        texto: "",
        rol: "PACIENTE",
        activo: false,
      }),
    );
  });

  it("sin resultados ofrece limpiar los filtros", async () => {
    listarUsuarios.mockResolvedValue([]);
    renderizar();

    expect(
      await screen.findByText("No hay usuarios que coincidan con la búsqueda."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeInTheDocument();
  });
});
