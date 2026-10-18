import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Pago from "./Pago.jsx";
import PagoError from "./PagoError.jsx";
import { iniciarSesion } from "../../auth/auth.js";
import { guardarReserva } from "../../data/reservaData.js";
import {
  crearCita,
  horariosDisponibles,
  puedeAgendarTeleconsulta,
} from "../../services/citasService.js";
import { procesarPago, reembolsarPagoSinCita } from "../../services/pagosService.js";
import { aFechaIso } from "../../utils/formato.js";

// S-T4: se simula pagosService para controlar el resultado del pago sin depender del azar ni
// de los datos guardados. citasService también se simula para fijar las horas libres.
vi.mock("../../services/pagosService.js", () => ({
  procesarPago: vi.fn(),
  reembolsarPagoSinCita: vi.fn(),
}));
vi.mock("../../services/citasService.js", () => ({
  crearCita: vi.fn(),
  horariosDisponibles: vi.fn(),
  puedeAgendarTeleconsulta: vi.fn(),
}));

function fechaEnDiezDias() {
  const dia = new Date();
  dia.setDate(dia.getDate() + 10);
  return aFechaIso(dia);
}

// Ana Pérez pide una primera consulta (CN001, $35.000) con Daniela.
const reserva = {
  servicioCodigo: "CN001",
  nutricionistaId: "NUT003",
  fecha: fechaEnDiezDias(),
  hora: "10:00",
  motivo: "Quiero ordenar mi alimentación",
  paso: 4,
};

