import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App.jsx";
import { cerrarSesion, iniciarSesion } from "../../auth/auth.js";
import { obtener as obtenerCita } from "../../data/citasData.js";
import { obtener as obtenerPago } from "../../data/pagosData.js";
import { aFechaIso, formatearFechaLarga } from "../../utils/formato.js";

// Recorrido completo del módulo de citas sobre la app real (sin mocks), con los usuarios demo:
// el mismo camino que se revisa en G-INT y que se graba en el video.
// Cada "abrir" desmonta y vuelve a montar la app, como si se escribiera la URL o se pulsara F5.

function abrir(ruta, correo, clave) {
  cleanup();
  cerrarSesion();
  if (correo) iniciarSesion(correo, clave);
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
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

async function pagarCon(numero) {
  fireEvent.change(await screen.findByLabelText("Nombre del titular"), {
    target: { value: "Ana Pérez" },
  });
  fireEvent.change(screen.getByLabelText("Número de tarjeta"), { target: { value: numero } });
  fireEvent.change(screen.getByLabelText("Vencimiento (MM/AA)"), { target: { value: "12/30" } });
  fireEvent.change(screen.getByLabelText("CVV"), { target: { value: "123" } });
  // Pagar navega después de un await (procesarPago y crearCita): act espera a que termine.
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Pagar/ }));
  });
}

let erroresDeConsola;

beforeEach(() => {
  erroresDeConsola = vi.spyOn(console, "error");
});

afterEach(() => {
  sessionStorage.clear();
  // Ninguna advertencia de React (keys, act, props) durante el recorrido.
  expect(erroresDeConsola).not.toHaveBeenCalled();
  erroresDeConsola.mockRestore();
});

