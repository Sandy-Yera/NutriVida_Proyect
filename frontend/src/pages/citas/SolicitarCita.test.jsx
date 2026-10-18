import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import SolicitarCita from "./SolicitarCita.jsx";
import { iniciarSesion } from "../../auth/auth.js";
import { crear } from "../../data/citasData.js";
import { guardarReserva } from "../../data/reservaData.js";
import { aFechaIso } from "../../utils/formato.js";

afterEach(() => sessionStorage.clear());

function entrarComo(correo) {
  iniciarSesion(correo, "Paciente2026!");
}

function renderizar(ruta = "/citas/solicitar") {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/citas/solicitar" element={<SolicitarCita />} />
        <Route path="/citas/pago" element={<p>Pantalla de pago</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

// Un martes, miércoles o jueves a unas dos semanas: Daniela atiende y no choca con la semilla.
function diaHabilLejano() {
  const dia = new Date();
  dia.setDate(dia.getDate() + 14);
  while (![2, 3, 4].includes(dia.getDay())) dia.setDate(dia.getDate() + 1);
  return aFechaIso(dia);
}

const continuar = () => screen.getByRole("button", { name: "Continuar" });

describe("SolicitarCita (S-03)", () => {
  it("parte en el paso 1, sin talleres, y no avanza hasta elegir un servicio (RN-15, RN-17)", async () => {
    entrarComo("ana.perez@correo.cl");
    renderizar();

    expect(await screen.findByRole("heading", { name: "Paso 1: Servicio" })).toBeInTheDocument();
    expect(screen.queryByText("Taller de cocina nutritiva")).not.toBeInTheDocument();
    expect(continuar()).toBeDisabled();
    expect(screen.getByText("Elige un servicio para continuar.")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Control nutricional (seguimiento)"));
    fireEvent.click(continuar());

    expect(
      await screen.findByRole("heading", { name: "Paso 2: Nutricionista" }),
    ).toBeInTheDocument();
  });

  it("con ?servicio y ?nutricionista salta al paso 3 (RN-17)", async () => {
    entrarComo("ana.perez@correo.cl");
    renderizar("/citas/solicitar?servicio=CN001&nutricionista=NUT003");

    expect(
      await screen.findByRole("heading", { name: "Paso 3: Fecha y hora" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Daniela Morales C\. atiende lunes a viernes/)).toBeInTheDocument();
  });

  it("ignora un servicio de la URL que no se agenda aquí, con un aviso (RN-15)", async () => {
    entrarComo("ana.perez@correo.cl");
    renderizar("/citas/solicitar?servicio=TG001");

    expect(await screen.findByText(/no se agenda aquí/)).toHaveAttribute("role", "status");
    expect(screen.getByRole("heading", { name: "Paso 1: Servicio" })).toBeInTheDocument();
  });

  it("deshabilita la teleconsulta sin una atención presencial previa (RN-16)", async () => {
    entrarComo("ana.perez@correo.cl");
    renderizar();

    expect(await screen.findByLabelText("Teleconsulta nutricional")).toBeDisabled();
  });

  it("habilita la teleconsulta a quien ya tuvo una atención presencial (RN-16)", async () => {
    entrarComo("javiera.soto@correo.cl");
    renderizar();

    expect(await screen.findByLabelText("Teleconsulta nutricional")).toBeEnabled();
  });

  it("rechaza una fecha pasada (RN-13)", async () => {
    entrarComo("ana.perez@correo.cl");
    renderizar("/citas/solicitar?servicio=CN002&nutricionista=NUT003");

    fireEvent.change(await screen.findByLabelText("Fecha"), { target: { value: "2000-01-01" } });

    expect(screen.getByRole("alert")).toHaveTextContent("ya pasó");
    expect(continuar()).toBeDisabled();
  });

  it("deshabilita las horas ocupadas por otra cita (RN-10)", async () => {
    const fecha = diaHabilLejano();
    crear({
      pacienteId: "U101",
      nutricionistaId: "NUT003",
      servicioCodigo: "CN002",
      fecha,
      hora: "09:00",
      motivo: "Control mensual de peso",
    });
    entrarComo("ana.perez@correo.cl");
    renderizar("/citas/solicitar?servicio=CN002&nutricionista=NUT003");

    fireEvent.change(await screen.findByLabelText("Fecha"), { target: { value: fecha } });

    expect(await screen.findByRole("button", { name: "09:00" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "10:00" })).toBeEnabled();
  });

  it("recorre fecha, hora y motivo, y va al pago con la reserva guardada (RN-14, RN-17)", async () => {
    const fecha = diaHabilLejano();
    entrarComo("ana.perez@correo.cl");
    renderizar("/citas/solicitar?servicio=CN001&nutricionista=NUT003");

    fireEvent.change(await screen.findByLabelText("Fecha"), { target: { value: fecha } });
    fireEvent.click(await screen.findByRole("button", { name: "10:00" }));
    expect(screen.getByRole("button", { name: "10:00" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(continuar());

    const motivo = await screen.findByLabelText("Motivo de la consulta");
    const irAlPago = screen.getByRole("button", { name: "Ir al pago" });
    fireEvent.change(motivo, { target: { value: "Dieta" } });
    expect(irAlPago).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("al menos 10");

    fireEvent.change(motivo, { target: { value: "Quiero ordenar mi alimentación" } });
    expect(screen.getByText("$35.000")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toHaveClass("estado-PENDIENTE");
    fireEvent.click(irAlPago);

    expect(await screen.findByText("Pantalla de pago")).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem("nv_reserva"))).toMatchObject({
      pacienteId: "U102",
      servicioCodigo: "CN001",
      nutricionistaId: "NUT003",
      fecha,
      hora: "10:00",
      motivo: "Quiero ordenar mi alimentación",
    });
  });

  it("al recargar (F5) retoma la reserva guardada en el mismo paso (RN-17)", async () => {
    entrarComo("ana.perez@correo.cl");
    guardarReserva("U102", { servicioCodigo: "CN002", nutricionistaId: "NUT003", paso: 2 });
    renderizar();

    expect(
      await screen.findByRole("heading", { name: "Paso 2: Nutricionista" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Daniela Morales C.")).toBeChecked();
  });
});
