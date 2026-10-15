import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Registro from "./Registro.jsx";
import { obtenerSesion } from "../../auth/auth.js";
import { listar } from "../../data/usuariosData.js";

function MisCitasDePrueba() {
  const location = useLocation();
  return <p>Mis citas: {location.state?.mensaje}</p>;
}

function renderizarRegistro() {
  render(
    <MemoryRouter initialEntries={["/registro"]}>
      <Routes>
        <Route path="/registro" element={<Registro />} />
        <Route path="/mis-citas" element={<MisCitasDePrueba />} />
      </Routes>
    </MemoryRouter>,
  );
}

const datosValidos = {
  Nombre: "Camila",
  Apellido: "Rojas",
  RUT: "111111111",
  "Teléfono celular": "+56912345678",
  Correo: "camila.rojas@correo.cl",
  "Fecha de nacimiento": "1998-03-14",
  Contraseña: "Camila2026!",
  "Repite la contraseña": "Camila2026!",
};

function completar(datos) {
  Object.entries(datos).forEach(([etiqueta, valor]) => {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
  });
}

describe("Registro", () => {
  it("con el formulario vacío muestra un error bajo cada campo y no crea la cuenta", () => {
    const totalAntes = listar().length;
    renderizarRegistro();

    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getAllByRole("alert")).toHaveLength(9);
    expect(screen.getByText("Ingresa el RUT.")).toBeInTheDocument();
    expect(screen.getByLabelText("RUT")).toHaveAttribute("aria-invalid", "true");
    expect(listar()).toHaveLength(totalAntes);
  });

  it("explica qué corregir cuando el RUT tiene mal el dígito verificador", () => {
    renderizarRegistro();
    completar({ ...datosValidos, RUT: "12.345.678-9" });
    fireEvent.click(screen.getByLabelText(/Acepto que NutriVida/));

    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "El RUT no es válido: revisa el dígito verificador.",
    );
  });

  it("crea el paciente, inicia sesión y lleva a Mis citas con el mensaje de cuenta creada", async () => {
    renderizarRegistro();
    completar(datosValidos);
    fireEvent.click(screen.getByLabelText(/Acepto que NutriVida/));

    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText(/Mis citas: Cuenta creada/)).toBeInTheDocument();
    expect(obtenerSesion()).toMatchObject({ nombre: "Camila", rol: "PACIENTE" });
    expect(listar({ texto: "camila.rojas" })[0]).toMatchObject({
      rut: "11.111.111-1",
      telefono: "+56 9 1234 5678",
    });
  });

  it("avisa bajo el campo cuando el correo ya está registrado", async () => {
    renderizarRegistro();
    completar({ ...datosValidos, Correo: "JAVIERA.SOTO@correo.cl" });
    fireEvent.click(screen.getByLabelText(/Acepto que NutriVida/));

    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText("Ya existe un usuario con ese correo.")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo")).toHaveAttribute("aria-invalid", "true");
    expect(obtenerSesion()).toBeNull();
  });
});
