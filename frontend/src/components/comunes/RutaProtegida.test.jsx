import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RutaProtegida from "./RutaProtegida.jsx";
import { obtenerSesion } from "../../auth/auth.js";

vi.mock("../../auth/auth.js", () => ({
  obtenerSesion: vi.fn(),
}));

function PaginaLogin() {
  const location = useLocation();
  return <p>Login desde {location.state?.desde}</p>;
}

function PaginaInicio() {
  const location = useLocation();
  return <p>Inicio: {location.state?.mensaje}</p>;
}

function renderizarEn(ruta) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<PaginaInicio />} />
        <Route path="/login" element={<PaginaLogin />} />
        <Route
          path="/admin"
          element={
            <RutaProtegida roles={["ADMIN"]}>
              <p>Panel privado</p>
            </RutaProtegida>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RutaProtegida (G-T4)", () => {
  beforeEach(() => {
    obtenerSesion.mockReset();
  });

  it("sin sesión redirige a /login recordando la ruta de origen", () => {
    obtenerSesion.mockReturnValue(null);

    renderizarEn("/admin");

    expect(screen.getByText("Login desde /admin")).toBeInTheDocument();
    expect(screen.queryByText("Panel privado")).not.toBeInTheDocument();
  });

  it("con el rol permitido muestra el contenido protegido", () => {
    obtenerSesion.mockReturnValue({ id: "U001", nombre: "Administración", rol: "ADMIN" });

    renderizarEn("/admin");

    expect(screen.getByText("Panel privado")).toBeInTheDocument();
    expect(obtenerSesion).toHaveBeenCalled();
  });

  it("con otro rol no muestra el contenido y vuelve al inicio con un aviso", () => {
    obtenerSesion.mockReturnValue({ id: "U100", nombre: "Javiera", rol: "PACIENTE" });

    renderizarEn("/admin");

    expect(screen.queryByText("Panel privado")).not.toBeInTheDocument();
    expect(screen.getByText("Inicio: No tienes acceso a esa sección.")).toBeInTheDocument();
  });
});
