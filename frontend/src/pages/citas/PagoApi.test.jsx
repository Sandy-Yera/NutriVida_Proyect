import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Pago from "./Pago.jsx";
import SesionExpirada from "../../components/comunes/SesionExpirada.jsx";
import { iniciarSesion } from "../../auth/auth.js";
import { guardarReserva } from "../../data/reservaData.js";
import {
  crearCita,
  horariosDisponibles,
  pagarYCrearCita,
  puedeAgendarTeleconsulta,
} from "../../services/citasService.js";
import { EVENTO_SESION_EXPIRADA } from "../../services/http.js";
import { procesarPago } from "../../services/pagosService.js";
import { aFechaIso } from "../../utils/formato.js";

// R9: Pago.jsx en modo API hace una sola llamada (pagarYCrearCita → POST /api/citas). El modo
// local, con sus dos pasos, lo prueba Pago.test.jsx.
vi.mock("../../services/pagosService.js", () => ({
  procesarPago: vi.fn(),
  reembolsarPagoSinCita: vi.fn(),
}));
vi.mock("../../services/citasService.js", () => ({
  crearCita: vi.fn(),
  horariosDisponibles: vi.fn(),
  pagarYCrearCita: vi.fn(),
  puedeAgendarTeleconsulta: vi.fn(),
}));

function fechaEnDiezDias() {
  const dia = new Date();
  dia.setDate(dia.getDate() + 10);
  return aFechaIso(dia);
}

const reserva = {
  servicioCodigo: "CN001",
  nutricionistaId: "NUT003",
  fecha: fechaEnDiezDias(),
  hora: "10:00",
  motivo: "Quiero ordenar mi alimentación",
  paso: 4,
};

function Error_() {
  return <p>Pago rechazado: {useLocation().state?.motivo}</p>;
}

function renderizar() {
  render(
    <MemoryRouter initialEntries={["/citas/pago"]}>
      <Routes>
        <Route path="/citas/pago" element={<Pago />} />
        <Route path="/citas/pago/error" element={<Error_ />} />
        <Route path="/citas/pago/exito/:citaId" element={<p>Pantalla de éxito</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function pagarCon(numero) {
  await screen.findByLabelText("Número de tarjeta");
  fireEvent.change(screen.getByLabelText("Nombre del titular"), { target: { value: "Ana Pérez" } });
  fireEvent.change(screen.getByLabelText("Número de tarjeta"), { target: { value: numero } });
  fireEvent.change(screen.getByLabelText("Vencimiento (MM/AA)"), { target: { value: "12/30" } });
  fireEvent.change(screen.getByLabelText("CVV"), { target: { value: "123" } });
  fireEvent.click(screen.getByRole("button", { name: /Pagar/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_API_MODE", "api");
  iniciarSesion("ana.perez@correo.cl", "Paciente2026!");
  guardarReserva("U102", reserva);
  horariosDisponibles.mockResolvedValue(["10:00"]);
  puedeAgendarTeleconsulta.mockResolvedValue(false);
});

afterEach(() => {
  vi.unstubAllEnvs();
  sessionStorage.clear();
});

describe("Pago en modo API (R9)", () => {
  it("una sola llamada con la reserva y la tarjeta; aprobada → éxito y borra la reserva", async () => {
    pagarYCrearCita.mockResolvedValue({ aprobado: true, cita: { id: "C0006" } });
    renderizar();
    await pagarCon("4242 4242 4242 4242");

    expect(await screen.findByText("Pantalla de éxito")).toBeInTheDocument();
    expect(pagarYCrearCita).toHaveBeenCalledTimes(1);
    expect(pagarYCrearCita).toHaveBeenCalledWith({
      reserva: expect.objectContaining({ hora: "10:00", servicioCodigo: "CN001" }),
      tarjeta: expect.objectContaining({ numero: "4242 4242 4242 4242", cvv: "123" }),
    });
    expect(procesarPago).not.toHaveBeenCalled();
    expect(crearCita).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("nv_reserva")).toBeNull();
  });

  it("402 → pantalla de pago rechazado con el motivo del backend; la reserva se conserva", async () => {
    pagarYCrearCita.mockResolvedValue({ aprobado: false, motivo: "El banco rechazó la tarjeta." });
    renderizar();
    await pagarCon("4000 0000 0000 0002");

    expect(
      await screen.findByText("Pago rechazado: El banco rechazó la tarjeta."),
    ).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem("nv_reserva"))).toMatchObject({ hora: "10:00" });
  });

  it("un 409 de la hora se muestra arriba del formulario y aclara que no hubo cobro", async () => {
    const error = new Error("Esa hora no está disponible con este nutricionista. Elige otra.");
    error.errores = { hora: error.message };
    pagarYCrearCita.mockRejectedValue(error);
    renderizar();
    await pagarCon("4242 4242 4242 4242");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Elige otra. No se hizo ningún cobro.",
    );
    expect(screen.getByRole("button", { name: /Pagar/ })).toBeEnabled();
  });

  it("los errores de la tarjeta del backend van bajo cada campo", async () => {
    const error = new Error("Revisa los datos de la tarjeta.");
    error.errores = { vencimiento: "La tarjeta está vencida." };
    pagarYCrearCita.mockRejectedValue(error);
    renderizar();
    await pagarCon("4242 4242 4242 4242");

    expect(await screen.findByText("La tarjeta está vencida.")).toBeInTheDocument();
  });
});

describe("SesionExpirada (R9: 401 → /login)", () => {
  it("al recibir el aviso de apiFetch lleva a /login recordando de dónde venía", async () => {
    function Login() {
      const { state } = useLocation();
      return (
        <p>
          Login desde {state?.desde} · {state?.aviso}
        </p>
      );
    }
    render(
      <MemoryRouter initialEntries={["/mis-citas?vista=proximas"]}>
        <SesionExpirada />
        <Routes>
          <Route path="/mis-citas" element={<p>Mis citas</p>} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    window.dispatchEvent(
      new CustomEvent(EVENTO_SESION_EXPIRADA, {
        detail: "Tu cuenta está desactivada. Contacta a la clínica.",
      }),
    );

    expect(
      await screen.findByText(
        "Login desde /mis-citas?vista=proximas · Tu cuenta está desactivada. Contacta a la clínica.",
      ),
    ).toBeInTheDocument();
  });
});
