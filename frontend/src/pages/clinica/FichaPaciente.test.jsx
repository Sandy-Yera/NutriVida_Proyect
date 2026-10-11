import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FichaPaciente from "./FichaPaciente.jsx";
import { listarMediciones } from "../../services/fichasService.js";

vi.mock("../../services/fichasService.js", async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, listarMediciones: vi.fn(original.listarMediciones) };
});

function iniciarComo(id, nombre, nutricionistaId) {
  localStorage.setItem(
    "usuarioActual",
    JSON.stringify({ id, nombre, rol: "NUTRICIONISTA", nutricionistaId }),
  );
}

function abrirFicha(pacienteId) {
  render(
    <MemoryRouter initialEntries={[`/nutricionista/pacientes/${pacienteId}`]}>
      <Routes>
        <Route path="/nutricionista/pacientes/:pacienteId" element={<FichaPaciente />} />
      </Routes>
    </MemoryRouter>,
  );
}

function completar(valores) {
  Object.entries(valores).forEach(([etiqueta, valor]) => {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
  });
}

describe("FichaPaciente", () => {
  beforeEach(() => {
    listarMediciones.mockClear();
  });

  it("si la ficha es de otro nutricionista muestra el aviso sin pedir ni mostrar datos", async () => {
    iniciarComo("U010", "Carolina", "NUT001");
    abrirFicha("U101");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esta ficha pertenece a otro nutricionista.",
    );
    expect(screen.queryByText(/Tomás/)).not.toBeInTheDocument();
    expect(screen.queryByText(/68,9/)).not.toBeInTheDocument();
    expect(listarMediciones).not.toHaveBeenCalled();
  });

  it("en una ficha propia registra la medición y la agrega al historial", async () => {
    iniciarComo("U010", "Carolina", "NUT001");
    abrirFicha("U100");

    expect(await screen.findByRole("heading", { name: "Javiera Soto" })).toBeInTheDocument();
    const historial = screen.getByRole("table");
    expect(within(historial).getAllByRole("row")).toHaveLength(6);
    expect(screen.getByLabelText("Talla (cm)")).toHaveValue(170);

    completar({ Fecha: "2026-10-09", "Peso (kg)": "71.8" });
    fireEvent.click(screen.getByRole("button", { name: "Registrar medición" }));

    expect(await screen.findByText("Medición registrada.")).toBeInTheDocument();
    const filas = within(screen.getByRole("table")).getAllByRole("row");
    expect(filas).toHaveLength(7);
    expect(filas[1]).toHaveTextContent(/vie 9 oct\s*71,8\s*170\s*24,8 · Normal/);
    const guardada = JSON.parse(localStorage.getItem("nv_fichas")).mediciones.at(-1);
    expect(guardada).toMatchObject({ pacienteId: "U100", nutricionistaId: "NUT001", pesoKg: 71.8 });
  });

  it("si el paciente no tiene ficha permite crearla a cargo del nutricionista en sesión", async () => {
    iniciarComo("U012", "Daniela", "NUT003");
    abrirFicha("U102");

    expect(await screen.findByRole("heading", { name: "Crear ficha" })).toBeInTheDocument();
    completar({ Objetivo: "VEGETARIANA", Antecedentes: "Vegana desde hace 6 meses." });
    fireEvent.click(screen.getByRole("button", { name: "Crear ficha" }));

    expect(await screen.findByRole("heading", { name: "Ficha" })).toBeInTheDocument();
    expect(screen.getByText("Alimentación vegetariana o vegana")).toBeInTheDocument();
    expect(screen.getByText("Aún no hay mediciones registradas.")).toBeInTheDocument();
    const ficha = JSON.parse(localStorage.getItem("nv_fichas")).fichas.find((f) => f.id === "U102");
    expect(ficha).toMatchObject({ nutricionistaId: "NUT003", objetivo: "VEGETARIANA" });
  });
});
