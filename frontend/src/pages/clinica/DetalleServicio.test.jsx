import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import DetalleServicio from "./DetalleServicio.jsx";
import { cambiarEstadoServicio } from "../../services/serviciosService.js";

function renderizarEn(ruta) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/servicios/:codigo" element={<DetalleServicio />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DetalleServicio", () => {
  it("muestra el detalle y el botón Solicitar cita con el código del servicio", async () => {
    renderizarEn("/servicios/CN001");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Primera consulta nutricional" }),
    ).toBeInTheDocument();
    expect(screen.getByText("$35.000")).toBeInTheDocument();
    expect(screen.getByText("50 min")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Solicitar cita" })).toHaveAttribute(
      "href",
      "/citas/solicitar?servicio=CN001",
    );
  });

  it("un taller muestra su cupo e Inscripción en recepción en vez del botón", async () => {
    renderizarEn("/servicios/TG002");

    expect(await screen.findByText("8 personas")).toBeInTheDocument();
    expect(screen.getByText("Taller grupal")).toBeInTheDocument();
    expect(screen.getByText("Inscripción en recepción")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Solicitar cita" })).not.toBeInTheDocument();
  });

  it("un servicio desactivado o inexistente no se puede solicitar", async () => {
    await cambiarEstadoServicio("CN005", false);
    renderizarEn("/servicios/CN005");

    expect(
      await screen.findByText("Este servicio no está disponible por ahora."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Solicitar cita" })).not.toBeInTheDocument();
  });

  it("un código que no existe muestra el aviso", async () => {
    renderizarEn("/servicios/XX999");

    expect(await screen.findByText("El servicio que buscas no existe.")).toBeInTheDocument();
  });
});
