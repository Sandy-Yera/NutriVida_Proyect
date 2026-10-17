import { ETIQUETAS_ESTADO } from "../../utils/citas.js";

// RN-27: filtros de la tabla de citas del admin. Solo muestra y avisa: la página filtra.
export default function FiltroCitas({ filtros, nutricionistas, onCambiar }) {
  function cambiar(evento) {
    onCambiar({ ...filtros, [evento.target.name]: evento.target.value });
  }

  return (
    <form
      noValidate
      className="row g-2 mb-3"
      role="search"
      onSubmit={(evento) => evento.preventDefault()}
    >
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
          {Object.entries(ETIQUETAS_ESTADO).map(([estado, etiqueta]) => (
            <option key={estado} value={estado}>
              {etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div className="col-6 col-md-3">
        <label htmlFor="filtro-nutricionista" className="form-label small mb-1">
          Nutricionista
        </label>
        <select
          id="filtro-nutricionista"
          name="nutricionistaId"
          className="form-select"
          value={filtros.nutricionistaId}
          onChange={cambiar}
        >
          <option value="">Todos</option>
          {nutricionistas.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="col-6 col-md-3">
        <label htmlFor="filtro-desde" className="form-label small mb-1">
          Desde
        </label>
        <input
          id="filtro-desde"
          name="desde"
          type="date"
          className="form-control"
          value={filtros.desde}
          onChange={cambiar}
        />
      </div>
      <div className="col-6 col-md-3">
        <label htmlFor="filtro-hasta" className="form-label small mb-1">
          Hasta
        </label>
        <input
          id="filtro-hasta"
          name="hasta"
          type="date"
          className="form-control"
          value={filtros.hasta}
          onChange={cambiar}
        />
      </div>
    </form>
  );
}