function renderizar() {
  render(
    <MemoryRouter initialEntries={["/citas/pago"]}>
      <Routes>
        <Route path="/citas/pago" element={<Pago />} />
        <Route path="/citas/pago/error" element={<PagoError />} />
        <Route path="/citas/pago/exito/:citaId" element={<p>Pantalla de éxito</p>} />
        <Route path="/citas/solicitar" element={<p>Pantalla del asistente</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function llenarTarjeta(numero) {
  fireEvent.change(screen.getByLabelText("Nombre del titular"), {
    target: { value: "Ana Pérez" },
  });
  fireEvent.change(screen.getByLabelText("Número de tarjeta"), { target: { value: numero } });
  fireEvent.change(screen.getByLabelText("Vencimiento (MM/AA)"), { target: { value: "12/30" } });
  fireEvent.change(screen.getByLabelText("CVV"), { target: { value: "123" } });
}

const botonPagar = () => screen.getByRole("button", { name: /Pagar|Procesando/ });

beforeEach(() => {
  vi.clearAllMocks();
  iniciarSesion("ana.perez@correo.cl", "Paciente2026!");
  guardarReserva("U102", reserva);
  horariosDisponibles.mockResolvedValue(["09:30", "10:00"]);
  puedeAgendarTeleconsulta.mockResolvedValue(false);
});

afterEach(() => sessionStorage.clear());

describe("Pago (S-T4)", () => {
  it("llama una vez a procesarPago con el monto del servicio y, si responde RECHAZADO, navega a /citas/pago/error", async () => {
    procesarPago.mockResolvedValue({
      estado: "RECHAZADO",
      pagoId: "P0006",
      motivo: "El banco rechazó la tarjeta.",
    });
    renderizar();

    await screen.findByLabelText("Número de tarjeta");
    llenarTarjeta("4000 0000 0000 0002");
    fireEvent.click(botonPagar());

    expect(
      await screen.findByRole("heading", { name: "No pudimos procesar el pago" }),
    ).toBeInTheDocument();
    expect(procesarPago).toHaveBeenCalledTimes(1);
    expect(procesarPago).toHaveBeenCalledWith(
      expect.objectContaining({ monto: 35000, numero: "4000 0000 0000 0002" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("El banco rechazó la tarjeta.");
    expect(crearCita).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem("nv_reserva"))).toMatchObject({ hora: "10:00" });
  });
});

describe("Pago (S-04)", () => {
  it("con el pago aprobado crea la cita con su pagoId, borra la reserva y va al éxito (RN-03, RN-22)", async () => {
    procesarPago.mockResolvedValue({ estado: "APROBADO", pagoId: "P0006", motivo: null });
    crearCita.mockResolvedValue({ id: "C0006" });
    renderizar();

    await screen.findByLabelText("Número de tarjeta");
    llenarTarjeta("4242 4242 4242 4242");
    fireEvent.click(botonPagar());

    expect(await screen.findByText("Pantalla de éxito")).toBeInTheDocument();
    expect(crearCita).toHaveBeenCalledWith({
      pacienteId: "U102",
      servicioCodigo: "CN001",
      nutricionistaId: "NUT003",
      fecha: reserva.fecha,
      hora: "10:00",
      motivo: "Quiero ordenar mi alimentación",
      pagoId: "P0006",
    });
    expect(sessionStorage.getItem("nv_reserva")).toBeNull();
  });

  it("muestra el aviso de pago simulado y el monto en el botón (RN-21, RN-23)", async () => {
    renderizar();

    expect(
      await screen.findByText("Pago simulado: no se envían datos a ningún banco."),
    ).toBeInTheDocument();
    expect(botonPagar()).toHaveTextContent("Pagar $35.000");
  });

  it("deshabilita el botón mientras procesa (RN-21)", async () => {
    procesarPago.mockReturnValue(new Promise(() => {}));
    renderizar();

    await screen.findByLabelText("Número de tarjeta");
    llenarTarjeta("4242 4242 4242 4242");
    fireEvent.click(botonPagar());

    expect(await screen.findByRole("button", { name: "Procesando pago..." })).toBeDisabled();
  });

  it("no llama al service si la tarjeta no es válida y muestra el error del campo (RN-18)", async () => {
    renderizar();

    await screen.findByLabelText("Número de tarjeta");
    llenarTarjeta("4242 4242 4242 4241");
    fireEvent.click(botonPagar());

    expect(screen.getByRole("alert")).toHaveTextContent("no es válido");
    expect(procesarPago).not.toHaveBeenCalled();
  });

  it("muestra bajo cada campo los errores que devuelve el service", async () => {
    const error = new Error("Revisa los datos de la tarjeta.");
    error.errores = { cvv: "El CVV debe tener 3 dígitos." };
    procesarPago.mockRejectedValue(error);
    renderizar();

    await screen.findByLabelText("Número de tarjeta");
    llenarTarjeta("4242 4242 4242 4242");
    fireEvent.click(botonPagar());

    expect(await screen.findByText("El CVV debe tener 3 dígitos.")).toBeInTheDocument();
    expect(botonPagar()).toBeEnabled();
  });

  it("si la cita no se puede crear tras el pago, reembolsa y lo explica (RN-08, RN-35)", async () => {
    procesarPago.mockResolvedValue({ estado: "APROBADO", pagoId: "P0006", motivo: null });
    crearCita.mockRejectedValue(new Error("Esa hora no está disponible con este nutricionista."));
    renderizar();

    await screen.findByLabelText("Número de tarjeta");
    llenarTarjeta("4242 4242 4242 4242");
    fireEvent.click(botonPagar());

    expect(await screen.findByRole("alert")).toHaveTextContent("quedó reembolsado");
    expect(reembolsarPagoSinCita).toHaveBeenCalledWith("P0006");
  });

  it("si además el reembolso falla, no dice que se reembolsó", async () => {
    procesarPago.mockResolvedValue({ estado: "APROBADO", pagoId: "P0006", motivo: null });
    crearCita.mockRejectedValue(new Error("Esa hora no está disponible con este nutricionista."));
    reembolsarPagoSinCita.mockRejectedValue(new Error("Sin conexión."));
    renderizar();

    await screen.findByLabelText("Número de tarjeta");
    llenarTarjeta("4242 4242 4242 4242");
    fireEvent.click(botonPagar());

    expect(await screen.findByRole("alert")).toHaveTextContent("llama a la clínica");
  });

  it("no ofrece pagar si la hora ya no está disponible (RN-10)", async () => {
    horariosDisponibles.mockResolvedValue(["09:30"]);
    renderizar();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La hora 10:00 ya no está disponible",
    );
    expect(screen.queryByLabelText("Número de tarjeta")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver a la solicitud" }));
    expect(await screen.findByText("Pantalla del asistente")).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem("nv_reserva"))).toMatchObject({ paso: 3 });
    expect(procesarPago).not.toHaveBeenCalled();
  });

  it("sin una solicitud en curso ofrece ir a solicitar una cita (RN-32)", async () => {
    sessionStorage.clear();
    renderizar();

    expect(screen.getByText("No tienes una solicitud de cita en curso.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Solicitar cita" })).toHaveAttribute(
      "href",
      "/citas/solicitar",
    );
  });
});
