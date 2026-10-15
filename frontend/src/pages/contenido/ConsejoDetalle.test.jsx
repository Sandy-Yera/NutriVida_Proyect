import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ConsejoDetalle from "./ConsejoDetalle.jsx";

function renderizarEn(ruta) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/consejos/:id" element={<ConsejoDetalle />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ConsejoDetalle", () => {
  it("lee el id con useParams y muestra el consejo con la invitación a agendar con su autora", async () => {
    renderizarEn("/consejos/colaciones-jornada-laboral");

    expect(
      screen.getByRole("heading", { level: 1, name: "Colaciones para la jornada laboral" }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Por Daniela Morales C\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Solicitar cita con Daniela" })).toHaveAttribute(
      "href",
      "/citas/solicitar?nutricionista=NUT003",
    );
  });

  it("con un id que no existe muestra el aviso y el enlace a la lista", () => {
    renderizarEn("/consejos/no-existe");

    expect(screen.getByText("El consejo que buscas no existe.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todos los consejos" })).toHaveAttribute(
      "href",
      "/consejos",
    );
  });
});
