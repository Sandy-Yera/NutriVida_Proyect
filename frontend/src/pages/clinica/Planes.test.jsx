import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Planes from "./Planes.jsx";
import { cambiarEstadoServicio } from "../../services/serviciosService.js";

function renderizarPlanes() {
  render(
    <MemoryRouter>
      <Planes />
    </MemoryRouter>,
  );
}

describe("Planes", () => {
  it("muestra los 6 planes con su precio y Contratar plan hacia el asistente de citas", async () => {
    renderizarPlanes();

    const contratar = await screen.findAllByRole("link", { name: /^Contratar plan:/ });
    expect(contratar).toHaveLength(6);
    expect(
      screen.getByRole("link", { name: "Contratar plan: Plan pérdida de peso (3 meses)" }),
    ).toHaveAttribute("href", "/citas/solicitar?servicio=PL002");
    expect(screen.getByText("$170.000")).toBeInTheDocument();
  });

  it("lista qué incluye un plan cuando su descripción lo detalla", async () => {
    renderizarPlanes();

    const plan = await screen.findByRole("article", { name: "Plan pérdida de peso (1 mes)" });
    expect(
      within(plan)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual([
      "Primera consulta",
      "1 control quincenal",
      "Plan alimenticio personalizado",
      "Seguimiento por WhatsApp",
    ]);
  });

  it("un plan desactivado no aparece", async () => {
    await cambiarEstadoServicio("PL006", false);
    renderizarPlanes();

    expect(await screen.findAllByRole("article")).toHaveLength(5);
    expect(screen.queryByText("Plan alimentación infantil (2-12 años)")).not.toBeInTheDocument();
  });
});