describe("Recorrido del módulo de citas por rol", () => {
  it("paciente pide y paga; secretaria confirma; nutricionista atiende; admin ve el comprobante", async () => {
    const fecha = diaHabilLejano();

    // 1. Ana pide un control con Daniela desde el enlace del módulo clínico (RN-17).
    abrir(
      "/citas/solicitar?servicio=CN002&nutricionista=NUT003",
      "ana.perez@correo.cl",
      "Paciente2026!",
    );
    fireEvent.change(await screen.findByLabelText("Fecha"), { target: { value: fecha } });
    fireEvent.click(await screen.findByRole("button", { name: "10:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(await screen.findByLabelText("Motivo de la consulta"), {
      target: { value: "Quiero ordenar mi alimentación" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ir al pago" }));

    // 2. Primero la tarjeta rechazada: no se crea la cita y la reserva sigue (RN-19, RN-22).
    await pagarCon("4000 0000 0000 0002");
    expect(
      await screen.findByRole("heading", { name: "No pudimos procesar el pago" }),
    ).toBeInTheDocument();
    expect(obtenerCita("C0006")).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Intentar con otra tarjeta" }));

    // 3. Luego la aprobada: la cita nace PENDIENTE con su pago (RN-03, RN-20, RN-35).
    await pagarCon("4242 4242 4242 4242");
    expect(await screen.findByRole("heading", { name: "Solicitud enviada" })).toBeInTheDocument();
    const cita = obtenerCita("C0006");
    expect(cita).toMatchObject({ estado: "PENDIENTE", fecha, hora: "10:00", pacienteId: "U102" });
    expect(obtenerPago(cita.pagoId)).toMatchObject({
      estado: "APROBADO",
      citaId: "C0006",
      monto: 25000,
      ultimos4: "4242",
    });

    // 4. Mis citas la muestra en Próximas, también después de recargar (RN-24).
    abrir("/mis-citas", "ana.perez@correo.cl", "Paciente2026!");
    const proximas = within(await screen.findByRole("tabpanel"));
    expect(
      proximas.getByText(new RegExp(`${formatearFechaLarga(fecha)}, 10:00`)),
    ).toBeInTheDocument();

    // 5. La secretaria la confirma desde su agenda (RN-02, RN-25).
    abrir("/secretaria/agenda", "recepcion@nutrivida.cl", "Recepcion2026!");
    fireEvent.change(await screen.findByLabelText("Fecha"), { target: { value: fecha } });
    const agenda = within(await screen.findByRole("table", { name: "Agenda del día" }));
    fireEvent.click(agenda.getByRole("button", { name: "Cita de Ana Pérez, 10:00, Pendiente" }));
    fireEvent.click(within(screen.getByRole("article")).getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("Cita confirmada.")).toBeInTheDocument();

    // 6. Daniela la encuentra en su semana, la marca atendida y tiene el enlace a la ficha (RN-26).
    abrir("/nutricionista/agenda", "dmorales@nutrivida.cl", "Nutri2026!");
    fireEvent.click(await screen.findByRole("button", { name: "Semana" }));
    let tarjeta = await screen
      .findByRole("article", { name: /Ana Pérez, 10:00/ }, { timeout: 300 })
      .catch(() => null);
    for (let semanas = 0; semanas < 3 && !tarjeta; semanas++) {
      fireEvent.click(screen.getByRole("button", { name: "Semana siguiente" }));
      tarjeta = await screen
        .findByRole("article", { name: /Ana Pérez, 10:00/ }, { timeout: 300 })
        .catch(() => null);
    }
    expect(within(tarjeta).getByRole("link", { name: "Abrir ficha" })).toHaveAttribute(
      "href",
      "/nutricionista/pacientes/U102",
    );
    fireEvent.click(within(tarjeta).getByRole("button", { name: "Marcar atendida" }));
    expect(await screen.findByText("Cita marcada como atendida.")).toBeInTheDocument();

    // 7. El admin ve la cita atendida, su historial con quién hizo cada cambio y el comprobante (RN-04, RN-27).
    abrir("/admin/citas/C0006", "admin@nutrivida.cl", "Admin2026!");
    expect(await screen.findByRole("heading", { name: "Cita C0006" })).toBeInTheDocument();
    expect(screen.getByText(/Pendiente → Confirmada, por Marta Ríos/)).toBeInTheDocument();
    expect(screen.getByText(/Confirmada → Atendida, por Daniela Morales/)).toBeInTheDocument();
    expect(screen.getByText("Terminada en 4242")).toBeInTheDocument();

    // 8. Con una atención presencial, Ana ya puede agendar teleconsulta (RN-16).
    abrir("/citas/solicitar", "ana.perez@correo.cl", "Paciente2026!");
    expect(await screen.findByLabelText("Teleconsulta nutricional")).toBeEnabled();
  });

  it("el paciente cancela con más de 24 h y el pago queda reembolsado; el admin ya no lo suma (RN-06, RN-08, RN-27)", async () => {
    // C0005 es de Tomás, pendiente, a unos 3 días.
    abrir("/mis-citas", "tomas.h@correo.cl", "Paciente2026!");
    const panel = within(await screen.findByRole("tabpanel"));
    fireEvent.click(panel.getByRole("button", { name: "Cancelar cita" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, cancelar la cita" }),
    );
    expect(
      await screen.findByText("Cita cancelada. El pago quedó reembolsado."),
    ).toBeInTheDocument();
    expect(obtenerPago("P0005").estado).toBe("REEMBOLSADO");

    abrir("/admin/citas", "admin@nutrivida.cl", "Admin2026!");
    await screen.findByText("5 citas");
    expect(screen.getByText(/Total recaudado/).closest("p")).toHaveTextContent("$120.000");
  });

  it("cada rol entra solo a sus vistas (RN-24 a RN-28)", async () => {
    abrir("/secretaria/agenda", "ana.perez@correo.cl", "Paciente2026!");
    expect(await screen.findByText("No tienes acceso a esa sección.")).toBeInTheDocument();

    abrir("/mis-citas", "recepcion@nutrivida.cl", "Recepcion2026!");
    expect(await screen.findByText("No tienes acceso a esa sección.")).toBeInTheDocument();

    abrir("/citas/solicitar");
    expect(await screen.findByRole("heading", { name: /Iniciar sesión/i })).toBeInTheDocument();

    // El admin también entra a la agenda de la secretaria (RN-25).
    abrir("/secretaria/agenda", "admin@nutrivida.cl", "Admin2026!");
    expect(
      await screen.findByRole("heading", { name: "Agenda de la clínica" }),
    ).toBeInTheDocument();
  });
});
