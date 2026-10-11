import { NOMBRE_ROL, ROLES } from "../../config/roles.js";

export default function FiltroUsuarios({ filtros, onCambiar }) {
  function cambiar(evento) {
    onCambiar({ ...filtros, [evento.target.name]: evento.target.value });
  }

  return (
    <form className="row g-2 mb-3" role="search" onSubmit={(evento) => evento.preventDefault()}>
      <div className="col-12 col-md-6">
        <label htmlFor="filtro-texto" className="form-label small mb-1">
          Buscar por nombre, correo o RUT
        </label>
        <input
          id="filtro-texto"
          name="texto"
          type="search"
          className="form-control"
          value={filtros.texto}
          onChange={cambiar}
        />
      </div>
      <div className="col-6 col-md-3">
        <label htmlFor="filtro-rol" className="form-label small mb-1">
          Rol
        </label>
        <select
          id="filtro-rol"
          name="rol"
          className="form-select"
          value={filtros.rol}
          onChange={cambiar}
        >
          <option value="">Todos</option>
          {ROLES.map((rol) => (
            <option key={rol} value={rol}>
              {NOMBRE_ROL[rol]}
            </option>
          ))}
        </select>
      </div>
      <div className="col-6 col-md-3">
        <label htmlFor="filtro-estado" className="form-label small mb-1">
          Estado
        </label>
        <select
          id="filtro-estado"
          name="estado"
          className="form-select"
          value={filtros.estado}
          onChange={cambiar}
        >
          <option value="">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </div>
    </form>
  );
}
