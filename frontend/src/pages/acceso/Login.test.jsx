import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Login from "./Login.jsx";
import { cambiarEstado } from "../../data/usuariosData.js";

function UbicacionActual() {
  const location = useLocation();
  return <p>Estás en {location.pathname + location.search}</p>;
}

function renderizarLogin(entrada = "/login") {
  render(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<UbicacionActual />} />
      </Routes>
    </MemoryRouter>,
  );
}

function ingresar(correo, clave) {
  fireEvent.change(screen.getByLabelText("Correo"), { target: { value: correo } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: clave } });
  fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
}

describe("Login (G-T3)", () => {
  it("con las credenciales de la secretaria navega a /secretaria/agenda", () => {
    renderizarLogin();

    ingresar("recepcion@nutrivida.cl", "Recepcion2026!");

    expect(screen.getByText("Estás en /secretaria/agenda")).toBeInTheDocument();
  });

  it("con una clave incorrecta muestra la alerta y no navega", () => {
    renderizarLogin();

    ingresar("recepcion@nutrivida.cl", "ClaveMala1");

    expect(screen.getByRole("alert")).toHaveTextContent("Correo o contraseña incorrectos.");
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });
});

describe("Login, casos extra", () => {
  it("pide completar correo y contraseña si falta alguno", () => {
    renderizarLogin();

    ingresar("admin@nutrivida.cl", "");

    expect(screen.getByRole("alert")).toHaveTextContent("Debe completar correo y contraseña.");
  });

  it("avisa cuando la cuenta está desactivada", () => {
    cambiarEstado("U102", false);
    renderizarLogin();

    ingresar("ana.perez@correo.cl", "Paciente2026!");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Tu cuenta está desactivada. Contacta a la clínica.",
    );
  });

  it("vuelve a la ruta protegida desde la que venía", () => {
    renderizarLogin({ pathname: "/login", state: { desde: "/citas/solicitar?servicio=CN001" } });

    ingresar("javiera.soto@correo.cl", "Paciente2026!");

    expect(screen.getByText("Estás en /citas/solicitar?servicio=CN001")).toBeInTheDocument();
  });
});
