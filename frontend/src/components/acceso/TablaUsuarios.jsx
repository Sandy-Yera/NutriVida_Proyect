import { NOMBRE_ROL } from "../../config/roles.js";

export default function TablaUsuarios({ usuarios, idSesion, onEditar, onCambiarEstado }) {
  return (
    <table className="table align-middle bg-white tabla-lista mb-0">
      <thead>
        <tr>
          <th scope="col">Nombre</th>
          <th scope="col">RUT</th>
          <th scope="col">Correo</th>
          <th scope="col">Rol</th>
          <th scope="col">Estado</th>
          <th scope="col" className="text-end">
            Acciones
          </th>
        </tr>
      </thead>
      <tbody>
        {usuarios.map((usuario) => {
          const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`;
          const esPropio = usuario.id === idSesion;
          return (
            <tr key={usuario.id}>
              <td data-etiqueta="Nombre">
                {nombreCompleto}
                {esPropio && <span className="badge text-bg-light border ms-2">Tú</span>}
              </td>
              <td data-etiqueta="RUT" className="text-nowrap">
                {usuario.rut}
              </td>
              <td data-etiqueta="Correo" className="text-break">
                {usuario.correo}
              </td>
              <td data-etiqueta="Rol">{NOMBRE_ROL[usuario.rol] ?? usuario.rol}</td>
              <td data-etiqueta="Estado">
                <span
                  className={`badge ${usuario.activo ? "text-bg-success" : "text-bg-secondary"}`}
                >
                  {usuario.activo ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td data-etiqueta="Acciones" className="text-end text-nowrap">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary me-2"
                  aria-label={`Editar a ${nombreCompleto}`}
                  onClick={() => onEditar(usuario)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${usuario.activo ? "btn-outline-danger" : "btn-outline-primary"}`}
                  aria-label={`${usuario.activo ? "Desactivar" : "Activar"} a ${nombreCompleto}`}
                  title={
                    esPropio && usuario.activo ? "No puedes desactivar tu propia cuenta" : undefined
                  }
                  disabled={esPropio && usuario.activo}
                  onClick={() => onCambiarEstado(usuario)}
                >
                  {usuario.activo ? "Desactivar" : "Activar"}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
