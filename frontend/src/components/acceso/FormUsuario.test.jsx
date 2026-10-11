import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FormUsuario from "./FormUsuario.jsx";

const nutricionistas = [
  {
    id: "NUT001",
    nombre: "Carolina Fuentes M.",
    especialidad: "Obesidad",
    vinculadoA: "Carolina Fuentes M.",
  },
  { id: "NUT004", nombre: "Felipe Araya R.", especialidad: "Pediatría", vinculadoA: null },
];

const secretaria = {
  id: "U002",
  nombre: "Marta",
  apellido: "Ríos",
  rut: "15.999.888-6",
  correo: "recepcion@nutrivida.cl",
  telefono: "+56 9 1111 0002",
  rol: "SECRETARIA",
  nutricionistaId: null,
  activo: true,
};

describe("FormUsuario", () => {
  it("al crear no llama a onGuardar si faltan datos y pide la clave temporal", () => {
    const onGuardar = vi.fn();
    render(
      <FormUsuario nutricionistas={nutricionistas} onGuardar={onGuardar} onCancelar={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));

    expect(onGuardar).not.toHaveBeenCalled();
    expect(screen.getByText("Ingresa una contraseña.")).toBeInTheDocument();
    expect(screen.getByText("Selecciona un rol.")).toBeInTheDocument();
  });

  it("muestra el nutricionista vinculado solo con el rol nutricionista y bloquea los ya vinculados", () => {
    render(
      <FormUsuario nutricionistas={nutricionistas} onGuardar={vi.fn()} onCancelar={vi.fn()} />,
    );

    expect(screen.queryByLabelText("Nutricionista vinculado")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "NUTRICIONISTA" } });

    expect(screen.getByRole("option", { name: /Carolina Fuentes M\./ })).toBeDisabled();
    expect(screen.getByRole("option", { name: /Felipe Araya R\./ })).toBeEnabled();
  });

  it("al editar llega con los datos del usuario y llama a onGuardar una vez con los cambios", async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    render(<FormUsuario usuarioInicial={secretaria} onGuardar={onGuardar} onCancelar={vi.fn()} />);

    expect(screen.getByLabelText("Correo")).toHaveValue("recepcion@nutrivida.cl");
    expect(screen.queryByLabelText("Clave temporal")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Teléfono celular"), {
      target: { value: "+56987654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(onGuardar).toHaveBeenCalledTimes(1);
    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({
        telefono: "+56 9 8765 4321",
        rol: "SECRETARIA",
        nutricionistaId: null,
      }),
    );
    expect(onGuardar.mock.calls[0][0]).not.toHaveProperty("clave");
  });

  it("en la cuenta propia no deja cambiar el rol ni desactivarla", () => {
    render(
      <FormUsuario
        usuarioInicial={secretaria}
        esCuentaPropia
        onGuardar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Rol")).toBeDisabled();
    expect(screen.getByLabelText(/Cuenta activa/)).toBeDisabled();
  });

  it("muestra bajo el campo el error que devuelve el guardado", async () => {
    const error = new Error("Ya existe un usuario con ese correo.");
    error.campo = "correo";
    render(
      <FormUsuario
        usuarioInicial={secretaria}
        onGuardar={vi.fn().mockRejectedValue(error)}
        onCancelar={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Ya existe un usuario con ese correo.")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo")).toHaveAttribute("aria-invalid", "true");
  });
});
