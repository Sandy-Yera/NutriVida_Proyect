import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Inicio from "./Inicio.jsx";
import { proximasHorasLibres } from "../../services/citasService.js";

vi.mock("../../services/citasService.js", () => ({ proximasHorasLibres: vi.fn() }));
vi.mock("../../components/clinica/MapaDiferido.jsx", () => ({
  default: () => <div data-testid="mapa" />,
}));

function SolicitarDePrueba() {
  const location = useLocation();
  return <p>Solicitar con {location.pathname + location.search}</p>;
}

function renderizarInicio() {
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/citas/solicitar" element={<SolicitarDePrueba />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Inicio", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    proximasHorasLibres.mockResolvedValue([
      { nutricionistaId: "NUT003", fecha: "2026-10-12", hora: "08:30" },
    ]);
  });

  it("Ver horas disponibles arma la URL del contrato con el servicio y el nutricionista", async () => {
    renderizarInicio();
    await screen.findByText("Daniela Morales C.", { selector: "div" });

    fireEvent.change(screen.getByLabelText("Servicio"), { target: { value: "CN001" } });
    fireEvent.change(screen.getByLabelText("Nutricionista"), { target: { value: "NUT003" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver horas disponibles" }));

    expect(
      screen.getByText("Solicitar con /citas/solicitar?servicio=CN001&nutricionista=NUT003"),
    ).toBeInTheDocument();
  });

  it("sin elegir nada lleva al asistente sin parámetros", async () => {
    renderizarInicio();
    await screen.findByText("Daniela Morales C.", { selector: "div" });

    fireEvent.click(screen.getByRole("button", { name: "Ver horas disponibles" }));

    expect(screen.getByText("Solicitar con /citas/solicitar")).toBeInTheDocument();
  });

  it("muestra las próximas horas libres que entrega el módulo de citas", async () => {
    renderizarInicio();

    const elegir = await screen.findByRole("link", {
      name: "Elegir Lun 12 oct, 08:30 con Daniela Morales C.",
    });
    expect(elegir).toHaveAttribute("href", "/citas/solicitar?nutricionista=NUT003");
    expect(proximasHorasLibres).toHaveBeenCalledWith(4);
  });

  it("sin horas libres muestra el aviso", async () => {
    proximasHorasLibres.mockResolvedValue([]);
    renderizarInicio();

    expect(await screen.findByText(/No hay horas libres en los próximos días/)).toBeInTheDocument();
  });

  it("la carta cambia de tipo con las pestañas y el selector no ofrece talleres", async () => {
    renderizarInicio();
    const panel = await screen.findByRole("tabpanel");

    expect(within(panel).getByText("Primera consulta nutricional")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Talleres" }));

    expect(screen.getByRole("tab", { name: "Talleres" })).toHaveAttribute("aria-selected", "true");
    expect(within(panel).getByText("Taller de cocina nutritiva")).toBeInTheDocument();
    expect(within(panel).queryByText("Primera consulta nutricional")).not.toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Servicio")).queryByRole("option", {
        name: "Taller de cocina nutritiva",
      }),
    ).not.toBeInTheDocument();
  });
});
